import hashlib
import mimetypes
import os
import secrets
import time

from django.contrib.auth.hashers import check_password
from django.core.files.base import ContentFile
from django.core import signing
from django.conf import settings
from django.db import connection, transaction
from django.db.utils import OperationalError
from django.db.models import Q
from django.http import HttpResponse, StreamingHttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .choices import (
    CommitFileOperation,
    ContentAudience,
    DocumentationType,
    NotificationStatus,
    RepositoryVisibility,
)
from .models import (
    AppVersion,
    Commit,
    CommitFile,
    AuthRefreshSession,
    Company,
    CompanyMember,
    Documentation,
    EntityLog,
    FAQ,
    File,
    FileBlob,
    Notification,
    Repository,
    User,
    UserProfile,
    can_create_company_repository,
    can_delete_repository,
    can_edit_repository,
    can_manage_company,
    can_view_repository,
    is_company_member,
)


# =========================================================
# AUTH SETTINGS
# =========================================================
ACCESS_TOKEN_TTL_SECONDS = 15 * 60
REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
REFRESH_COOKIE_NAME = "refresh_token"


# =========================================================
# COMMON HELPERS
# =========================================================
def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def create_access_token(user, refresh_session):
    payload = {
        "user_id": user.id,
        "session_id": refresh_session.id,
        "type": "access",
    }
    return signing.dumps(payload, salt="access-token")


def parse_access_token(token):
    try:
        payload = signing.loads(token, salt="access-token", max_age=ACCESS_TOKEN_TTL_SECONDS)
    except signing.SignatureExpired:
        return None, "expired"
    except signing.BadSignature:
        return None, "invalid"

    if payload.get("type") != "access":
        return None, "invalid"

    try:
        session = AuthRefreshSession.objects.select_related("user").get(
            id=payload.get("session_id"),
            user_id=payload.get("user_id"),
        )
    except AuthRefreshSession.DoesNotExist:
        return None, "invalid"

    if not session.is_active:
        return None, "revoked"

    return session.user, None


def get_bearer_token(request):
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1).strip()

    return request.GET.get("access_token")


def get_user_from_access_token(request):
    token = get_bearer_token(request)
    if not token:
        return None, Response({"error": "Access token обязателен"}, status=status.HTTP_401_UNAUTHORIZED)

    user, error_code = parse_access_token(token)
    if error_code:
        return None, Response({"error": "Access token недействителен", "code": error_code}, status=status.HTTP_401_UNAUTHORIZED)

    return user, None


def get_user_from_request_data(request):
    return get_user_from_access_token(request)


def is_admin(user):
    return bool(user and user.is_authenticated and user.is_app_admin)


def build_document_text(title, content, category=None):
    parts = [f"# {title}", "", content]
    if category:
        parts.extend(["", f"<!-- CATEGORY: {category} -->"])
    return "\n".join(parts).strip()


def parse_document_text(text):
    if not text:
        return {"title": "", "content": "", "category": None}

    lines = text.splitlines()
    title = lines[0][2:].strip() if lines and lines[0].startswith("# ") else ""
    category = None
    content_lines = []

    for line in lines[1:]:
        if line.startswith("<!-- CATEGORY:") and line.endswith("-->"):
            category = line.replace("<!-- CATEGORY:", "").replace("-->", "").strip()
        elif not line.startswith("<!--"):
            content_lines.append(line)

    content = "\n".join(content_lines).strip()
    return {"title": title or text[:80], "content": content, "category": category}


def log_action(user, action, entity, metadata=None):
    EntityLog.objects.create(
        action=action,
        user=user,
        entity=entity,
        metadata=metadata or {},
    )


def serialize_user(user, request=None):
    profile = getattr(user, "profile", None)

    avatar_url = None
    if profile and profile.avatar:
        avatar_url = profile.avatar.url
        if request:
            avatar_url = request.build_absolute_uri(profile.avatar.url)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_admin": user.is_app_admin,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "bio": profile.bio if profile else None,
        "date_of_birth": profile.date_of_birth.isoformat() if profile and profile.date_of_birth else None,
        "avatar": avatar_url,
    }


def serialize_auth_response(user, refresh_session):
    return {
        "access_token": create_access_token(user, refresh_session),
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_TTL_SECONDS,
        "user": serialize_user(user),
    }


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=REFRESH_TOKEN_TTL_SECONDS,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )
    return response


def clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE_NAME, samesite="Lax")
    return response


