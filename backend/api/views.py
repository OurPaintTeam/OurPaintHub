from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.db import connection
from django.http import FileResponse
from .models import User, UserProfile, Role, Documentation, EntityLog, Project, ProjectMeta, Shared, FAQ, \
    ProjectChanges
from decimal import Decimal
from datetime import datetime
import re
import os
from django.http import HttpResponse
from rest_framework import status
import mimetypes


def make_friendship_entity_id(user_a, user_b):
    return min(user_a, user_b) * 1000000 + max(user_a, user_b)


def get_friendship_between(user_a_id, user_b_id):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT user1, user2, status
            FROM friendship
            WHERE (user1 = %s AND user2 = %s) OR (user1 = %s AND user2 = %s)
            LIMIT 1
            """,
            [user_a_id, user_b_id, user_b_id, user_a_id]
        )
        row = cursor.fetchone()
    return row


def get_friend_ids(user):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT user1, user2
            FROM friendship
            WHERE (user1 = %s OR user2 = %s) AND status = 'accepted'
            """,
            [user.id, user.id]
        )
        rows = cursor.fetchall()
    ids = []
    for u1, u2 in rows:
        ids.append(u2 if u1 == user.id else u1)
    return ids


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

    if not User.validate_email(email):
        return Response({"error": "Неверный формат email"}, status=400)

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
        news = Documentation.objects.filter(type='guide').order_by('-id')
        news_data = []
        for item in news:
            
            clean_text = item.text
            import re
            clean_text = re.sub(r'<!-- CREATED:.*?-->', '', clean_text)
            clean_text = re.sub(r'<!-- UPDATED:.*?-->', '', clean_text)
            clean_text = clean_text.strip()
            
            text_lines = clean_text.split('\n')
            
            if text_lines and text_lines[0].startswith('# '):
                title = text_lines[0][2:].strip()
                content = '\n'.join(text_lines[2:]).strip() if len(text_lines) > 2 else ""
            else:
                title = clean_text[:50] + "..." if len(clean_text) > 50 else clean_text
                content = clean_text

            created_at = None
            updated_at = None

            if item.text and '<!-- CREATED:' in item.text:
                try:
                    created_start = item.text.find('<!-- CREATED:') + 13
                    created_end = item.text.find(' -->', created_start)
                    created_at = item.text[created_start:created_end].strip()
                except:
                    pass

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
            news_data = [
                {"id": 1, "title": "Новости будут добавлены позже", "content": "Пока раздел находится в разработке."}]

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

        try:
            role = Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут создавать новости."}, status=403)

        now = datetime.now()
        full_content = f"# {title}\n\n{content}\n\n<!-- CREATED: {now.isoformat()} -->"
        news = Documentation.objects.create(
            type='guide',
            admin=user,
            text=full_content.strip()
        )

        EntityLog.objects.create(
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
    try:
        docs = Documentation.objects.filter(type='reference').order_by('-id')
        documentation_data = []

        for item in docs:
            raw_text = item.text or ""

            category_match = re.search(r'<!--\s*CATEGORY:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            category = category_match.group(1).strip() if category_match else "Примитивы"

            created_match = re.search(r'<!--\s*CREATED:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            updated_match = re.search(r'<!--\s*UPDATED:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            created_at = created_match.group(1).strip() if created_match else None
            updated_at = updated_match.group(1).strip() if updated_match else None

            clean_text = re.sub(r'<!--\s*(CATEGORY|CREATED|UPDATED):.*?-->', '', raw_text, flags=re.IGNORECASE).strip()
            text_lines = clean_text.split('\n') if clean_text else []

            if text_lines and text_lines[0].startswith('# '):
                title = text_lines[0][2:].strip()
                content = '\n'.join(text_lines[1:]).strip()
            else:
                title = clean_text[:50] + "..." if clean_text and len(clean_text) > 50 else clean_text
                content = clean_text

            documentation_data.append({
                "id": item.id,
                "title": title or "Без названия",
                "content": content or "",
                "category": category,
                "author_id": item.admin.id,
                "author_email": item.admin.email,
                "created_at": created_at,
                "updated_at": updated_at,
            })

        if not documentation_data:
            documentation_data = [{
                "id": 1,
                "title": "Документация будет добавлена позже",
                "content": "Пока раздел находится в разработке.",
                "category": "Примитивы",
            }]

        return Response(documentation_data)
    except Exception as e:
        return Response({"error": f"Ошибка при загрузке документации: {str(e)}"}, status=500)


@api_view(["POST"])
def create_documentation(request):
    user_id = request.data.get('user_id')
    title = request.data.get('title')
    content = request.data.get('content')
    category = request.data.get('category')

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    if not title or not content:
        return Response({"error": "Заголовок и содержание обязательны"}, status=400)

    if not category or not isinstance(category, str):
        return Response({"error": "Категория обязательна"}, status=400)

    try:
        user = User.objects.get(id=user_id)

        try:
            Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут создавать документацию."},
                            status=403)

        now = datetime.now()
        full_content = (
            f"# {title}\n\n" \
            f"{content}\n\n" \
            f"<!-- CATEGORY: {category} -->\n" \
            f"<!-- CREATED: {now.isoformat()} -->"
        )

        documentation = Documentation.objects.create(
            type='reference',
            admin=user,
            text=full_content.strip()
        )

        EntityLog.objects.create(
            action='add',
            id_user=user,
            type='documentation',
            id_entity=documentation.id
        )

        return Response({
            "message": "Документация успешно создана",
            "id": documentation.id,
            "title": title,
            "content": content,
            "category": category,
            "author_id": documentation.admin.id,
        }, status=201)

    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при создании документации: {str(e)}"}, status=500)


@api_view(["PUT"])
def update_documentation(request, doc_id):
    """
    PUT /api/documentation/{id}/
    Обновить документацию (только для админов)
    {
        "user_id": 1,
        "title": "Новый заголовок",
        "content": "Новое содержание",
        "category": "Примитивы"
    }
    """
    user_id = request.data.get('user_id')
    title = request.data.get('title')
    content = request.data.get('content')
    category = request.data.get('category')

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    if not title or not content:
        return Response({"error": "Заголовок и содержание обязательны"}, status=400)

    if not category or not isinstance(category, str):
        return Response({"error": "Категория обязательна"}, status=400)

    try:
        user = User.objects.get(id=user_id)

        try:
            Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут редактировать документацию."},
                            status=403)

        try:
            doc = Documentation.objects.get(id=doc_id, type='reference')
        except Documentation.DoesNotExist:
            return Response({"error": "Документация не найдена"}, status=404)

        now = datetime.now()

        # Извлекаем дату создания из существующего контента
        created_date = None
        if doc.text and '<!-- CREATED:' in doc.text:
            try:
                created_start = doc.text.find('<!-- CREATED:') + 13
                created_end = doc.text.find(' -->', created_start)
                created_date = doc.text[created_start:created_end]
            except:
                pass

        if created_date:
            full_content = (
                f"# {title}\n\n" \
                f"{content}\n\n" \
                f"<!-- CATEGORY: {category} -->\n" \
                f"<!-- CREATED: {created_date} -->\n" \
                f"<!-- UPDATED: {now.isoformat()} -->"
            )
        else:
            full_content = (
                f"# {title}\n\n" \
                f"{content}\n\n" \
                f"<!-- CATEGORY: {category} -->\n" \
                f"<!-- CREATED: {now.isoformat()} -->\n" \
                f"<!-- UPDATED: {now.isoformat()} -->"
            )

        doc.text = full_content.strip()
        doc.save()

        EntityLog.objects.create(
            action='change',
            id_user=user,
            type='documentation',
            id_entity=doc.id
        )

        return Response({
            "message": "Документация успешно обновлена",
            "id": doc.id,
            "title": title,
            "content": content,
            "category": category,
            "author_id": doc.admin.id,
        }, status=200)

    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при обновлении документации: {str(e)}"}, status=500)


@api_view(["DELETE"])
def delete_documentation(request, doc_id):
    """
    DELETE /api/documentation/{id}/delete/
    Удалить документацию (только для админов)
    """
    user_id = request.data.get('user_id')

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    try:
        user = User.objects.get(id=user_id)

        try:
            Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут удалять документацию."},
                            status=403)

        try:
            doc = Documentation.objects.get(id=doc_id, type='reference')
        except Documentation.DoesNotExist:
            return Response({"error": "Документация не найдена"}, status=404)

        doc.delete()

        EntityLog.objects.create(
            action='remove',
            id_user=user,
            type='documentation',
            id_entity=doc_id
        )

        return Response({
            "message": "Документация успешно удалена"
        }, status=200)

    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при удалении документации: {str(e)}"}, status=500)


