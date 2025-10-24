from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User, UserProfile, Role, Documentation, EntityLog

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
    """
    GET /api/news/
    Получить список всех новостей (используем Documentation с типом 'guide')
    """
    try:
        # Используем Documentation с типом 'guide' для новостей
        news = Documentation.objects.filter(type='guide').order_by('-id')
        news_data = []
        for item in news:
            # Извлекаем заголовок и содержание из поля text
            text_lines = item.text.split('\n')
            title = ""
            content = ""
            
            # Удаляем HTML комментарии из текста для отображения
            clean_text = item.text
            import re
            clean_text = re.sub(r'<!-- CREATED:.*?-->', '', clean_text)
            clean_text = re.sub(r'<!-- UPDATED:.*?-->', '', clean_text)
            clean_text = clean_text.strip()
            
            text_lines = clean_text.split('\n')
            
            if text_lines and text_lines[0].startswith('# '):
                title = text_lines[0][2:].strip()  # Убираем "# "
                content = '\n'.join(text_lines[2:]).strip() if len(text_lines) > 2 else ""
            else:
                title = clean_text[:50] + "..." if len(clean_text) > 50 else clean_text
                content = clean_text
            
            # Получаем даты из HTML комментариев в тексте
            created_at = None
            updated_at = None
            
            # Извлекаем дату создания из HTML комментариев
            if item.text and '<!-- CREATED:' in item.text:
                try:
                    created_start = item.text.find('<!-- CREATED:') + 13
                    created_end = item.text.find(' -->', created_start)
                    created_at = item.text[created_start:created_end].strip()
                except:
                    pass
            
            # Извлекаем дату обновления из HTML комментариев
            if item.text and '<!-- UPDATED:' in item.text:
                try:
                    updated_start = item.text.find('<!-- UPDATED:') + 13
                    updated_end = item.text.find(' -->', updated_start)
                    updated_at = item.text[updated_start:updated_end].strip()
                except:
                    pass
            
            news_data.append({
                "id": item.id,
                "title": title,
                "content": content,
                "author_id": item.admin.id,
                "author_email": item.admin.email,
                "created_at": created_at,
                "updated_at": updated_at
            })
        
        if not news_data:
            news_data = [{"id": 1, "title": "Новости будут добавлены позже", "content": "Пока раздел находится в разработке."}]
        
        return Response(news_data)
    except Exception as e:
        return Response({"error": f"Ошибка при загрузке новостей: {str(e)}"}, status=500)

