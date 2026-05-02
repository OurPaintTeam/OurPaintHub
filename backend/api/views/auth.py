import secrets
import hashlib

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core import signing
from django.contrib.auth import authenticate

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed

from .models import User, UserProfile, AuthRefreshSession


# =========================================================
# CONFIG
# =========================================================

ACCESS_TOKEN_TTL_SECONDS = 15 * 60
REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
REFRESH_COOKIE_NAME = "refresh_token"

ACCESS_SALT = "access-token"

# =========================================================
# HELPERS (SECURE)
# =========================================================

def hash_token(token: str) -> str:
    """
    Более безопасный хеш (HMAC-like через SECRET_KEY)
    """
    return hashlib.pbkdf2_hmac(
        "sha256",
        token.encode(),
        settings.SECRET_KEY.encode(),
        100_000,
    ).hex()


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_bearer_token(request):
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1).strip()
    return None


# =========================================================
# TOKEN LOGIC
# =========================================================

def create_access_token(user, session):
    payload = {
        "user_id": user.id,
        "session_id": session.id,
        "type": "access",
    }
    return signing.dumps(payload, salt=ACCESS_SALT)


def parse_access_token(token: str):
    try:
        payload = signing.loads(
            token,
            salt=ACCESS_SALT,
            max_age=ACCESS_TOKEN_TTL_SECONDS,
        )
    except signing.SignatureExpired:
        raise AuthenticationFailed("access_token_expired")
    except signing.BadSignature:
        raise AuthenticationFailed("access_token_invalid")

    if payload.get("type") != "access":
        raise AuthenticationFailed("invalid_token_type")

    try:
        session = AuthRefreshSession.objects.select_related("user").get(
            id=payload["session_id"],
            user_id=payload["user_id"],
        )
    except AuthRefreshSession.DoesNotExist:
        raise AuthenticationFailed("session_not_found")

    if not session.is_active:
        raise AuthenticationFailed("session_revoked")

    return session.user, session


def get_user_from_request(request):
    token = get_bearer_token(request)
    if not token:
        raise AuthenticationFailed("missing_access_token")

    return parse_access_token(token)[0]


# =========================================================
# SERIALIZERS (simple)
# =========================================================

def serialize_user(user):
    profile = getattr(user, "profile", None)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_admin": user.is_app_admin,
        "bio": profile.bio if profile else None,
        "date_of_birth": profile.date_of_birth.isoformat() if profile and profile.date_of_birth else None,
        "avatar": profile.avatar.url if profile and profile.avatar else None,
    }


def serialize_auth_response(user, session):
    return {
        "access_token": create_access_token(user, session),
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_TTL_SECONDS,
        "user": serialize_user(user),
    }


# =========================================================
# REFRESH SESSION
# =========================================================

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


# =========================================================
# COOKIE HELPERS
# =========================================================

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


# =========================================================
# AUTH VIEWS
# =========================================================

@api_view(["POST"])
def register_user(request):
    username = (request.data.get("username") or "").strip().lower()
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password")

    if not username or not email or not password:
        return Response({"error": "missing_fields"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "username_taken"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "email_taken"}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
    )

    UserProfile.objects.create(user=user)

    return Response({
        "message": "registered",
        "user": serialize_user(user),
    }, status=201)


@api_view(["POST"])
def login_user(request):
    login = (request.data.get("login") or "").strip().lower()
    password = request.data.get("password")

    if not login or not password:
        return Response({"error": "missing_fields"}, status=400)

    user = authenticate(username=login, password=password) \
           or authenticate(email=login, password=password)

    if not user:
        return Response({"error": "invalid_credentials"}, status=400)

    refresh_token, session = create_refresh_session(request, user)

    response = Response({
        "message": "logged_in",
        **serialize_auth_response(user, session),
    })

    return set_refresh_cookie(response, refresh_token)


@api_view(["GET"])
def validate_token(request):
    user = get_user_from_request(request)
    return Response({"valid": True, "user": serialize_user(user)})


@api_view(["POST"])
def refresh_token(request):
    raw_token = request.COOKIES.get(REFRESH_COOKIE_NAME)

    if not raw_token:
        return Response({"error": "missing_refresh_token"}, status=401)

    token_hash = hash_token(raw_token)

    try:
        with transaction.atomic():
            session = AuthRefreshSession.objects.select_for_update().select_related("user").get(
                token_hash=token_hash
            )

            if not session.is_active:
                return Response({"error": "refresh_revoked"}, status=401)

            user = session.user

            # revoke old session
            session.revoke()

            # create new session
            new_token, new_session = create_refresh_session(request, user)

    except AuthRefreshSession.DoesNotExist:
        return Response({"error": "invalid_refresh_token"}, status=401)

    response = Response({
        "message": "token_refreshed",
        **serialize_auth_response(user, new_session),
    })

    return set_refresh_cookie(response, new_token)


@api_view(["POST"])
def logout_user(request):
    raw_token = request.COOKIES.get(REFRESH_COOKIE_NAME)

    if raw_token:
        AuthRefreshSession.objects.filter(
            token_hash=hash_token(raw_token),
            revoked_at__isnull=True
        ).update(revoked_at=timezone.now())

    response = Response({"message": "logged_out"})
    return clear_refresh_cookie(response)


