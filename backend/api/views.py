from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User, UserProfile, Role
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
        
        nickname = email.split('@')[0]
        UserProfile.objects.create(user=user, name=nickname)
        Role.objects.create(user=user, role='user')
        
        return Response({
            "message": "Пользователь успешно зарегистрирован", 
            "email": user.email, 
            "id": user.id,
            "nickname": nickname
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
def get_user_profile(request):
    """
    GET /api/profile/
    Получить профиль пользователя по ID
    """
    user_id = request.GET.get('user_id')
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        try:
            profile = UserProfile.objects.get(user=user)
            return Response({
                "id": user.id,
                "email": user.email,
                "nickname": profile.name,
                "avatar": profile.avatar,
                "bio": profile.bio,
                "date_of_birth": profile.date_of_birth
            }, status=200)
        except UserProfile.DoesNotExist:
            return Response({"error": "Профиль пользователя не найден"}, status=404)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

@api_view(["PUT"])
def update_user_profile(request):
    """
    PUT /api/profile/
    Обновить профиль пользователя
    {
        "user_id": 1,
        "nickname": "новый_nickname",
        "bio": "описание",
        "date_of_birth": "1990-01-01"
    }
    """
    user_id = request.data.get('user_id')
    nickname = request.data.get('nickname')
    bio = request.data.get('bio')
    date_of_birth = request.data.get('date_of_birth')
    
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        profile, created = UserProfile.objects.get_or_create(user=user)
        
        if nickname:
            profile.name = nickname
        if bio is not None:
            profile.bio = bio if bio.strip() else None
        if date_of_birth is not None:
            profile.date_of_birth = date_of_birth if date_of_birth.strip() else None
            
        profile.save()
        
        return Response({
            "message": "Профиль успешно обновлен",
            "nickname": profile.name,
            "bio": profile.bio,
            "date_of_birth": profile.date_of_birth
        }, status=200)
        
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при обновлении профиля: {str(e)}"}, status=500)

@api_view(["GET"])
def QA_view(request):
    return Response([
        {"id": 1, "title": "Данные будут добавлены позже", "content": "Пока раздел находится в разработке."}
    ])