@api_view(["POST"])
def create_news(request):
    """
    POST /api/news/create/
    Создать новую новость (только для админов)
    {
        "user_id": 1,
        "title": "Заголовок новости",
        "content": "Содержание новости"
    }
    """
    user_id = request.data.get('user_id')
    title = request.data.get('title')
    content = request.data.get('content')
    
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)
    
    if not title or not content:
        return Response({"error": "Заголовок и содержание обязательны"}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        
        # Проверяем, является ли пользователь администратором
        try:
            role = Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут создавать новости."}, status=403)
        
        # Создаем новость в Documentation с типом 'guide'
        # Объединяем заголовок и содержание в поле text
        from datetime import datetime
        now = datetime.now()
        full_content = f"# {title}\n\n{content}\n\n<!-- CREATED: {now.isoformat()} -->"
        news = Documentation.objects.create(
            type='guide',
            admin=user,
            text=full_content.strip()
        )
        
        # Создаем запись в EntityLog о создании новости
        from datetime import datetime
        EntityLog.objects.create(
            time=datetime.now().time(),
            action='add',
            id_user=user,
            type='documentation',
            id_entity=news.id
        )
        
        return Response({
            "message": "Новость успешно создана",
            "id": news.id,
            "title": title,
            "content": content,
            "author_id": news.admin.id,
            "created_at": None
        }, status=201)
        
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при создании новости: {str(e)}"}, status=500)

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

@api_view(["PUT"])
def update_news(request, news_id):
    """
    PUT /api/news/{id}/
    Обновить новость (только для админов)
    {
        "user_id": 1,
        "title": "Новый заголовок",
        "content": "Новое содержание"
    }
    """
    user_id = request.data.get('user_id')
    title = request.data.get('title')
    content = request.data.get('content')
    
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)
    
    if not title or not content:
        return Response({"error": "Заголовок и содержание обязательны"}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        
        # Проверяем, является ли пользователь администратором
        try:
            role = Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут редактировать новости."}, status=403)
        
        # Получаем новость из Documentation
        try:
            news = Documentation.objects.get(id=news_id, type='guide')
        except Documentation.DoesNotExist:
            return Response({"error": "Новость не найдена"}, status=404)
        
        # Обновляем новость
        from datetime import datetime
        now = datetime.now()
        
        # Извлекаем дату создания из существующего контента
        created_date = None
        if news.text and '<!-- CREATED:' in news.text:
            try:
                created_start = news.text.find('<!-- CREATED:') + 13
                created_end = news.text.find(' -->', created_start)
                created_date = news.text[created_start:created_end]
            except:
                pass
        
        # Обновляем контент с сохранением даты создания
        if created_date:
            full_content = f"# {title}\n\n{content}\n\n<!-- CREATED: {created_date} -->\n<!-- UPDATED: {now.isoformat()} -->"
        else:
            full_content = f"# {title}\n\n{content}\n\n<!-- CREATED: {now.isoformat()} -->\n<!-- UPDATED: {now.isoformat()} -->"
        
        news.text = full_content.strip()
        news.save()
        
        # Создаем запись в EntityLog об изменении новости
        from datetime import datetime
        EntityLog.objects.create(
            time=datetime.now().time(),
            action='change',
            id_user=user,
            type='documentation',
            id_entity=news.id
        )
        
        return Response({
            "message": "Новость успешно обновлена",
            "id": news.id,
            "title": title,
            "content": content,
            "author_id": news.admin.id,
            "updated_at": None
        }, status=200)
        
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при обновлении новости: {str(e)}"}, status=500)

@api_view(["DELETE"])
def delete_news(request, news_id):
    """
    DELETE /api/news/{id}/
    Удалить новость (только для админов)
    """
    user_id = request.data.get('user_id')
    
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        
        # Проверяем, является ли пользователь администратором
        try:
            role = Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут удалять новости."}, status=403)
        
        # Получаем новость из Documentation
        try:
            news = Documentation.objects.get(id=news_id, type='guide')
        except Documentation.DoesNotExist:
            return Response({"error": "Новость не найдена"}, status=404)
        
        # Удаляем новость
        news.delete()
        
        # Создаем запись в EntityLog об удалении новости
        from datetime import datetime
        EntityLog.objects.create(
            time=datetime.now().time(),
            action='remove',
            id_user=user,
            type='documentation',
            id_entity=news_id
        )
        
        return Response({
            "message": "Новость успешно удалена"
        }, status=200)
        
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при удалении новости: {str(e)}"}, status=500)

@api_view(["GET"])
def check_user_role(request):
    """
    GET /api/user/role/
    Проверить роль пользователя
    """
    user_id = request.GET.get('user_id')
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)
    
    try:
        user = User.objects.get(id=user_id)
        try:
            role = Role.objects.get(user=user)
            return Response({
                "user_id": user.id,
                "role": role.role,
                "is_admin": role.role == 'admin'
            }, status=200)
        except Role.DoesNotExist:
            return Response({
                "user_id": user.id,
                "role": "user",
                "is_admin": False
            }, status=200)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

@api_view(["GET"])
def QA_view(request):
    return Response([
        {"id": 1, "title": "Данные будут добавлены позже", "content": "Пока раздел находится в разработке."}
    ])

@api_view(["POST"])
def add_project(request):
        return Response({"error"}, status=500)

@api_view(["DELETE"])
def delete_project(request, project_id):
        return Response({"error": "Проект не найден"}, status=404)

@api_view(["PATCH"])
def change_project(request, project_id):
        return Response({"error": "Проект не найден"}, status=404)

@api_view(["GET"])
def download_project(project_id):
        return Response({"error": "Файл не найден"}, status=404)
