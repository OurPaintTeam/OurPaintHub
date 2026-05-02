from rest_framework.response import Response
from rest_framework import status
from api.utils.token import parse_access_token
from api.utils.session import get_bearer_token


def get_user_from_access_token(request):
    token = get_bearer_token(request)

    if not token:
        return None, Response(
            {"error": "Access token обязателен"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    user, error_code = parse_access_token(token)

    if error_code:
        return None, Response(
            {"error": "Access token недействителен", "code": error_code},
            status=status.HTTP_401_UNAUTHORIZED
        )

    return user, None


def get_user_from_request_data(request):
    return get_user_from_access_token(request)


def is_admin(user):
    return bool(user and user.is_authenticated and user.is_app_admin)