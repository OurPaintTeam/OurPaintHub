from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model

from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.models.user import UserProfile
from api.utils.auth_service import get_user_from_request_data
from api.utils.constants import ACCESS_TOKEN_TTL_SECONDS, REFRESH_COOKIE_NAME
from api.utils.serializers import serialize_user
from api.utils.session import (
    clear_refresh_cookie,
    create_refresh_session,
    revoke_refresh_session,
    rotate_refresh_session,
    set_refresh_cookie,
)
from api.utils.token import (
    create_access_token,
)

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
    user, error = get_user_from_request_data(request)
    if error:
        return error

    return Response({"valid": True, "user": serialize_user(user)})


@api_view(["POST"])
def refresh_token(request):
    raw_token = request.COOKIES.get(REFRESH_COOKIE_NAME)

    if not raw_token:
        return Response({"error": "missing_refresh_token"}, status=401)

    new_token, new_session = rotate_refresh_session(request, raw_token)

    if not new_token or not new_session:
        return Response({"error": "invalid_refresh_token"}, status=401)

    response = Response({
        "message": "token_refreshed",
        **serialize_auth_response(new_session.user, new_session),
    })

    return set_refresh_cookie(response, new_token)


@api_view(["POST"])
def logout_user(request):
    raw_token = request.COOKIES.get(REFRESH_COOKIE_NAME)

    if raw_token:
        revoke_refresh_session(raw_token)

    response = Response({"message": "logged_out"})
    return clear_refresh_cookie(response)
