import logging

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import IntegrityError
from django.http import JsonResponse

from api.utils.exception_handler import _integrity_error_message


logger = logging.getLogger(__name__)


class ApiExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith("/api/") and response.status_code == 404:
            message = "Запрошенный API endpoint не найден"
            return JsonResponse({"error": message, "message": message, "status": 404}, status=404)

        return response

    def process_exception(self, request, exception):
        if not request.path.startswith("/api/"):
            return None

        if isinstance(exception, IntegrityError):
            message = _integrity_error_message(exception)
            return JsonResponse({"error": message, "message": message, "status": 400}, status=400)

        if isinstance(exception, ObjectDoesNotExist):
            message = "Запрошенный объект не найден"
            return JsonResponse({"error": message, "message": message, "status": 404}, status=404)

        if isinstance(exception, ValidationError):
            message = "; ".join(exception.messages) if hasattr(exception, "messages") else str(exception)
            return JsonResponse({"error": message, "message": message, "status": 400}, status=400)

        logger.exception("Unhandled API middleware error")
        message = "Произошла ошибка на сервере. Попробуйте ещё раз или обратитесь к администратору"
        return JsonResponse({"error": message, "message": message, "status": 500}, status=500)