def create_refresh_session(request, user):
    refresh_token = secrets.token_urlsafe(64)
    refresh_session = AuthRefreshSession.objects.create(
        user=user,
        token_hash=hash_token(refresh_token),
        expires_at=timezone.now() + timezone.timedelta(seconds=REFRESH_TOKEN_TTL_SECONDS),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        ip_address=get_client_ip(request),
    )
    return refresh_token, refresh_session


def serialize_company(company):
    return {
        "id": company.id,
        "name": company.name,
        "description": company.description,
        "owner_id": company.owner_id,
        "owner_username": company.owner.username,
    }


def serialize_repository(repository, user=None):
    data = {
        "id": repository.id,
        "name": repository.name,
        "description": repository.description,
        "visibility": repository.visibility,
        "created_by_id": repository.created_by_id,
        "owner_user_id": repository.owner_user_id,
        "owner_company_id": repository.owner_company_id,
        "is_personal": repository.is_personal,
        "is_company_repository": repository.is_company_repository,
    }

    if user:
        data.update(
            {
                "can_view": can_view_repository(user, repository),
                "can_edit": can_edit_repository(user, repository),
                "can_delete": can_delete_repository(user, repository),
            }
        )

    return data


def serialize_documentation(item):
    parsed = parse_document_text(item.text)
    return {
        "id": item.id,
        "type": item.type,
        "title": parsed["title"],
        "content": parsed["content"],
        "category": parsed["category"],
        "target_audience": item.target_audience,
        "author_id": item.admin_id,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def serialize_notification(notification):
    return {
        "id": notification.id,
        "recipient_id": notification.recipient_id,
        "actor_id": notification.actor_id,
        "title": notification.title,
        "text": notification.text,
        "status": notification.status,
        "metadata": notification.metadata,
        "created_at": notification.created_at.isoformat(),
        "updated_at": notification.updated_at.isoformat(),
    }


def serialize_faq(faq):
    return {
        "id": faq.id,
        "text_question": faq.text_question,
        "answered": faq.answered,
        "answer_text": faq.answer_text,
        "questioner_id": faq.questioner_id,
        "answerer_id": faq.answerer_id,
        "created_at": faq.created_at.isoformat(),
        "updated_at": faq.updated_at.isoformat(),
    }


def serialize_app_version(app_version):
    return {
        "id": app_version.id,
        "title": app_version.title,
        "content": app_version.content,
        "version": app_version.version,
        "platform": app_version.platform,
        "file_name": app_version.original_name,
        "file_size": app_version.file_size,
        "created_by_id": app_version.created_by_id,
        "created_at": app_version.created_at.isoformat(),
        "updated_at": app_version.updated_at.isoformat(),
        "download_url": f"/api/download/{app_version.id}/",
    }


# =========================================================
# AUTH / USERS
# =========================================================
@api_view(["POST"])
def register_user(request):
    """
    Регистрация пользователя.

    Обязательные поля:
    - username;
    - email;
    - password.

    Необязательные:
    - first_name;
    - last_name;
    - date_of_birth.
    """

    username = (request.data.get("username") or "").strip().lower()
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password")
    first_name = (request.data.get("first_name") or "").strip()
    last_name = (request.data.get("last_name") or "").strip()
    date_of_birth = request.data.get("date_of_birth")

    if not username or not email or not password:
        return Response({"error": "username, email и password обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Пользователь с таким username уже существует"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Пользователь с таким email уже существует"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )
    UserProfile.objects.create(user=user, date_of_birth=date_of_birth or None)

    return Response(
        {
            "message": "Пользователь успешно зарегистрирован",
            "user": serialize_user(user),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login_user(request):
    """
    Вход по username или email + password.

    Request:
    {
        "login": "username или email",
        "password": "..."
    }
    """

    login = (request.data.get("login") or request.data.get("email") or request.data.get("username") or "").strip().lower()
    password = request.data.get("password")

    if not login or not password:
        return Response({"error": "login и password обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(Q(username=login) | Q(email=login)).first()

    if not user or not check_password(password, user.password):
        return Response({"error": "Invalid login or password"}, status=status.HTTP_400_BAD_REQUEST)

    refresh_token, refresh_session = create_refresh_session(request, user)
    response = Response(
        {
            "message": "Успешная авторизация",
            **serialize_auth_response(user, refresh_session),
        },
        status=status.HTTP_200_OK,
    )
    return set_refresh_cookie(response, refresh_token)


@api_view(["GET", "POST"])
def validate_token(request):
    """
    Проверить, жив ли access_token.

    Frontend отправляет:
    Authorization: Bearer <access_token>
    """

    user, error = get_user_from_access_token(request)
    if error:
        return error

    return Response({"valid": True, "user": serialize_user(user)}, status=status.HTTP_200_OK)


@api_view(["POST"])
def refresh_token(request):
    """
    Обновить access_token по backend refresh-сессии.

    Refresh token берётся из HttpOnly cookie.
    В JSON refresh token не возвращается.

    Используется rotation:
    - старый refresh token отзывается;
    - создаётся новая refresh-сессия;
    - новый refresh token ставится в HttpOnly cookie;
    - frontend получает только новый access_token.
    """

    raw_refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
    if not raw_refresh_token:
        return Response({"error": "Refresh token отсутствует"}, status=status.HTTP_401_UNAUTHORIZED)

    token_hash = hash_token(raw_refresh_token)

    try:
        refresh_session = AuthRefreshSession.objects.select_related("user").get(token_hash=token_hash)
    except AuthRefreshSession.DoesNotExist:
        return Response({"error": "Refresh token недействителен"}, status=status.HTTP_401_UNAUTHORIZED)

    if not refresh_session.is_active:
        return Response({"error": "Refresh token истёк или отозван"}, status=status.HTTP_401_UNAUTHORIZED)

    user = refresh_session.user
    refresh_session.revoke()
    new_refresh_token, new_refresh_session = create_refresh_session(request, user)

    response = Response(
        {
            "message": "Access token обновлён, refresh token заменён",
            **serialize_auth_response(user, new_refresh_session),
        },
        status=status.HTTP_200_OK,
    )
    return set_refresh_cookie(response, new_refresh_token)


@api_view(["POST"])
def logout_user(request):
    """
    Logout отзывает backend refresh-сессию и удаляет refresh cookie.
    """

    raw_refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
    if raw_refresh_token:
        AuthRefreshSession.objects.filter(token_hash=hash_token(raw_refresh_token), revoked_at__isnull=True).update(
            revoked_at=timezone.now()
        )

    response = Response({"message": "Выход выполнен"}, status=status.HTTP_200_OK)
    return clear_refresh_cookie(response)


@api_view(["GET"])
def check_db(request):
    """
    Проверить, жива ли БД и есть ли соединение.
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except OperationalError:
        return Response({"database": "down"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({"database": "ok"}, status=status.HTTP_200_OK)


# =========================================================
# DOWNLOAD / APP VERSIONS
# =========================================================
@api_view(["GET"])
def download_view(request):
    """
    Публичный список доступных версий приложения.
    """

    versions = AppVersion.objects.select_related("created_by").order_by("-created_at")
    return Response([serialize_app_version(item) for item in versions], status=status.HTTP_200_OK)


@api_view(["GET"])
def download_file(request, version_id):
    """
    Публичное скачивание файла версии приложения.
    """

    try:
        app_version = AppVersion.objects.get(id=version_id)
    except AppVersion.DoesNotExist:
        return Response({"error": "Версия не найдена"}, status=status.HTTP_404_NOT_FOUND)

    file_handle = app_version.file.open("rb")
    response = HttpResponse(file_handle.read(), content_type="application/octet-stream")
    response["Content-Disposition"] = f'attachment; filename="{app_version.original_name}"'
    return response


@api_view(["POST"])
def create_version(request):
    """
    Создать новую версию приложения.

    Доступно только admin приложения.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    title = (request.data.get("title") or "").strip()
    content = (request.data.get("content") or "").strip()
    version = (request.data.get("version") or "").strip()
    platform = (request.data.get("platform") or "all").strip()
    uploaded_file = request.FILES.get("file")

    if not title or not content or not version:
        return Response({"error": "title, content и version обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    if not uploaded_file:
        return Response({"error": "Файл обязателен"}, status=status.HTTP_400_BAD_REQUEST)

    app_version = AppVersion.objects.create(
        file=uploaded_file,
        title=title,
        content=content,
        version=version,
        platform=platform,
        file_size=uploaded_file.size,
        original_name=uploaded_file.name,
        created_by=user,
    )
    log_action(user, "add", app_version)

    return Response(
        {"message": "Версия приложения создана", "version": serialize_app_version(app_version)},
        status=status.HTTP_201_CREATED,
    )


@api_view(["PUT", "PATCH"])
def update_version(request, version_id):
    """
    Редактировать версию приложения.

    Доступно только admin приложения.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        app_version = AppVersion.objects.get(id=version_id)
    except AppVersion.DoesNotExist:
        return Response({"error": "Версия не найдена"}, status=status.HTTP_404_NOT_FOUND)

    if "title" in request.data:
        app_version.title = request.data.get("title")
    if "content" in request.data:
        app_version.content = request.data.get("content")
    if "version" in request.data:
        app_version.version = request.data.get("version")
    if "platform" in request.data:
        app_version.platform = request.data.get("platform") or "all"
    if "file" in request.FILES:
        uploaded_file = request.FILES["file"]
        app_version.file = uploaded_file
        app_version.file_size = uploaded_file.size
        app_version.original_name = uploaded_file.name

    app_version.save()
    log_action(user, "change", app_version)

    return Response(
        {"message": "Версия приложения обновлена", "version": serialize_app_version(app_version)},
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
def delete_version(request, version_id):
    """
    Удалить версию приложения.

    Доступно только admin приложения.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        app_version = AppVersion.objects.get(id=version_id)
    except AppVersion.DoesNotExist:
        return Response({"error": "Версия не найдена"}, status=status.HTTP_404_NOT_FOUND)

    log_action(
        user,
        "delete",
        app_version,
        {"app_version_id": app_version.id, "title": app_version.title, "version": app_version.version},
    )
    app_version.delete()

    return Response({"message": "Версия приложения удалена"}, status=status.HTTP_200_OK)


# =========================================================
# NOTIFICATIONS
# =========================================================
@api_view(["GET"])
def get_notifications(request):
    """
    Получить уведомления текущего пользователя.

    Можно передать ?status=unread/read.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    notification_status = request.GET.get("status")
    notifications = Notification.objects.filter(recipient=user)

    if notification_status:
        if notification_status not in NotificationStatus.values:
            return Response({"error": "Некорректный статус уведомления"}, status=status.HTTP_400_BAD_REQUEST)
        notifications = notifications.filter(status=notification_status)

    notifications = notifications.order_by("-created_at")
    return Response([serialize_notification(item) for item in notifications], status=status.HTTP_200_OK)


@api_view(["POST"])
def create_notification(request):
    """
    Создать уведомление.

    Для MVP создавать уведомления может admin приложения.
    В реальной логике этот helper обычно вызывается backend-сервисами:
    например при приглашении в компанию, новом коммите, ответе на FAQ.
    """

    actor, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(actor):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    recipient_id = request.data.get("recipient_id")
    title = (request.data.get("title") or "").strip()
    text = (request.data.get("text") or "").strip()
    metadata = request.data.get("metadata") or {}

    if not recipient_id or not title:
        return Response({"error": "recipient_id и title обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        recipient = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        return Response({"error": "Получатель не найден"}, status=status.HTTP_404_NOT_FOUND)

    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        title=title,
        text=text,
        metadata=metadata,
    )

    return Response(
        {"message": "Уведомление создано", "notification": serialize_notification(notification)},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def mark_notification_read(request, notification_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        notification = Notification.objects.get(id=notification_id, recipient=user)
    except Notification.DoesNotExist:
        return Response({"error": "Уведомление не найдено"}, status=status.HTTP_404_NOT_FOUND)

    notification.mark_read()
    return Response({"message": "Уведомление прочитано", "notification": serialize_notification(notification)})


@api_view(["DELETE"])
def delete_notification(request, notification_id):
    """
    Физически удалить уведомление из БД.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        notification = Notification.objects.get(id=notification_id, recipient=user)
    except Notification.DoesNotExist:
        return Response({"error": "Уведомление не найдено"}, status=status.HTTP_404_NOT_FOUND)

    notification.delete()
    return Response({"message": "Уведомление удалено"}, status=status.HTTP_200_OK)


def notification_events(request):
    """
    Realtime-сигнал через Server-Sent Events.

    Frontend открывает EventSource('/notifications/events/?access_token=...')
    или передаёт access token в Authorization header через свой клиент.

    Когда backend видит новые unread-уведомления, он отправляет event.
    Frontend после event делает обычный GET /notifications/ и обновляет список.

    Для production лучше WebSocket через Django Channels + Redis.
    SSE проще для MVP и решает проблему "не слать запрос каждую секунду".
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    def event_stream():
        last_unread_count = None

        while True:
            unread_count = Notification.objects.filter(
                recipient=user,
                status=NotificationStatus.UNREAD,
            ).count()

            if unread_count != last_unread_count:
                last_unread_count = unread_count
                yield f"event: notifications_changed\ndata: {unread_count}\n\n"

            time.sleep(5)

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@api_view(["GET"])
def get_all_users(request):
    users = User.objects.order_by("username")
    return Response([serialize_user(user) for user in users], status=status.HTTP_200_OK)


@api_view(["GET"])
def check_user_role(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    return Response(
        {
            "user_id": user.id,
            "role": user.role,
            "is_admin": user.is_app_admin,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def get_user_profile(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    return Response(serialize_user(user, request), status=status.HTTP_200_OK)


@api_view(["PUT"])
def update_user_profile(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    profile, _ = UserProfile.objects.get_or_create(user=user)

    user.first_name = request.data.get("first_name", user.first_name)
    user.last_name = request.data.get("last_name", user.last_name)
    user.save(update_fields=["first_name", "last_name"])

    if "bio" in request.data:
        profile.bio = request.data.get("bio")
    if "date_of_birth" in request.data:
        profile.date_of_birth = request.data.get("date_of_birth") or None
    if "avatar" in request.FILES:
        profile.avatar = request.FILES["avatar"]
    profile.save()

    return Response({"message": "Профиль обновлён", "user": serialize_user(user)}, status=status.HTTP_200_OK)


# =========================================================
# COMPANIES
# =========================================================
@api_view(["GET"])
def get_companies(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    companies = Company.objects.filter(Q(owner=user) | Q(members__user=user)).distinct().order_by("name")
    return Response([serialize_company(company) for company in companies], status=status.HTTP_200_OK)


@api_view(["POST"])
def create_company(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    name = (request.data.get("name") or "").strip()
    description = (request.data.get("description") or "").strip()

    if not name:
        return Response({"error": "Название компании обязательно"}, status=status.HTTP_400_BAD_REQUEST)

    company = Company.objects.create(owner=user, name=name, description=description)
    CompanyMember.objects.get_or_create(company=company, user=user)
    log_action(user, "add", company)

    return Response({"message": "Компания создана", "company": serialize_company(company)}, status=status.HTTP_201_CREATED)


@api_view(["PUT"])
def update_company(request, company_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=status.HTTP_404_NOT_FOUND)

    if not can_manage_company(user, company):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    if "name" in request.data:
        company.name = request.data.get("name")
    if "description" in request.data:
        company.description = request.data.get("description")
    company.save()
    log_action(user, "change", company)

    return Response({"message": "Компания обновлена", "company": serialize_company(company)}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_company(request, company_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=status.HTTP_404_NOT_FOUND)

    if not can_manage_company(user, company):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    log_action(user, "delete", company, {"company_id": company.id, "name": company.name})
    company.delete()
    return Response({"message": "Компания удалена"}, status=status.HTTP_200_OK)


@api_view(["GET"])
def get_company_members(request, company_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=status.HTTP_404_NOT_FOUND)

    if not is_company_member(user, company):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    members = User.objects.filter(company_memberships__company=company).distinct()
    return Response([serialize_user(member) for member in members], status=status.HTTP_200_OK)


@api_view(["POST"])
def add_company_member(request, company_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    member_id = request.data.get("member_id")
    if not member_id:
        return Response({"error": "member_id обязателен"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        company = Company.objects.get(id=company_id)
        member = User.objects.get(id=member_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_manage_company(user, company):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    CompanyMember.objects.get_or_create(company=company, user=member)
    log_action(user, "change", company, {"member_id": member.id, "operation": "add_member"})

    return Response({"message": "Участник добавлен"}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
def remove_company_member(request, company_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    member_id = request.data.get("member_id")
    if not member_id:
        return Response({"error": "member_id обязателен"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        company = Company.objects.get(id=company_id)
        member = User.objects.get(id=member_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_manage_company(user, company):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    if company.owner_id == member.id:
        return Response({"error": "Нельзя удалить владельца компании"}, status=status.HTTP_400_BAD_REQUEST)

    CompanyMember.objects.filter(company=company, user=member).delete()
    log_action(user, "change", company, {"member_id": member.id, "operation": "remove_member"})

    return Response({"message": "Участник удалён"}, status=status.HTTP_200_OK)


# =========================================================
# REPOSITORIES
# =========================================================
@api_view(["GET"])
def get_repositories(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    repositories = Repository.objects.filter(
        Q(visibility=RepositoryVisibility.PUBLIC)
        | Q(owner_user=user)
        | Q(owner_company__owner=user)
        | Q(owner_company__members__user=user)
    ).distinct().order_by("name")

    return Response([serialize_repository(repository, user) for repository in repositories], status=status.HTTP_200_OK)


@api_view(["POST"])
def create_repository(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    name = (request.data.get("name") or "").strip()
    description = (request.data.get("description") or "").strip()
    visibility = request.data.get("visibility") or RepositoryVisibility.PRIVATE
    owner_company_id = request.data.get("company_id")

    if not name:
        return Response({"error": "Название репозитория обязательно"}, status=status.HTTP_400_BAD_REQUEST)

    if visibility not in RepositoryVisibility.values:
        return Response({"error": "Некорректная видимость репозитория"}, status=status.HTTP_400_BAD_REQUEST)

    if owner_company_id:
        try:
            company = Company.objects.get(id=owner_company_id)
        except Company.DoesNotExist:
            return Response({"error": "Компания не найдена"}, status=status.HTTP_404_NOT_FOUND)

        if not can_create_company_repository(user, company):
            return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

        repository = Repository.objects.create(
            owner_company=company,
            created_by=user,
            name=name,
            description=description,
            visibility=visibility,
        )
    else:
        repository = Repository.objects.create(
            owner_user=user,
            created_by=user,
            name=name,
            description=description,
            visibility=visibility,
        )

    log_action(user, "add", repository)
    return Response(
        {"message": "Репозиторий создан", "repository": serialize_repository(repository, user)},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def get_repository(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    return Response(serialize_repository(repository, user), status=status.HTTP_200_OK)


@api_view(["PUT"])
def update_repository(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_edit_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    if "name" in request.data:
        repository.name = request.data.get("name")
    if "description" in request.data:
        repository.description = request.data.get("description")
    if "visibility" in request.data:
        visibility = request.data.get("visibility")
        if visibility not in RepositoryVisibility.values:
            return Response({"error": "Некорректная видимость репозитория"}, status=status.HTTP_400_BAD_REQUEST)
        repository.visibility = visibility

    repository.save()
    log_action(user, "change", repository)
    return Response(
        {"message": "Репозиторий обновлён", "repository": serialize_repository(repository, user)},
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
def delete_repository(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_delete_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    log_action(
        user,
        "delete",
        repository,
        {
            "repository_id": repository.id,
            "name": repository.name,
            "owner_user_id": repository.owner_user_id,
            "owner_company_id": repository.owner_company_id,
        },
    )
    repository.delete()
    return Response({"message": "Репозиторий удалён"}, status=status.HTTP_200_OK)


@api_view(["GET"])
def get_repository_files(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    files = repository.files.order_by("path")
    return Response([{"id": file.id, "path": file.path, "name": file.name} for file in files], status=status.HTTP_200_OK)


@api_view(["GET"])
def get_repository_commits(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    commits = repository.commits.select_related("created_by").order_by("-created_at")
    return Response(
        [
            {
                "id": commit.id,
                "message": commit.message,
                "commit_hash": commit.commit_hash,
                "parent_id": commit.parent_id,
                "created_by_id": commit.created_by_id,
                "created_by_username": commit.created_by.username,
                "created_at": commit.created_at.isoformat(),
            }
            for commit in commits
        ],
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def create_commit(request, repository_id):
    """
    Создать линейный commit.

    Request:
    - Authorization: Bearer <access_token>
    - message
    - files[] multipart, опционально
    - paths[] multipart, опционально

    Упрощение для MVP:
    каждый загруженный файл создаёт/обновляет File + CommitFile с operation added/modified.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_edit_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    message = (request.data.get("message") or "").strip()
    if not message:
        return Response({"error": "Сообщение коммита обязательно"}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_files = request.FILES.getlist("files")
    paths = request.data.getlist("paths")

    latest_commit = repository.commits.order_by("-created_at").first()

    with transaction.atomic():
        hash_input = f"{repository.id}:{user.id}:{message}:{repository.commits.count()}".encode()
        commit = Commit.objects.create(
            repository=repository,
            created_by=user,
            message=message,
            parent=latest_commit,
            commit_hash=hashlib.sha256(hash_input).hexdigest(),
        )
        changed_files = []

        for index, uploaded_file in enumerate(uploaded_files):
            path = paths[index] if index < len(paths) and paths[index] else uploaded_file.name
            content = uploaded_file.read()
            sha256 = hashlib.sha256(content).hexdigest()
            mime_type, _ = mimetypes.guess_type(uploaded_file.name)

            file_obj, file_created = File.objects.get_or_create(repository=repository, path=path)
            blob = FileBlob.objects.create(
                repository=repository,
                blob=ContentFile(content, name=uploaded_file.name),
                sha256=sha256,
                size=len(content),
                mime_type=mime_type,
                original_name=uploaded_file.name,
            )
            commit_file = CommitFile.objects.create(
                commit=commit,
                file=file_obj,
                path=path,
                operation=CommitFileOperation.ADDED if file_created else CommitFileOperation.MODIFIED,
                blob=blob,
            )
            changed_files.append(
                {
                    "file_id": file_obj.id,
                    "commit_file_id": commit_file.id,
                    "path": commit_file.path,
                    "previous_path": commit_file.previous_path,
                    "operation": commit_file.operation,
                    "blob_id": blob.id,
                    "size": blob.size,
                    "sha256": blob.sha256,
                    "download_url": f"/api/commit-files/{commit_file.id}/download/",
                }
            )

    log_action(user, "add", commit)
    return Response(
        {
            "message": "Коммит создан",
            "repository": {
                "id": repository.id,
                "name": repository.name,
            },
            "commit": {
                "id": commit.id,
                "hash": commit.commit_hash,
                "message": commit.message,
                "parent_id": commit.parent_id,
                "created_by_id": commit.created_by_id,
                "created_at": commit.created_at.isoformat(),
            },
            "files": changed_files,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def get_commit_files(request, commit_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        commit = Commit.objects.select_related("repository").get(id=commit_id)
    except Commit.DoesNotExist:
        return Response({"error": "Коммит не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, commit.repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    commit_files = commit.files.select_related("file", "blob").order_by("path")
    return Response(
        [
            {
                "id": commit_file.id,
                "path": commit_file.path,
                "previous_path": commit_file.previous_path,
                "operation": commit_file.operation,
                "file_id": commit_file.file_id,
                "blob_id": commit_file.blob_id,
                "size": commit_file.blob.size if commit_file.blob else None,
                "sha256": commit_file.blob.sha256 if commit_file.blob else None,
            }
            for commit_file in commit_files
        ],
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def download_commit_file(request, commit_file_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        commit_file = CommitFile.objects.select_related("commit__repository", "blob").get(id=commit_file_id)
    except CommitFile.DoesNotExist:
        return Response({"error": "Файл коммита не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, commit_file.commit.repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    if not commit_file.blob:
        return Response({"error": "У этой операции нет файла для скачивания"}, status=status.HTTP_404_NOT_FOUND)

    file_handle = commit_file.blob.blob.open("rb")
    filename = commit_file.blob.original_name or os.path.basename(commit_file.path)
    mime_type = commit_file.blob.mime_type or "application/octet-stream"
    response = HttpResponse(file_handle.read(), content_type=mime_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


# =========================================================
# DOCUMENTATION / NEWS
# =========================================================
@api_view(["GET"])
def news_view(request):
    news = Documentation.objects.filter(type=DocumentationType.NEWS).order_by("-created_at")
    return Response([serialize_documentation(item) for item in news], status=status.HTTP_200_OK)


@api_view(["POST"])
def create_news(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    title = (request.data.get("title") or "").strip()
    content = (request.data.get("content") or "").strip()
    if not title or not content:
        return Response({"error": "title и content обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    news = Documentation.objects.create(
        type=DocumentationType.NEWS,
        admin=user,
        text=build_document_text(title, content),
    )
    log_action(user, "add", news)
    return Response({"message": "Новость создана", "news": serialize_documentation(news)}, status=status.HTTP_201_CREATED)


@api_view(["PUT"])
def update_news(request, news_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        news = Documentation.objects.get(id=news_id, type=DocumentationType.NEWS)
    except Documentation.DoesNotExist:
        return Response({"error": "Новость не найдена"}, status=status.HTTP_404_NOT_FOUND)

    title = (request.data.get("title") or "").strip()
    content = (request.data.get("content") or "").strip()
    if not title or not content:
        return Response({"error": "title и content обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    news.text = build_document_text(title, content)
    news.save()
    log_action(user, "change", news)
    return Response({"message": "Новость обновлена", "news": serialize_documentation(news)}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_news(request, news_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        news = Documentation.objects.get(id=news_id, type=DocumentationType.NEWS)
    except Documentation.DoesNotExist:
        return Response({"error": "Новость не найдена"}, status=status.HTTP_404_NOT_FOUND)

    log_action(user, "delete", news, {"news_id": news.id, "text": news.text})
    news.delete()
    return Response({"message": "Новость удалена"}, status=status.HTTP_200_OK)


@api_view(["GET"])
def documentation_view(request):
    docs = Documentation.objects.filter(type=DocumentationType.REFERENCE).order_by("-created_at")
    return Response([serialize_documentation(item) for item in docs], status=status.HTTP_200_OK)


@api_view(["POST"])
def create_documentation(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    title = (request.data.get("title") or "").strip()
    content = (request.data.get("content") or "").strip()
    category = (request.data.get("category") or "").strip()
    target_audience = request.data.get("target_audience") or ContentAudience.ALL

    if not title or not content:
        return Response({"error": "title и content обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    if target_audience not in ContentAudience.values:
        return Response({"error": "Некорректная аудитория"}, status=status.HTTP_400_BAD_REQUEST)

    doc = Documentation.objects.create(
        type=DocumentationType.REFERENCE,
        admin=user,
        target_audience=target_audience,
        text=build_document_text(title, content, category),
    )
    log_action(user, "add", doc)
    return Response({"message": "Документация создана", "documentation": serialize_documentation(doc)}, status=status.HTTP_201_CREATED)


@api_view(["PUT"])
def update_documentation(request, doc_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        doc = Documentation.objects.get(id=doc_id, type=DocumentationType.REFERENCE)
    except Documentation.DoesNotExist:
        return Response({"error": "Документация не найдена"}, status=status.HTTP_404_NOT_FOUND)

    title = (request.data.get("title") or "").strip()
    content = (request.data.get("content") or "").strip()
    category = (request.data.get("category") or "").strip()
    target_audience = request.data.get("target_audience") or doc.target_audience

    if not title or not content:
        return Response({"error": "title и content обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    if target_audience not in ContentAudience.values:
        return Response({"error": "Некорректная аудитория"}, status=status.HTTP_400_BAD_REQUEST)

    doc.text = build_document_text(title, content, category)
    doc.target_audience = target_audience
    doc.save()
    log_action(user, "change", doc)
    return Response({"message": "Документация обновлена", "documentation": serialize_documentation(doc)}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_documentation(request, doc_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        doc = Documentation.objects.get(id=doc_id, type=DocumentationType.REFERENCE)
    except Documentation.DoesNotExist:
        return Response({"error": "Документация не найдена"}, status=status.HTTP_404_NOT_FOUND)

    log_action(user, "delete", doc, {"documentation_id": doc.id, "text": doc.text})
    doc.delete()
    return Response({"message": "Документация удалена"}, status=status.HTTP_200_OK)


# =========================================================
# FAQ
# =========================================================
@api_view(["GET"])
def get_QA_list(request):
    """
    Публичное чтение FAQ.

    Токен не нужен: FAQ могут читать все пользователи и гости.
    """

    questions = FAQ.objects.select_related("questioner", "answerer").order_by("-created_at")
    return Response([serialize_faq(faq) for faq in questions], status=status.HTTP_200_OK)


@api_view(["GET"])
def get_answered_QA_list(request):
    """
    Публичное чтение FAQ с ответами.
    """

    questions = FAQ.objects.select_related("questioner", "answerer").filter(answered=True).order_by("-updated_at")
    return Response([serialize_faq(faq) for faq in questions], status=status.HTTP_200_OK)


@api_view(["GET"])
def get_unanswered_QA_list(request):
    """
    Чтение FAQ без ответа.

    Доступно только admin приложения.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    questions = FAQ.objects.select_related("questioner", "answerer").filter(answered=False).order_by("-created_at")
    return Response([serialize_faq(faq) for faq in questions], status=status.HTTP_200_OK)


@api_view(["POST"])
def create_QA(request):
    """
    Создать вопрос в FAQ.

    Требуется Authorization: Bearer <access_token>.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    text_question = (request.data.get("text_question") or "").strip()
    if not text_question:
        return Response({"error": "text_question обязателен"}, status=status.HTTP_400_BAD_REQUEST)

    faq = FAQ.objects.create(questioner=user, text_question=text_question)
    log_action(user, "add", faq)
    return Response({"message": "Вопрос создан", "id": faq.id}, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
def answer_QA(request, qa_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    answer_text = (request.data.get("answer_text") or "").strip()
    if not answer_text:
        return Response({"error": "answer_text обязателен"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        faq = FAQ.objects.get(id=qa_id)
    except FAQ.DoesNotExist:
        return Response({"error": "Вопрос не найден"}, status=status.HTTP_404_NOT_FOUND)

    faq.answerer = user
    faq.answer_text = answer_text
    faq.answered = True
    faq.save()
    log_action(user, "change", faq)

    return Response({"message": "Ответ сохранён"}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_QA(request, qa_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        faq = FAQ.objects.get(id=qa_id)
    except FAQ.DoesNotExist:
        return Response({"error": "Вопрос не найден"}, status=status.HTTP_404_NOT_FOUND)

    log_action(user, "delete", faq, {"faq_id": faq.id, "text_question": faq.text_question})
    faq.delete()
    return Response({"message": "Вопрос удалён"}, status=status.HTTP_200_OK)