@api_view(["GET"])
def download_view(request):
    """
    GET /api/download/
    Получить список доступных версий приложения
    """
    try:
        versions = Documentation.objects.filter(type='api').order_by('-id')
        versions_data = []

        for version in versions:
            raw_text = version.text or ""

            version_match = re.search(r'<!--\s*VERSION:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            version_num = version_match.group(1).strip() if version_match else "1.0.0"

            file_path_match = re.search(r'<!--\s*FILE_PATH:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            file_path = file_path_match.group(1).strip() if file_path_match else None

            file_size_match = re.search(r'<!--\s*FILE_SIZE:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            file_size = file_size_match.group(1).strip() if file_size_match else None

            platform_match = re.search(r'<!--\s*PLATFORM:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            platform = platform_match.group(1).strip() if platform_match else "Все платформы"

            created_match = re.search(r'<!--\s*CREATED:\s*(.*?)\s*-->', raw_text, re.IGNORECASE)
            created_at = created_match.group(1).strip() if created_match else None

            # Очищаем текст от комментариев
            clean_text = re.sub(r'<!--\s*(VERSION|FILE_PATH|FILE_SIZE|PLATFORM|CREATED):.*?-->', '', raw_text,
                                flags=re.IGNORECASE).strip()
            text_lines = clean_text.split('\n') if clean_text else []

            if text_lines and text_lines[0].startswith('# '):
                title = text_lines[0][2:].strip()
                content = '\n'.join(text_lines[1:]).strip()
            else:
                title = f"OurPaint CAD v{version_num}"
                content = clean_text or f"Версия {version_num} приложения OurPaint CAD"

            versions_data.append({
                "id": version.id,
                "title": title,
                "content": content,
                "version": version_num,
                "platform": platform,
                "file_path": file_path,
                "file_size": file_size,
                "release_date": created_at,
                "author_id": version.admin.id,
                "author_email": version.admin.email,
            })

        if not versions_data:
            versions_data = [{
                "id": 1,
                "title": "Версии будут добавлены позже",
                "content": "Пока раздел находится в разработке.",
                "version": "1.0.0",
                "platform": "Все платформы",
            }]

        return Response(versions_data)
    except Exception as e:
        return Response({"error": f"Ошибка при загрузке версий: {str(e)}"}, status=500)


@api_view(["GET"])
def download_file(request, version_id):
    """
    GET /api/download/{version_id}/
    Скачать файл версии приложения
    """
    try:
        version = Documentation.objects.get(id=version_id, type='api')

        file_path = None
        if version.text and '<!-- FILE_PATH:' in version.text:
            try:
                path_start = version.text.find('<!-- FILE_PATH:') + 15
                path_end = version.text.find(' -->', path_start)
                file_path = version.text[path_start:path_end].strip()
            except:
                pass

        if not file_path:
            return Response({"error": "Файл версии не найден"}, status=404)

        if not os.path.exists(file_path):
            return Response({"error": "Файл не существует на сервере"}, status=404)

        filename = os.path.basename(file_path)

        file_handle = open(file_path, 'rb')
        response = FileResponse(file_handle, content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        try:
            user_id = request.GET.get('user_id')
            if user_id:
                user = User.objects.get(id=int(user_id))
                EntityLog.objects.create(
                    action='add',
                    id_user=user,
                    type='documentation',
                    id_entity=version.id
                )
        except:
            pass

        return response

    except Documentation.DoesNotExist:
        return Response({"error": "Версия не найдена"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при скачивании файла: {str(e)}"}, status=500)


@api_view(["POST"])
def create_version(request):
    """
    POST /api/download/create/
    Создать новую версию приложения (только для админов)
    """
    user_id = request.data.get('user_id')
    title = request.data.get('title')
    content = request.data.get('content')
    version = request.data.get('version')
    platform = request.data.get('platform')
    file_path = request.data.get('file_path')
    file_size = request.data.get('file_size')

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    if not title or not content:
        return Response({"error": "Заголовок и описание обязательны"}, status=400)

    if not version:
        return Response({"error": "Версия обязательна"}, status=400)

    if not file_path:
        return Response({"error": "Путь к файлу обязателен"}, status=400)

    try:
        user = User.objects.get(id=user_id)

        try:
            Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут создавать версии приложения."},
                            status=403)

        if not os.path.exists(file_path):
            return Response({"error": "Файл не существует по указанному пути"}, status=400)

        if not file_size:
            file_size = str(os.path.getsize(file_path))

        now = datetime.now()

        full_content = (
            f"# {title}\n\n"
            f"{content}\n\n"
            f"<!-- VERSION: {version} -->\n"
            f"<!-- FILE_PATH: {file_path} -->\n"
            f"<!-- FILE_SIZE: {file_size} -->\n"
            f"<!-- PLATFORM: {platform or 'Все платформы'} -->\n"
            f"<!-- CREATED: {now.isoformat()} -->"
        )

        version_doc = Documentation.objects.create(
            type='api',
            admin=user,
            text=full_content.strip()
        )

        EntityLog.objects.create(
            action='add',
            id_user=user,
            type='documentation',
            id_entity=version_doc.id
        )

        return Response({
            "message": "Версия приложения успешно создана",
            "id": version_doc.id,
            "title": title,
            "version": version,
            "platform": platform,
        }, status=201)

    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при создании версии: {str(e)}"}, status=500)


@api_view(["DELETE"])
def delete_version(request, version_id):
    """
    DELETE /api/download/{version_id}/delete/
    Удалить версию приложения (только для админов)
    """
    user_id = request.data.get('user_id')

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    try:
        user = User.objects.get(id=user_id)

        try:
            Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут удалять версии приложения."},
                            status=403)

        try:
            version = Documentation.objects.get(id=version_id, type='api')
        except Documentation.DoesNotExist:
            return Response({"error": "Версия не найдена"}, status=404)

        file_path = None
        if version.text and '<!-- FILE_PATH:' in version.text:
            try:
                path_start = version.text.find('<!-- FILE_PATH:') + 15
                path_end = version.text.find(' -->', path_start)
                file_path = version.text[path_start:path_end].strip()
            except:
                pass

        version.delete()

        EntityLog.objects.create(
            action='remove',
            id_user=user,
            type='documentation',
            id_entity=version_id
        )

        return Response({
            "message": "Версия приложения успешно удалена"
        }, status=200)

    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)
    except Exception as e:
        return Response({"error": f"Ошибка при удалении версии: {str(e)}"}, status=500)


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
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM friendship
                    WHERE status = 'accepted' AND (user1 = %s OR user2 = %s)
                    """,
                    [user.id, user.id]
                )
                row = cursor.fetchone()
                friends_count = int(row[0]) if row and row[0] is not None else 0

            return Response({
                "id": user.id,
                "email": user.email,
                "nickname": profile.name,
                "avatar": profile.avatar,
                "bio": profile.bio,
                "date_of_birth": profile.date_of_birth,
                "friends_count": friends_count
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
        "date_of_birth": "1990-01-01",
        "avatar": "data:image/png;base64,..."
    }
    """
    user_id = request.data.get('user_id')
    nickname = request.data.get('nickname')
    bio = request.data.get('bio')
    date_of_birth = request.data.get('date_of_birth')
    avatar_provided = 'avatar' in request.data
    avatar = request.data.get('avatar') if avatar_provided else None

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    try:
        user = User.objects.get(id=user_id)
        profile, _ = UserProfile.objects.get_or_create(user=user)

        avatar_changed = False
        if avatar_provided:
            new_avatar = None
            if isinstance(avatar, str):
                trimmed_avatar = avatar.strip()
                if trimmed_avatar:
                    if not trimmed_avatar.startswith('data:image'):
                        return Response({"error": "Аватар должен быть изображением в формате base64"}, status=400)
                    if len(trimmed_avatar) > 7 * 1024 * 1024:
                        return Response({"error": "Размер аватара слишком большой"}, status=400)
                    new_avatar = trimmed_avatar
            elif avatar is not None:
                return Response({"error": "Некорректный формат аватара"}, status=400)

            if profile.avatar != new_avatar:
                profile.avatar = new_avatar
                avatar_changed = True

        if nickname:
            profile.name = nickname
        if bio is not None:
            profile.bio = bio if bio.strip() else None
        if date_of_birth is not None:
            profile.date_of_birth = date_of_birth if date_of_birth.strip() else None

        profile.save()

        if avatar_changed:
            EntityLog.objects.create(
                action='change',
                id_user=user,
                type='user_profile',
                id_entity=user.id
            )

        return Response({
            "message": "Профиль успешно обновлен",
            "nickname": profile.name,
            "bio": profile.bio,
            "date_of_birth": profile.date_of_birth,
            "avatar": profile.avatar
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

        try:
            role = Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут редактировать новости."},
                            status=403)

        try:
            news = Documentation.objects.get(id=news_id, type='guide')
        except Documentation.DoesNotExist:
            return Response({"error": "Новость не найдена"}, status=404)

        now = datetime.now()
        created_date = None
        if news.text and '<!-- CREATED:' in news.text:
            try:
                created_start = news.text.find('<!-- CREATED:') + 13
                created_end = news.text.find(' -->', created_start)
                created_date = news.text[created_start:created_end]
            except:
                pass

        if created_date:
            full_content = f"# {title}\n\n{content}\n\n<!-- CREATED: {created_date} -->\n<!-- UPDATED: {now.isoformat()} -->"
        else:
            full_content = f"# {title}\n\n{content}\n\n<!-- CREATED: {now.isoformat()} -->\n<!-- UPDATED: {now.isoformat()} -->"

        news.text = full_content.strip()
        news.save()

        EntityLog.objects.create(

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

        try:
            role = Role.objects.get(user=user, role='admin')
        except Role.DoesNotExist:
            return Response({"error": "Недостаточно прав. Только администраторы могут удалять новости."}, status=403)

        try:
            news = Documentation.objects.get(id=news_id, type='guide')
        except Documentation.DoesNotExist:
            return Response({"error": "Новость не найдена"}, status=404)

        news.delete()

        EntityLog.objects.create(

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


@api_view(["POST"])
def add_project(request, user_id):
    """
    POST /api/project/add/<int:user_id>/
    Добавить проект для пользователя.

    Тело запроса:
    {
        "project_name": "Новый проект",
        "weight": "1.5",
        "type": "txt",
        "private": "true",
        "file": <файл>,
        "description": "Описание проекта"
    }
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    project_name = request.data.get("project_name")
    weight = request.data.get("weight")
    type_ = request.data.get("type")
    private = request.data.get("private", "false").lower() == "true"
    description = (request.data.get("description") or "").strip()
    uploaded_file = request.FILES.get("file")

    if not uploaded_file:
        return Response({"error": "Файл не выбран"}, status=400)
    if not project_name or weight is None or not type_:
        return Response({"error": "Недостаточно данных"}, status=400)

    try:
        weight = Decimal(weight)
    except:
        return Response({"error": "Вес должен быть числом"}, status=400)

    allowed_types = [choice[0] for choice in ProjectMeta.TYPE_CHOICES]
    if type_ not in allowed_types:
        type_ = "txt"

    try:
        project = Project.objects.create(user=user, private=private)
        file_data = uploaded_file.read()
        ProjectMeta.objects.create(
            project=project,
            project_name=project_name,
            weight=weight,
            type=type_,
            data=file_data,
        )

        change_text = f"Добавлен проект '{project_name}'"
        if description:
            change_text += f". {description}"

        ProjectChanges.objects.create(
            project=project,
            changer=user,
            description=change_text
        )

        EntityLog.objects.create(
            action='add',
            id_user=project.user,
            type='project',
            id_entity=project.id
        )

    except Exception as e:
        return Response({"error": f"Ошибка при сохранении проекта: {str(e)}"}, status=500)

    return Response(
        {"message": "Проект успешно создан", "project_id": project.id},
        status=201
    )


@api_view(["GET"])
def get_project_versions(request, project_id):
    """
    GET /api/project/get_project_versions/<int:project_id>/
    Возвращает все версии проекта
    """
    from .models import Project, ProjectChanges, ProjectMeta

    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Проект не найден"}, status=404)

    meta = ProjectMeta.objects.filter(project=project).first()
    changes = ProjectChanges.objects.filter(project=project).select_related("changer").order_by("-id")

    result = []
    for ch in changes:
        result.append({
            "id": ch.id,
            "changer": getattr(ch.changer, "username", ch.changer.email),
            "description": ch.description,
            "project_name": meta.project_name if meta else "Без имени",
            "type": meta.type if meta else "N/A",
            "weight": str(meta.weight) if meta else "0",
        })

    return Response(result, status=200)


@api_view(["GET"])
def get_user_projects(request, user_id):
    """
    GET /api/project/get_user_projects/<int:user_id>/
    Получить список проектов пользователя
    Возвращает:
    {
        "projects": [
            {
                "id": 1,
                "project_name": "Проект 1",
                "weight": "1.50",
                "type": "txt",
                "private": false,
                "description": "Описание последнего изменения"
            },
            ...
        ]
    }
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"projects": []})

    projects = ProjectMeta.objects.filter(project__user=user).select_related("project")
    data = []
    for p in projects:
        try:
            last_change = (
                ProjectChanges.objects
                .filter(project=p.project)
                .order_by("-id")
                .first()
            )

            description = last_change.description if last_change and last_change.description else "Без описания"

            data.append({
                "id": p.id,
                "project_name": p.project_name,
                "weight": str(p.weight) if p.weight is not None else "0",
                "type": p.type or "",
                "private": p.project.private,
                "description": description,
            })
        except Exception as e:
            print(f"Ошибка сериализации проекта {p.id}: {e}")
            continue

    return Response({"projects": data})


@api_view(["DELETE"])
def delete_project(request, project_id):
    """
    DELETE /api/project/delete/<int:project_id>/
    Удалить проект по ID
        """
    try:
        project = ProjectMeta.objects.get(pk=project_id)
    except ProjectMeta.DoesNotExist:
        return Response({"error": "Проект не найден"}, status=404)

    EntityLog.objects.create(
        
        action='delete',
        id_user=project.user,
        type='project',
        id_entity=project
    )

    ProjectChanges.objects.filter(project_id=project_id).delete()
    project.delete()
    return Response({"success": "Проект удалён"}, status=200)


@api_view(["PATCH"])
def change_project(request, project_id):
    """
    PATCH /api/project/change/<project_id>/
    Изменить проект по ID
    {
        "project_name": "Новое имя",
        "description": "Описание изменений",
        "private": true/false,
        "file": (binary),
        "changer_id": 123
    }
    """
    try:
        project_meta = ProjectMeta.objects.select_related("project").get(pk=project_id)
    except ProjectMeta.DoesNotExist:
        return Response({"error": "Проект не найден"}, status=404)

    data = request.data
    project_name = data.get("project_name")
    private = data.get("private")
    description = data.get("description")
    changer_id = data.get("changer_id")
    file_uploaded = request.FILES.get("file")

    changed_fields = []

    if project_name and project_name != project_meta.project_name:
        old_name = project_meta.project_name
        project_meta.project_name = project_name
        changed_fields.append(f"Название: '{old_name}' → '{project_name}'")

    if private is not None:
        if isinstance(private, str):
            private = private.lower() == "true"
        if private != project_meta.project.private:
            old_privacy = "Приватный" if project_meta.project.private else "Публичный"
            new_privacy = "Приватный" if private else "Публичный"
            project_meta.project.private = private
            project_meta.project.save()
            changed_fields.append(f"Приватность: {old_privacy} → {new_privacy}")

    if file_uploaded:
        file_bytes = file_uploaded.read()
        project_meta.data = file_bytes
        weight_mb = Decimal(len(file_bytes)) / Decimal(1024 * 1024)
        project_meta.weight = round(weight_mb, 2)
        project_meta.type = file_uploaded.name.split(".")[-1].lower()
        changed_fields.append(f"Файл обновлён (Вес: {project_meta.weight} MB, Тип: {project_meta.type})")

    project_meta.save()

    changer = None
    if changer_id:
        try:
            changer = User.objects.get(pk=changer_id)
        except User.DoesNotExist:
            changer = None
    elif request.user.is_authenticated:
        changer = request.user

    change_description = ""
    if changer and (description or changed_fields):
        if description:
            change_description = description
        else:
            change_description = "Изменены данные проекта:\n" + "\n".join(changed_fields)

        ProjectChanges.objects.create(
            project=project_meta.project,
            changer=changer,
            description=change_description
        )

    EntityLog.objects.create(
        action='change',
        id_user=changer,
        type='project',
        id_entity=project_meta.project.id
    )

    return Response({
        "success": True,
        "message": "Проект успешно обновлён",
        "project": {
            "id": project_meta.id,
            "project_name": project_meta.project_name,
            "weight": str(project_meta.weight),
            "type": project_meta.type,
            "private": project_meta.project.private,
            "description": change_description,
        }
    }, status=200)


@api_view(["GET"])
def download_project(request, project_id):
    """
    GET /api/project/download/<int:project_id>/
    Скачать файл проекта
    """
    try:
        project_meta = ProjectMeta.objects.get(pk=project_id)
        if not project_meta.data:
            return Response({"error": "Файл не найден"}, status=404)

        ext = project_meta.type if project_meta.type else "txt"
        filename = f"{project_meta.project_name}.{ext}"

        mime_type, _ = mimetypes.guess_type(filename)
        response = HttpResponse(project_meta.data, content_type=mime_type or "application/octet-stream")
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ProjectMeta.DoesNotExist:
        return Response({"error": "Проект не найден"}, status=404)


@api_view(["POST"])
def share_project(request, project_id):
    """
    POST /api/project/share/<project_id>/
   {
   "recipient_id": int,
   "comment": "..."
    }
    """
    try:
        recipient_id = request.data.get("recipient_id")
        comment = request.data.get("comment", "")

        if not recipient_id:
            return Response({"error": "Не указан получатель"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"error": "Проект не найден"}, status=status.HTTP_404_NOT_FOUND)

        try:
            receiver = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

        shared_obj = Shared(project=project, receiver=receiver, comment=comment)
        shared_obj.clean()  # нельзя самому себе
        shared_obj.save()

        EntityLog.objects.create(
            
            action='add',
            id_user=Project.objects.get(id=project_id).user,
            type='shared',
            id_entity=shared_obj.id
        )

        return Response({"success": "Проект успешно передан!"}, status=status.HTTP_201_CREATED)

    except ValidationError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print("Ошибка share_project:", e)
        return Response({"error": "Ошибка при передаче проекта"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_shared_projects(request, user_id):
    """
    GET /api/project/shared/<user_id>/
    Получить список проектов, которые были переданы пользователю
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

    shared_records = Shared.objects.filter(receiver=user).select_related("project", "project__user")

    result = []
    for record in shared_records:
        project = record.project
        try:
            project_meta = ProjectMeta.objects.get(project=project)
        except ProjectMeta.DoesNotExist:
            continue  # если метаданных нет, пропускаем

        # берём последнее изменение проекта для описания
        last_change = ProjectChanges.objects.filter(project=project).order_by('-id').first()
        description = last_change.description if last_change else ""

        result.append({
            "shared_id": record.id,
            "project_id": project.id,
            "project_name": project_meta.project_name,
            "type": project_meta.type,
            "weight": str(project_meta.weight) if project_meta.weight is not None else None,
            "sender_id": project.user.id,
            "sender_email": project.user.email,
            "comment": record.comment,
            "description": description,
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_received(request, shared_id: int):
    """
    DELETE /api/project/delete_received/<shared_id>/
    Удаляет запись о полученном проекте для пользователя
    """
    try:
        shared_obj = Shared.objects.get(id=shared_id)
        id = shared_obj.receiver
        shared_obj.delete()

        EntityLog.objects.create(
            
            action='delete',
            id_user=id,
            type='shared',
            id_entity=shared_id
        )

        return Response({"success": "Запись о полученном проекте удалена"}, status=status.HTTP_200_OK)
    except Shared.DoesNotExist:
        return Response({"error": "Запись не найдена"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        print("Ошибка delete_received:", e)
        return Response({"error": "Ошибка при удалении записи"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_all_users(request):
    """
    GET /api/users/
    Получить список всех пользователей (с исключением текущего, если указан exclude_id)
    
    Параметры:
    - exclude_id: ID пользователя, которого нужно исключить из списка
    - search: Поиск по email (частичное совпадение, case-insensitive)
    """
    exclude_id = request.GET.get('exclude_id')
    search = request.GET.get('search', '').strip()

    users = User.objects.all()
    if exclude_id:
        try:
            exclude_id = int(exclude_id)
            users = users.exclude(id=exclude_id)
        except ValueError:
            return Response({"error": "Неверный формат exclude_id"}, status=400)

    if search:
        users = users.filter(email__icontains=search)

    result = []
    for user in users:
        try:
            profile = UserProfile.objects.get(user=user)
            nickname = profile.name
        except UserProfile.DoesNotExist:
            nickname = None

        result.append({
            "id": user.id,
            "email": user.email,
            "nickname": nickname
        })

    return Response(result, status=200)


@api_view(["GET"])
def get_friends(request):
    """
    GET /api/friends/
    Получить список друзей пользователя

    Параметры:
    - user_id: ID пользователя
    """
    user_id = request.GET.get('user_id')
    search = (request.GET.get('search') or '').strip()
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    friend_ids = get_friend_ids(user)
    friends = User.objects.filter(id__in=friend_ids)
    if search:
        friends = friends.filter(email__icontains=search)
    result = []
    for friend_user in friends:
        try:
            profile = UserProfile.objects.get(user=friend_user)
            nickname = profile.name
        except UserProfile.DoesNotExist:
            nickname = None
        result.append({
            "id": friend_user.id,
            "email": friend_user.email,
            "nickname": nickname
        })
    return Response(result, status=200)


@api_view(["POST"])
def add_friend(request):
    """
    POST /api/friends/add/
    Отправить запрос в друзья или принять запрос
    
    Тело запроса:
    {
        "user_id": 1,  # ID текущего пользователя
        "friend_id": 2  # ID пользователя, с которым устанавливается дружба
    }
    """
    user_id = request.data.get('user_id')
    friend_id = request.data.get('friend_id')

    if not user_id or not friend_id:
        return Response({"error": "ID пользователя и друга обязательны"}, status=400)

    try:
        user_id = int(user_id)
        friend_id = int(friend_id)
    except (ValueError, TypeError):
        return Response({"error": "Неверный формат ID"}, status=400)

    if user_id == friend_id:
        return Response({"error": "Нельзя добавить себя в друзья"}, status=400)

    try:
        user = User.objects.get(id=user_id)
        friend = User.objects.get(id=friend_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    row = get_friendship_between(user.id, friend.id)
    if row:
        u1, u2, status = row
        if status == 'sent' and u2 == user.id:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE friendship
                    SET status = 'accepted'
                    WHERE user1 = %s AND user2 = %s
                    """,
                    [u1, u2]
                )
            entity_id = make_friendship_entity_id(u1, u2)
            EntityLog.objects.create(
                action='change',
                id_user=user,
                type='friendship',
                id_entity=entity_id
            )
            return Response({"message": "Запрос в друзья принят", "status": "accepted"}, status=200)
        if status == 'accepted':
            return Response({"error": "Вы уже друзья"}, status=400)
        return Response({"error": "Запрос в друзья уже отправлен"}, status=400)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO friendship (user1, user2, status) VALUES (%s, %s, 'sent')
                """,
                [user.id, friend.id]
            )
        entity_id = make_friendship_entity_id(user.id, friend.id)
        EntityLog.objects.create(
            action='add',
            id_user=user,
            type='friendship',
            id_entity=entity_id
        )
        return Response({"message": "Запрос в друзья отправлен", "status": "sent"}, status=201)
    except Exception as e:
        return Response({"error": f"Ошибка при создании дружбы: {str(e)}"}, status=500)


@api_view(["GET"])
def get_friend_requests(request):
    """
    GET /api/friends/requests/
    Входящие заявки (status='sent'), где текущий пользователь — получатель (user2)
    
    Параметры:
    - user_id: ID текущего пользователя
    """
    user_id = request.GET.get('user_id')
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return Response({"error": "Неверный формат ID"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT user1
            FROM friendship
            WHERE user2 = %s AND status = 'sent'
            """,
            [user_id]
        )
        rows = cursor.fetchall()

    sender_ids = [r[0] for r in rows]
    senders = User.objects.filter(id__in=sender_ids)

    result = []
    for sender in senders:
        try:
            profile = UserProfile.objects.get(user=sender)
            nickname = profile.name
        except UserProfile.DoesNotExist:
            nickname = None
        result.append({
            "id": sender.id,
            "email": sender.email,
            "nickname": nickname
        })
    return Response(result, status=200)


@api_view(["GET"])
def get_sent_friend_requests(request):
    """
    GET /api/friends/requests/sent/
    Отправленные заявки (status='sent'), где текущий пользователь — отправитель (user1)
    
    Параметры:
    - user_id: ID текущего пользователя
    """
    user_id = request.GET.get('user_id')
    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return Response({"error": "Неверный формат ID"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT user2
            FROM friendship
            WHERE user1 = %s AND status = 'sent'
            """,
            [user_id]
        )
        rows = cursor.fetchall()

    receiver_ids = [r[0] for r in rows]
    receivers = User.objects.filter(id__in=receiver_ids)

    result = []
    for receiver in receivers:
        try:
            profile = UserProfile.objects.get(user=receiver)
            nickname = profile.name
        except UserProfile.DoesNotExist:
            nickname = None
        result.append({
            "id": receiver.id,
            "email": receiver.email,
            "nickname": nickname
        })
    return Response(result, status=200)


@api_view(["POST"])
def respond_friend_request(request):
    """
    POST /api/friends/requests/respond/
    Принять или отклонить входящую заявку

    Тело запроса:
    {
      "user_id": <текущий пользователь-получатель>,
      "from_user_id": <отправитель заявки>,
      "action": "accept" | "decline"
    }
    """
    user_id = request.data.get('user_id')
    from_user_id = request.data.get('from_user_id')
    action = (request.data.get('action') or '').lower()

    if not user_id or not from_user_id or action not in ("accept", "decline"):
        return Response({"error": "user_id, from_user_id и корректный action обязательны"}, status=400)

    try:
        user_id = int(user_id)
        from_user_id = int(from_user_id)
    except (ValueError, TypeError):
        return Response({"error": "Неверный формат ID"}, status=400)

    if user_id == from_user_id:
        return Response({"error": "Некорректные участники заявки"}, status=400)

    exists = get_friendship_between(from_user_id, user_id)
    if not exists or exists[2] != 'sent' or exists[0] != from_user_id or exists[1] != user_id:
        return Response({"error": "Заявка не найдена"}, status=404)

    entity_id = make_friendship_entity_id(from_user_id, user_id)

    if action == 'accept':
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE friendship
                SET status = 'accepted'
                WHERE user1 = %s AND user2 = %s
                """,
                [from_user_id, user_id]
            )
        try:
            user_obj = User.objects.get(id=user_id)
            EntityLog.objects.create(
                action='change',
                id_user=user_obj,
                type='friendship',
                id_entity=entity_id
            )
        except User.DoesNotExist:
            pass
        return Response({"message": "Заявка принята", "status": "accepted"}, status=200)

    try:
        user_obj = User.objects.get(id=user_id)
        EntityLog.objects.create(
            action='remove',
            id_user=user_obj,
            type='friendship',
            id_entity=entity_id
        )
    except User.DoesNotExist:
        pass

    with connection.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM friendship
            WHERE user1 = %s AND user2 = %s
            """,
            [from_user_id, user_id]
        )
    return Response({"message": "Заявка отклонена", "status": "declined"}, status=200)


@api_view(["DELETE"])
def remove_friend(request):
    """
    DELETE /api/friends/remove/
    Удалить друга (удалить friendship со status='accepted')
    
    Тело запроса:
    {
        "user_id": 1,  # ID текущего пользователя
        "friend_id": 2  # ID друга, которого удаляем
    }
    """
    user_id = request.data.get('user_id')
    friend_id = request.data.get('friend_id')

    if not user_id or not friend_id:
        return Response({"error": "ID пользователя и друга обязательны"}, status=400)

    try:
        user_id = int(user_id)
        friend_id = int(friend_id)
    except (ValueError, TypeError):
        return Response({"error": "Неверный формат ID"}, status=400)

    if user_id == friend_id:
        return Response({"error": "Нельзя удалить себя из друзей"}, status=400)

    try:
        user = User.objects.get(id=user_id)
        friend = User.objects.get(id=friend_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    row = get_friendship_between(user_id, friend_id)
    if not row or row[2] != 'accepted':
        return Response({"error": "Дружба не найдена или уже удалена"}, status=404)

    u1, u2, _ = row
    entity_id = make_friendship_entity_id(u1, u2)
    EntityLog.objects.create(
        action='remove',
        id_user=user,
        type='friendship',
        id_entity=entity_id
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM friendship
            WHERE (user1 = %s AND user2 = %s) OR (user1 = %s AND user2 = %s)
            """,
            [user_id, friend_id, friend_id, user_id]
        )

    return Response({"message": "Друг успешно удален"}, status=200)


@api_view(["POST"])
def cancel_friend_request(request):
    """
    POST /api/friends/requests/cancel/
    Отменить отправленную заявку (удалить friendship со status='sent', где user1 = текущий пользователь)
    
    Тело запроса:
    {
        "user_id": 1,  # ID текущего пользователя (отправитель)
        "receiver_id": 2  # ID получателя заявки
    }
    """
    user_id = request.data.get('user_id')
    receiver_id = request.data.get('receiver_id')

    if not user_id or not receiver_id:
        return Response({"error": "ID пользователя и получателя обязательны"}, status=400)

    try:
        user_id = int(user_id)
        receiver_id = int(receiver_id)
    except (ValueError, TypeError):
        return Response({"error": "Неверный формат ID"}, status=400)

    if user_id == receiver_id:
        return Response({"error": "Некорректные параметры"}, status=400)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    row = get_friendship_between(user_id, receiver_id)
    if not row or row[2] != 'sent' or row[0] != user_id or row[1] != receiver_id:
        return Response({"error": "Заявка не найдена или уже обработана"}, status=404)

    entity_id = make_friendship_entity_id(row[0], row[1])
    EntityLog.objects.create(
        action='remove',
        id_user=user,
        type='friendship',
        id_entity=entity_id
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM friendship
            WHERE user1 = %s AND user2 = %s
            """,
            [user_id, receiver_id]
        )

    return Response({"message": "Заявка отменена"}, status=200)


@api_view(["GET"])
def get_QA_list(request):
    faqs = FAQ.objects.select_related("user", "admin").all().order_by("-id")
    result = []
    for faq in faqs:
        result.append({
            "id": faq.id,
            "text_question": faq.text_question,
            "answered": faq.answered,
            "answer_text": faq.answer_text,
            "user_email": faq.user.email if faq.user else None,
            "admin_email": faq.admin.email if faq.admin else None,
            "created_at": faq.created_at.isoformat() if hasattr(faq, 'created_at') else None,
        })
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
def create_QA(request):
    """
    POST /api/QA/create/
    Создать новый вопрос
    {
        "user_id": 1,
        "text_question": "Ваш вопрос"
    }
    """
    user_id = request.data.get("user_id")
    text_question = request.data.get("text_question", "").strip()

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)
    if not text_question:
        return Response({"error": "Вопрос не может быть пустым"}, status=400)

    try:
        user = User.objects.get(id=int(user_id))
    except (ValueError, User.DoesNotExist):
        return Response({"error": "Пользователь не найден"}, status=404)

    try:
        faq = FAQ(user=user, admin=None, text_question=text_question, answered=False)
        faq.clean()
        faq.save()

        EntityLog.objects.create(
            
            action='add',
            id_user=user,
            type='FAQ',
            id_entity=faq.id
        )

        return Response({
            "message": "Вопрос успешно добавлен"
        }, status=201)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)
    except Exception as e:
        return Response({"error": f"Ошибка при создании вопроса: {str(e)}"}, status=500)


@api_view(["PATCH"])
def answer_QA(request, qa_id):
    """
    PATCH /api/QA/<qa_id>/answer/
    Ответ на вопрос (только для админов)
    {
        "answer_text": "Ваш ответ"
    }
    """
    try:
        faq = FAQ.objects.get(id=qa_id)
    except FAQ.DoesNotExist:
        return Response({"error": "Вопрос не найден"}, status=404)

    user_id = request.data.get('user_id')

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    user = User.objects.get(id=user_id)

    try:
        role = Role.objects.get(user=user, role='admin')
    except Role.DoesNotExist:
        return Response({"error": "Недостаточно прав. Только администраторы могут создавать новости."}, status=403)

    answer_text = request.data.get("answer_text", "").strip()
    if not answer_text:
        return Response({"error": "Ответ не может быть пустым"}, status=400)

    try:
        faq.answer_text = answer_text
        faq.answered = True
        faq.admin = user
        faq.save()

        EntityLog.objects.create(
            action='change',
            id_user=user,
            type='FAQ',
            id_entity=faq.id
        )

        return Response({
            "message": "Ответ успешно сохранён"
        }, status=200)
    except Exception as e:
        return Response({"error": f"Ошибка при сохранении ответа: {str(e)}"}, status=500)
