from django.contrib.auth.models import BaseUserManager
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core import signing
from django.contrib.auth import authenticate

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed

from api.models.auth import AuthRefreshSession
from api.models.user import UserProfile
from api.utils.token import (
    create_access_token,
    hash_token,
    ACCESS_TOKEN_TTL_SECONDS
)
from api.utils.session import (
    create_refresh_session,
    set_refresh_cookie,
    clear_refresh_cookie,
    revoke_refresh_session
)
from api.utils.constants import REFRESH_COOKIE_NAME
from api.utils.serializers import serialize_user

from django.contrib.auth import get_user_model
User = get_user_model()

def serialize_auth_response(user, session):
    return {
        "access_token": create_access_token(user, session),
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_TTL_SECONDS,
        "user": serialize_user(user),
    }



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
    user = get_user_from_request_data(request)
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
        revoke_refresh_session(raw_token)

    response = Response({"message": "logged_out"})
    return clear_refresh_cookie(response)