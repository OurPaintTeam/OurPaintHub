from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response

from api.utils.session import get_bearer_token
from api.utils.token import parse_access_token


def get_user_from_access_token(request):
    token = get_bearer_token(request)

    if not token:
        return None, Response(
            {"error": "Access token required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        user, _session = parse_access_token(token)
    except AuthenticationFailed as exc:
        return None, Response(
            {"error": "Access token invalid", "code": str(exc.detail)},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return user, None


def get_user_from_request_data(request):
    return get_user_from_access_token(request)


def is_admin(user):
    return bool(user and user.is_authenticated and user.is_app_admin)
