from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User
import hashlib

@api_view(["POST"])
def register_user(request):
    """
    POST /api/register/
    {
        "email": "...",
        "password": "..."
    }
    """
    email = request.data.get("email")
    password = request.data.get("password")

    if not password or not email:
        return Response({"error": "Все поля обязательны"}, status=400)

    # Проверяем валидность email
    if not User.validate_email(email):
        return Response({"error": "Неверный формат email"}, status=400)

    # Проверяем, существует ли пользователь
    if User.objects.filter(email=email).exists():
        return Response({"error": "Пользователь с таким email уже существует"}, status=400)

    try:
        user = User.objects.create(email=email, password=password)
        return Response({
            "message": "Пользователь успешно зарегистрирован", 
            "email": user.email, 
            "id": user.id
        }, status=201)
    except Exception as e:
        return Response({"error": f"Ошибка при создании пользователя: {str(e)}"}, status=500)

@api_view(["POST"])
def login_user(request):
    """
    POST /api/login/
    {
        "email": "...",
        "password": "..."
    }
    """
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Все поля обязательны"}, status=400)

    try:
        user = User.objects.get(email=email)
        if user.check_password(password):
            return Response({"message": "Успешная авторизация", "email": user.email, "id": user.id}, status=200)
        else:
            return Response({"error": "Неверный пароль"}, status=400)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=400)

@api_view(["GET"])
def news_view(request):
    return Response([
        {"id": 1, "title": "Новости будут добавлены позже", "content": "Пока раздел находится в разработке."}
    ])

@api_view(["GET"])
def documentation_view(request):
    return Response([
        {"id": 1, "title": "Документация будет добавлена позже", "content": "Пока раздел находится в разработке."}
    ])

@api_view(["GET"])
def download_view(request):
    return Response([
        {"id": 1, "title": "Скачивание будет добавлено позже", "content": "Пока раздел находится в разработке."}
    ])

@api_view(["GET"])
def account_view(request):
    return Response({
        "username": "Вася",
        "email": "@",
        "id": "1"
    })