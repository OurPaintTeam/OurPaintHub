from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login

@api_view(["POST"])
def register_user(request):
    """
    POST /api/register/
    {
        "username": "...",
        "email": "...",
        "password": "..."
    }
    """
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not username or not password or not email:
        return Response({"error": "Все поля обязательны"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Пользователь уже существует"}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    return Response({"username": user.username, "email": user.email}, status=201)

@api_view(["POST"])
def login_user(request):
    """
    POST /api/login/
    {
        "username": "...",
        "password": "..."
    }
    """
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"error": "Все поля обязательны"}, status=400)

    user = authenticate(request, username=username, password=password)
    if user:
        login(request, user)  # создаём сессию
        return Response({"username": user.username}, status=200)
    return Response({"error": "Неверные учетные данные"}, status=400)

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