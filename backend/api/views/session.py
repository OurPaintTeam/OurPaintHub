import secrets

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from api.models.users import AuthRefreshSession
from api.views.token import hash_token
from api.views.constants import REFRESH_TOKEN_TTL_SECONDS, REFRESH_COOKIE_NAME

def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")


def create_refresh_session(request, user):
    raw_token = secrets.token_urlsafe(64)

    session = AuthRefreshSession.objects.create(
        user=user,
        token_hash=hash_token(raw_token),
        expires_at=timezone.now() + timezone.timedelta(seconds=REFRESH_TOKEN_TTL_SECONDS),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        ip_address=get_client_ip(request),
    )

    return raw_token, session


def rotate_refresh_session(request, raw_token):
    token_hash = hash_token(raw_token)

    with transaction.atomic():
        session = AuthRefreshSession.objects.select_for_update().select_related("user").get(
            token_hash=token_hash
        )

        if not session.is_active:
            return None, None

        user = session.user

        session.revoke()

        new_token, new_session = create_refresh_session(request, user)

        return new_token, new_session


def revoke_refresh_session(raw_token):
    token_hash = hash_token(raw_token)

    AuthRefreshSession.objects.filter(
        token_hash=token_hash,
        revoked_at__isnull=True
    ).update(revoked_at=timezone.now())


def set_refresh_cookie(response, token):
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        token,
        max_age=REFRESH_TOKEN_TTL_SECONDS,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )
    return response


def clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE_NAME, samesite="Lax")
    return response


def get_bearer_token(request):
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1).strip()
    return None