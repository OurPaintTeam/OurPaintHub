import logging

from django.core.exceptions import ObjectDoesNotExist, ValidationError as DjangoValidationError
from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


logger = logging.getLogger(__name__)


def _integrity_error_message(exc):
    text = str(exc)

    if "unique_company_name_ci" in text:
        return "Компания с таким названием уже существует"
    if "unique_lower_username" in text or "username" in text:
        return "Пользователь с таким username уже существует"
    if "unique_lower_email" in text or "email" in text:
        return "Пользователь с таким email уже существует"
    if "unique_company_member" in text:
        return "Пользователь уже состоит в этой компании"
    if "unique_pending_company_invite" in text:
        return "Приглашение этому пользователю уже отправлено"
    if "unique_file_path_per_commit" in text:
        return "В одном коммите нельзя повторять один и тот же путь файла"
    if "unique_file_path_in_repository" in text:
        return "Файл с таким путём уже существует в репозитории"

    return "Невозможно сохранить данные: нарушено ограничение уникальности"


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        message = response.data

        if isinstance(response.data, dict):
            message = response.data.get("error") or response.data.get("detail") or response.data
        elif isinstance(response.data, list) and response.data:
            message = response.data[0]

        response.data = {
            "error": str(message),
            "message": str(message),
            "status": response.status_code,
        }
        return response

    if isinstance(exc, IntegrityError):
        message = _integrity_error_message(exc)
        return Response(
            {"error": message, "message": message, "status": status.HTTP_400_BAD_REQUEST},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, ObjectDoesNotExist):
        message = "Запрошенный объект не найден"
        return Response(
            {"error": message, "message": message, "status": status.HTTP_404_NOT_FOUND},
            status=status.HTTP_404_NOT_FOUND,
        )

    if isinstance(exc, DjangoValidationError):
        message = "; ".join(exc.messages) if hasattr(exc, "messages") else str(exc)
        return Response(
            {"error": message, "message": message, "status": status.HTTP_400_BAD_REQUEST},
            status=status.HTTP_400_BAD_REQUEST,
        )

    logger.exception("Unhandled API error")
    message = "Произошла ошибка на сервере. Попробуйте ещё раз или обратитесь к администратору"
    return Response(
        {"error": message, "message": message, "status": status.HTTP_500_INTERNAL_SERVER_ERROR},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
