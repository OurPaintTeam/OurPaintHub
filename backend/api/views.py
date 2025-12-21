from django.db.models import Q, OuterRef, Subquery, Count
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.http import FileResponse
from .models import User, UserProfile, Role, Documentation, EntityLog, Project, ProjectMeta, Shared, FAQ, \
    ProjectChanges, Friendship, MediaFile, MediaMeta
from decimal import Decimal
from datetime import datetime
import re
import os
from django.http import HttpResponse
from rest_framework import status
import mimetypes
import json
import base64


def get_image_mime_type(image_bytes):
    if not image_bytes:
        return 'image/png'
    
    if isinstance(image_bytes, memoryview):
        image_bytes = bytes(image_bytes)
    
    if image_bytes.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    elif image_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    elif image_bytes.startswith(b'GIF87a') or image_bytes.startswith(b'GIF89a'):
        return 'image/gif'
    elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:
        return 'image/webp'
    elif image_bytes.startswith(b'<?xml') or image_bytes.startswith(b'<svg') or b'<svg' in image_bytes[:200]:
        return 'image/svg+xml'
    else:
        return 'image/png'


def make_friendship_entity_id(user_a, user_b):
    return min(user_a, user_b) * 1000000 + max(user_a, user_b)


def get_friendship_between(user_a_id, user_b_id):
    friendship = Friendship.objects.filter(
        Q(user1_id=user_a_id, user2_id=user_b_id) | Q(user1_id=user_b_id, user2_id=user_a_id)
    ).values_list('user1_id', 'user2_id', 'status').first()
    return friendship


def get_friend_ids(user):
    friendships = Friendship.objects.filter(
        Q(user1=user) | Q(user2=user),
        status='accepted'
    ).values_list('user1_id', 'user2_id')
    ids = []
    for u1, u2 in friendships:
        ids.append(u2 if u1 == user.id else u1)
    return ids


def get_or_create_role(role_name):
    role, created = Role.objects.get_or_create(role_name=role_name)
    return role


def is_admin(user):
    return user.role and user.role.role_name == 'admin'


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
        user_role = get_or_create_role('user')
        user = User.objects.create(email=email, password=password, role=user_role)
        
        nickname = email.split('@')[0]
        UserProfile.objects.create(user=user, name=nickname)
        
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

        if not is_admin(user):
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

        if not is_admin(user):
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

        if not is_admin(user):
            return Response({"error": "Недостаточно прав. Только администраторы могут редактировать документацию."},
                            status=403)

        try:
            doc = Documentation.objects.get(id=doc_id, type='reference')
        except Documentation.DoesNotExist:
            return Response({"error": "Документация не найдена"}, status=404)

        now = datetime.now()
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

        if not is_admin(user):
            return Response({"error": "Недостаточно прав. Только администраторы могут удалять документацию."},
                            status=403)

        try:
            doc = Documentation.objects.get(id=doc_id, type='reference')
        except Documentation.DoesNotExist:
            return Response({"error": "Документация не найдена"}, status=404)

        doc.delete()

        EntityLog.objects.create(
            action='delete',
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
        installers = MediaFile.objects.filter(type='installer').order_by('-id')
        versions_data = []

        for media in installers:
            meta = MediaMeta.objects.filter(media=media).select_related('admin').first()
            meta_info = {}
            if meta and meta.description:
                try:
                    meta_info = json.loads(meta.description)
                except Exception:
                    meta_info = {}
            file_name = f"{meta.name or 'version'}_{meta_info.get('version', '1.0.0')}.zip" if meta else f"version_{media.id}.zip"
            content_text = ""
            if meta_info:
                content_text = meta_info.get("content", "")
            elif meta and meta.description and not meta.description.strip().startswith('{'):
                content_text = meta.description
            
            versions_data.append({
                "id": media.id,
                "title": meta.name if meta else f"Версия {meta_info.get('version', '1.0.0')}",
                "content": content_text,
                "version": meta_info.get("version", "1.0.0"),
                "platform": meta_info.get("platform", "Все платформы"),
                "file_name": file_name,
                "file_size": meta_info.get("file_size") or (str(len(media.data)) if media.data else None),
                "release_date": None,
                "author_id": meta.admin.id if meta and meta.admin_id else None,
                "author_email": meta.admin.email if meta and meta.admin_id else None,
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
        media = MediaFile.objects.get(id=version_id, type='installer')

        if not media.data:
            return Response({"error": "Файл версии отсутствует"}, status=404)

        try:
            meta = MediaMeta.objects.get(media=media)
            meta_info = {}
            if meta.description:
                try:
                    meta_info = json.loads(meta.description)
                except:
                    pass
            version = meta_info.get("version", "1.0.0")
            filename = f"{meta.name or 'OurPaint'}_v{version}.zip"
        except MediaMeta.DoesNotExist:
            filename = f"version_{version_id}.zip"

        response = HttpResponse(
            media.data,
            content_type='application/octet-stream'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        try:
            user_id = request.GET.get('user_id')
            if user_id:
                user = User.objects.get(id=int(user_id))
                EntityLog.objects.create(
                    action='add',
                    id_user=user,
                    type='media_files',
                    id_entity=media.id
                )
        except:
            pass

        return response

    except MediaFile.DoesNotExist:
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
    uploaded_file = request.FILES.get('file')
    file_size = request.data.get('file_size')

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    if not title or not content:
        return Response({"error": "Заголовок и описание обязательны"}, status=400)

    if not version:
        return Response({"error": "Версия обязательна"}, status=400)

    if not uploaded_file:
        return Response({"error": "Файл обязателен"}, status=400)

    try:
        user = User.objects.get(id=user_id)

        if not is_admin(user):
            return Response({"error": "Недостаточно прав. Только администраторы могут создавать версии приложения."},
                            status=403)

        file_bytes = uploaded_file.read()
        if not file_size:
            file_size = str(len(file_bytes))
        media = MediaFile.objects.create(
            type='installer',
            data=file_bytes
        )

        media_meta = MediaMeta.objects.create(
            admin=user,
            media=media,
            description=json.dumps({
                "version": version,
                "platform": platform or "Все платформы",
                "file_size": file_size,
                "content": content
            }),
            name=title
        )

        EntityLog.objects.create(
            action='add',
            id_user=user,
            type='media_files',
            id_entity=media.id
        )
        EntityLog.objects.create(
            action='add',
            id_user=user,
            type='media_meta',
            id_entity=media_meta.id
        )

        return Response({
            "message": "Версия приложения успешно создана",
            "id": media.id,
            "title": title,
            "version": version,
            "platform": platform,
            "media_id": media.id,
            "file_name": uploaded_file.name,
            "file_size": file_size
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

        if not is_admin(user):
            return Response({"error": "Недостаточно прав. Только администраторы могут удалять версии приложения."},
                            status=403)

        try:
            media = MediaFile.objects.get(id=version_id, type='installer')
        except MediaFile.DoesNotExist:
            return Response({"error": "Версия не найдена"}, status=404)

        try:
            meta = MediaMeta.objects.get(media=media)
            meta.delete()
        except MediaMeta.DoesNotExist:
            pass

        EntityLog.objects.create(
            action='delete',
            id_user=user,
            type='media_files',
            id_entity=version_id
        )

        media.delete()

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
            friends_count = Friendship.objects.filter(
                Q(user1=user) | Q(user2=user),
                status='accepted'
            ).count()

            avatar_data_uri = None
            if profile.avatar:
                try:
                    if isinstance(profile.avatar, str):
                        if profile.avatar.startswith('data:'):
                            avatar_data_uri = profile.avatar
                        elif ';base64,' in profile.avatar:
                            if profile.avatar.startswith('image/'):
                                avatar_data_uri = f"data:{profile.avatar}"
                            else:
                                avatar_data_uri = f"data:image/{profile.avatar}"
                        else:
                            avatar_data_uri = f"data:image/png;base64,{profile.avatar}"
                    else:
                        avatar_bytes = bytes(profile.avatar) if isinstance(profile.avatar, memoryview) else profile.avatar
                        if avatar_bytes:
                            mime_type = get_image_mime_type(avatar_bytes)
                            avatar_base64 = base64.b64encode(avatar_bytes).decode('utf-8')
                            avatar_data_uri = f"data:{mime_type};base64,{avatar_base64}"
                except Exception as e:
                    print(f"Ошибка обработки аватара: {e}, тип: {type(profile.avatar)}")
                    avatar_data_uri = None
            
            return Response({
                "id": user.id,
                "email": user.email,
                "nickname": profile.name,
                "avatar": avatar_data_uri,
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
            new_avatar_bytes = None
            if isinstance(avatar, str):
                trimmed_avatar = avatar.strip()
                if trimmed_avatar:
                    if ',' in trimmed_avatar:
                        trimmed_avatar = trimmed_avatar.split(',', 1)[1]
                    
                    try:
                        new_avatar_bytes = base64.b64decode(trimmed_avatar)
                        if len(new_avatar_bytes) > 7 * 1024 * 1024:
                            return Response({"error": "Размер аватара слишком большой"}, status=400)
                    except Exception as e:
                        return Response({"error": f"Некорректный формат base64: {str(e)}"}, status=400)
            elif avatar is not None:
                return Response({"error": "Некорректный формат аватара"}, status=400)

            if isinstance(profile.avatar, str):
                if profile.avatar.startswith('data:'):
                    old_base64 = profile.avatar.split(',', 1)[1] if ',' in profile.avatar else ''
                    try:
                        current_avatar_bytes = base64.b64decode(old_base64) if old_base64 else None
                    except:
                        current_avatar_bytes = None
                else:
                    try:
                        current_avatar_bytes = base64.b64decode(profile.avatar)
                    except:
                        current_avatar_bytes = None
            elif isinstance(profile.avatar, memoryview):
                current_avatar_bytes = bytes(profile.avatar)
            else:
                current_avatar_bytes = profile.avatar
            
            if current_avatar_bytes != new_avatar_bytes:
                profile.avatar = new_avatar_bytes
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

        avatar_data_uri = None
        if profile.avatar:
            try:
                if isinstance(profile.avatar, str):
                    if profile.avatar.startswith('data:'):
                        avatar_data_uri = profile.avatar
                    elif ';base64,' in profile.avatar:
                        if profile.avatar.startswith('image/'):
                            avatar_data_uri = f"data:{profile.avatar}"
                        else:
                            avatar_data_uri = f"data:image/{profile.avatar}"
                    else:
                        avatar_data_uri = f"data:image/png;base64,{profile.avatar}"
                else:
                    avatar_bytes = bytes(profile.avatar) if isinstance(profile.avatar, memoryview) else profile.avatar
                    if avatar_bytes:
                        mime_type = get_image_mime_type(avatar_bytes)
                        avatar_base64 = base64.b64encode(avatar_bytes).decode('utf-8')
                        avatar_data_uri = f"data:{mime_type};base64,{avatar_base64}"
            except Exception as e:
                print(f"Ошибка обработки аватара: {e}, тип: {type(profile.avatar)}")
                avatar_data_uri = None
        
        return Response({
            "message": "Профиль успешно обновлен",
            "nickname": profile.name,
            "bio": profile.bio,
            "date_of_birth": profile.date_of_birth,
            "avatar": avatar_data_uri
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

        if not is_admin(user):
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

        if not is_admin(user):
            return Response({"error": "Недостаточно прав. Только администраторы могут удалять новости."}, status=403)

        try:
            news = Documentation.objects.get(id=news_id, type='guide')
        except Documentation.DoesNotExist:
            return Response({"error": "Новость не найдена"}, status=404)

        news.delete()

        EntityLog.objects.create(

            action='delete',
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
        if user.role:
            return Response({
                "user_id": user.id,
                "role": user.role.role_name,
                "is_admin": user.role.role_name == 'admin'
            }, status=200)
        else:
            return Response({
                "user_id": user.id,
                "role": "user",
                "is_admin": False
            }, status=200)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)


@api_view(["POST"])
def add_project(request):
    """
    POST /api/project/add/
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
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user_id = int(user_id)

    # Пользователь
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    project_name = (request.data.get("project_name") or "").strip()
    private = request.data.get("private", "false")
    description = (request.data.get("description") or "").strip()
    uploaded_file = request.FILES.get("file")

    if isinstance(private, str):
        private = private.lower() == "true"

    if not project_name:
        return Response({"error": "Название проекта обязательно"}, status=400)

    if not uploaded_file:
        return Response({"error": "Файл не выбран"}, status=400)

    # Файл
    file_bytes = uploaded_file.read()

    weight_mb = Decimal(len(file_bytes)) / Decimal(1024 * 1024)
    weight_mb = round(weight_mb, 2)
    if weight_mb>100 :
        return Response({"error": "Слишком большой файл"}, status=400)

    file_type = "txt"
    if "." in uploaded_file.name:
        file_type = uploaded_file.name.rsplit(".", 1)[-1].lower()

    allowed_types = [c[0] for c in ProjectMeta.TYPE_CHOICES]
    if file_type not in allowed_types:
        return Response({"error": "Не верный формат"}, status=400)

    try:
        # Проект
        project = Project.objects.create(
            user=user,
            private=private
        )

        project_meta = ProjectMeta(
            project=project,
            project_name=project_name,
            weight=weight_mb,
            type=file_type,
            data=file_bytes
        )
        project_meta.clean()
        project_meta.save()

        # История
        change_text = f"Добавлен проект '{project_name}'"
        if description:
            change_text += f". {description}"

        ProjectChanges.objects.create(
            project=project,
            changer=user,
            description=change_text
        )

        EntityLog.objects.create(
            action="add",
            id_user=user,
            type="projects",
            id_entity=project.id
        )

    except Exception as e:
        return Response(
            {"error": f"Ошибка при сохранении проекта: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {
            "message": "Проект успешно создан",
            "project_id": project.id
        },
        status=status.HTTP_201_CREATED
    )

@api_view(["POST"])
def get_project_versions(request, project_id):
    """
    GET /api/project/get_project_versions/<int:project_id>/
    Возвращает все версии проекта
    """
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Пользователь
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проект
    try:
        project = Project.objects.select_related("user").get(id=project_id)
    except Project.DoesNotExist:
        return Response(
            {"error": "Проект не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проверка прав
    is_owner = project.user_id == user.id
    is_shared = Shared.objects.filter(
        project=project,
        receiver=user
    ).exists()

    if not is_owner and not is_shared:
        return Response(
            {"error": "Нет прав на просмотр версий проекта"},
            status=status.HTTP_403_FORBIDDEN
        )

    meta = ProjectMeta.objects.filter(project=project).first()

    # Изменения
    changes = (
        ProjectChanges.objects
        .filter(project=project)
        .select_related("changer")
        .order_by("-id")
    )

    result = []
    for ch in changes:
        result.append({
            "id": ch.id,
            "changer_email": ch.changer.email,
            "description": ch.description or "",
            "project_name": meta.project_name if meta else "Без имени",
            "type": meta.type if meta else "",
            "weight": str(meta.weight) if meta and meta.weight else "0",
        })

    return Response(result, status=status.HTTP_200_OK)

@api_view(["POST"])
def get_user_projects(request):
    """
    GET /api/project/get_user_projects/
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

    user_id = request.data.get("user_id")
    viewer_id = request.data.get("viewer_id")

    if not user_id or not viewer_id:
        return Response({"error": "user_id и viewer_id обязательны"}, status=400)

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    try:
        viewer = User.objects.get(pk=viewer_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    # Получаем проекты пользователя
    projects_meta = ProjectMeta.objects.filter(project__user=user).select_related("project").order_by("-id")

    # Последние изменения проектов
    last_changes = {
        pc.project_id: pc.description
        for pc in ProjectChanges.objects.filter(project__user=user)
        .order_by("project_id", "-id")
        .distinct("project_id")
    }

    # Проверка дружбы
    friends = Friendship.objects.filter(
        ((Q(user1=user) & Q(user2=viewer)) | (Q(user1=viewer) & Q(user2=user))),
        status="accepted"
    ).exists()

    result = []
    for pm in projects_meta:
        # Приватный проект
        if pm.project.private and viewer != user and not friends:
            continue

        result.append({
            "id": pm.project.id,
            "project_name": pm.project_name,
            "weight": str(pm.weight) if pm.weight is not None else "0",
            "type": pm.type or "",
            "private": pm.project.private,
            "description": last_changes.get(pm.project.id, "Без описания"),
        })

    return Response({"projects": result}, status=200)


@api_view(["DELETE"])
def delete_project(request, project_id):
    """
    DELETE /api/project/delete/<int:project_id>/
    Удалить проект по ID
        """
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Пользователь
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проект
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response(
            {"error": "Проект не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проверка прав
    if project.user_id != user.id:
        return Response(
            {"error": "Недостаточно прав для удаления проекта"},
            status=status.HTTP_403_FORBIDDEN
        )

    # Удаление зависимостей
    ProjectChanges.objects.filter(project=project).delete()
    Shared.objects.filter(project=project).delete()
    ProjectMeta.objects.filter(project=project).delete()

    EntityLog.objects.create(
        action="remove",
        id_user=user,
        type="projects",
        id_entity=project.id
    )

    project.delete()

    return Response(
        {"success": "Проект успешно удалён"},
        status=status.HTTP_200_OK
    )


@api_view(["PATCH"])
def change_project(request, project_id):
    """
    PATCH /api/project/change/<project_id>/
    Изменить проект по ID
    {
        "user_id" : int
        "project_name": "Новое имя",
        "description": "Описание изменений",
        "private": true/false,
        "file": (binary),
    }
    """
    data = request.data
    user_id = data.get("user_id")
    user_id = int(user_id)

    if not user_id:
        return Response({"error": "ID пользователя обязателен"}, status=400)

    # Пользователь
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=404)

    # Проект
    try:
        project = Project.objects.select_related("user").get(id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Проект не найден"}, status=404)

    # Проверка прав
    is_owner = project.user_id == user.id
    is_shared = Shared.objects.filter(
        project=project,
        receiver=user
    ).exists()

    if not is_owner and not is_shared:
        return Response(
            {"error": "Недостаточно прав для изменения проекта"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        project_meta = ProjectMeta.objects.get(project=project)
    except ProjectMeta.DoesNotExist:
        return Response({"error": "Метаданные проекта не найдены"}, status=404)

    project_name = data.get("project_name")
    private = data.get("private")
    description = data.get("description", "").strip()
    file_uploaded = request.FILES.get("file")

    changed_fields = []

    # Имя проекта
    if project_name and project_name.strip() and project_name != project_meta.project_name:
        old_name = project_meta.project_name
        project_meta.project_name = project_name.strip()
        changed_fields.append(f"Название: '{old_name}' → '{project_name}'")

    # Приватность
    if private is not None:
        if isinstance(private, str):
            private = private.lower() == "true"

        if private != project.private:
            old_privacy = "Приватный" if project.private else "Публичный"
            new_privacy = "Приватный" if private else "Публичный"
            project.private = private
            project.save(update_fields=["private"])
            changed_fields.append(f"Приватность: {old_privacy} → {new_privacy}")

    # Файл
    if file_uploaded:
        file_bytes = file_uploaded.read()
        project_meta.data = file_bytes

        weight_mb = Decimal(len(file_bytes)) / Decimal(1024 * 1024)
        project_meta.weight = round(weight_mb, 2)

        if "." in file_uploaded.name:
            project_meta.type = file_uploaded.name.rsplit(".", 1)[-1].lower()

        changed_fields.append(
            f"Файл обновлён (Вес: {project_meta.weight} MB, Тип: {project_meta.type})"
        )

    project_meta.save()

    if description or changed_fields:
        change_description = (
            description if description
            else "Изменены данные проекта:\n" + "\n".join(changed_fields)
        )

        ProjectChanges.objects.create(
            project=project,
            changer=user,
            description=change_description
        )
    else:
        change_description = ""

    EntityLog.objects.create(
        action="change",
        id_user=user,
        type="projects",
        id_entity=project.id
    )

    return Response({
        "success": True,
        "message": "Проект успешно обновлён",
        "project": {
            "id": project.id,
            "project_name": project_meta.project_name,
            "weight": str(project_meta.weight),
            "type": project_meta.type,
            "private": project.private,
            "description": change_description,
        }
    }, status=status.HTTP_200_OK)

@api_view(["POST"])
def download_project(request, project_id):
    """
    GET /api/project/download/<int:project_id>/
    Скачать файл проекта
    """
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Пользователь
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проект
    try:
        project = Project.objects.select_related("user").get(id=project_id)
    except Project.DoesNotExist:
        return Response(
            {"error": "Проект не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проверка прав
    is_owner = project.user_id == user.id
    is_shared = Shared.objects.filter(project=project, receiver=user).exists()

    if not is_owner and not is_shared:
        return Response(
            {"error": "Нет прав на скачивание проекта"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        project_meta = ProjectMeta.objects.get(project=project)
    except ProjectMeta.DoesNotExist:
        return Response(
            {"error": "Файл проекта не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    if not project_meta.data:
        return Response(
            {"error": "Файл пуст или отсутствует"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Формирование файла
    ext = project_meta.type or "txt"
    filename = f"{project_meta.project_name}.{ext}"

    mime_type, _ = mimetypes.guess_type(filename)

    response = HttpResponse(
        project_meta.data,
        content_type=mime_type or "application/octet-stream"
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    return response

@api_view(["POST"])
def share_project(request, project_id):
    """
    POST /api/project/share/<project_id>/
   {
   "user_id": int,"
   "recipient_id": int,
   "comment": "..."
    }
    """
    try:
        user_id = request.data.get("user_id")
        recipient_id = request.data.get("recipient_id")
        comment = request.data.get("comment", "")

        # Проверка входных данных
        if not user_id:
            return Response(
                {"error": "ID пользователя обязателен"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not recipient_id:
            return Response(
                {"error": "Не указан получатель"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Проект
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {"error": "Проект не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка владельца
        if project.user_id != user_id:
            return Response(
                {"error": "Недостаточно прав"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверка приватности
        if project.private:
            return Response(
                {"error": "Приватный проект нельзя передать"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Получатель
        try:
            receiver = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Пользователь не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # ПРОВЕРКА ДРУЖБЫ
        is_friend = Friendship.objects.filter(
            Q(user1_id=user_id, user2_id=recipient_id) |
            Q(user1_id=recipient_id, user2_id=user_id),
            status='accepted'
        ).exists()

        if not is_friend:
            return Response(
                {"error": "Проект можно передать только друзьям"},
                status=status.HTTP_403_FORBIDDEN
            )


        shared_obj = Shared(
            project=project,
            receiver=receiver,
            comment=comment
        )

        shared_obj.full_clean()
        shared_obj.save()

        EntityLog.objects.create(
            action="add",
            id_user=project.user,
            type="shared",
            id_entity=shared_obj.id
        )

        return Response(
            {"success": "Проект успешно передан!"},
            status=status.HTTP_201_CREATED
        )

    except ValidationError as e:
        return Response(
            {"error": e.message_dict if hasattr(e, "message_dict") else str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        print("Ошибка share_project:", e)
        return Response(
            {"error": "Ошибка при передаче проекта"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
def get_shared_projects(request):
    """
    GET /api/project/shared/
    Получить список проектов, которые были переданы пользователю
    """
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    last_change_subquery = ProjectChanges.objects.filter(
        project=OuterRef("project_id")
    ).order_by("-id").values("description")[:1]

    shared_records = (
        Shared.objects
        .filter(receiver=user)
        .select_related("project", "project__user")
        .prefetch_related("project__projectmeta_set")
        .annotate(last_description=Subquery(last_change_subquery))
        .order_by("-id")
    )

    result = []

    for record in shared_records:
        project = record.project

        project_meta = project.projectmeta_set.first()

        result.append({
            "shared_id": record.id,
            "project_id": project.id,
            "project_name": project_meta.project_name if project_meta else None,
            "type": project_meta.type if project_meta else None,
            "weight": str(project_meta.weight) if project_meta and project_meta.weight is not None else None,
            "sender_id": project.user.id,
            "sender_email": project.user.email,
            "comment": record.comment,
            "description": record.last_description or "",
            "private" : record.project.private,
        })

    return Response(result, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_received(request, shared_id: int):
    """
    DELETE /api/project/delete_received/<shared_id>/
    Удаляет запись о полученном проекте для пользователя
    """
    try:
        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {"error": "ID пользователя обязателен"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Пользователь
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "Пользователь не найден"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Shared
        try:
            shared_obj = Shared.objects.get(id=shared_id)
        except Shared.DoesNotExist:
            return Response(
                {"error": "Запись не найдена"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Проверка владельца
        if shared_obj.receiver_id != user.id:
            return Response(
                {"error": "Пользователь не владеет этим проектом"},
                status=status.HTTP_403_FORBIDDEN
            )

        shared_obj.delete()

        EntityLog.objects.create(
            action="remove",
            id_user=user,
            type="shared",
            id_entity=shared_id
        )

        return Response(
            {"success": "Запись о полученном проекте удалена"},
            status=status.HTTP_204_NO_CONTENT
        )

    except Exception as e:
        print("Ошибка delete_received:", e)
        return Response(
            {"error": "Ошибка при удалении записи"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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
        u1, u2, friendship_status = row
        if friendship_status == 'sent' and u2 == user.id:
            Friendship.objects.filter(user1_id=u1, user2_id=u2).update(status='accepted')
            entity_id = make_friendship_entity_id(u1, u2)
            EntityLog.objects.create(
                action='change',
                id_user=user,
                type='friendship',
                id_entity=entity_id
            )
            return Response({"message": "Запрос в друзья принят", "status": "accepted"}, status=200)
        if friendship_status == 'accepted':
            return Response({"error": "Вы уже друзья"}, status=400)
        return Response({"error": "Запрос в друзья уже отправлен"}, status=400)

    try:
        Friendship.objects.create(user1=user, user2=friend, status='sent')
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

    sender_ids = list(Friendship.objects.filter(user2_id=user_id, status='sent').values_list('user1_id', flat=True))
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

    receiver_ids = list(Friendship.objects.filter(user1_id=user_id, status='sent').values_list('user2_id', flat=True))
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
        Friendship.objects.filter(user1_id=from_user_id, user2_id=user_id).update(status='accepted')
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
            action='delete',
            id_user=user_obj,
            type='friendship',
            id_entity=entity_id
        )
    except User.DoesNotExist:
        pass

    Friendship.objects.filter(user1_id=from_user_id, user2_id=user_id).delete()
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
        action='delete',
        id_user=user,
        type='friendship',
        id_entity=entity_id
    )

    Friendship.objects.filter(
        Q(user1_id=user_id, user2_id=friend_id) | Q(user1_id=friend_id, user2_id=user_id)
    ).delete()

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
        action='delete',
        id_user=user,
        type='friendship',
        id_entity=entity_id
    )

    Friendship.objects.filter(user1_id=user_id, user2_id=receiver_id).delete()

    return Response({"message": "Заявка отменена"}, status=200)


@api_view(["GET"])
def get_QA_list(request):
    faqs = FAQ.objects.select_related("user", "admin").order_by("-id")

    result = [
        {
            "id": faq.id,
            "text_question": faq.text_question,
            "answered": faq.answered,
            "answer_text": faq.answer_text,
            "user_email": faq.user.email,
            "admin_email": faq.admin.email if faq.admin else None,
        }
        for faq in faqs
    ]

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

    # Валидация входных данных
    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not text_question:
        return Response(
            {"error": "Вопрос не может быть пустым"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Пользователь
    try:
        user = User.objects.get(id=int(user_id))
    except (ValueError, User.DoesNotExist):
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        faq = FAQ(
            user=user,
            text_question=text_question,
            answered=False
        )

        faq.full_clean()
        faq.save()

        EntityLog.objects.create(
            action="add",
            id_user=user,
            type="faq",
            id_entity=faq.id
        )

        return Response(
            {"message": "Вопрос успешно добавлен"},
            status=status.HTTP_201_CREATED
        )

    except ValidationError as e:
        return Response(
            {"error": e.message_dict if hasattr(e, "message_dict") else str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        return Response(
            {"error": f"Ошибка при создании вопроса: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["PATCH"])
def answer_QA(request, qa_id):
    """
    PATCH /api/QA/<qa_id>/answer/
    Ответ на вопрос (только для админов)
    {
        "answer_text": "Ваш ответ"
    }
    """
    # Вопрос
    try:
        faq = FAQ.objects.get(id=qa_id)
    except FAQ.DoesNotExist:
        return Response(
            {"error": "Вопрос не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Пользователь
    user_id = request.data.get("user_id")
    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проверка администратора
    if not is_admin(user):
        return Response(
            {"error": "Недостаточно прав. Только администраторы могут отвечать на вопросы."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Ответ
    answer_text = request.data.get("answer_text", "").strip()
    if not answer_text:
        return Response(
            {"error": "Ответ не может быть пустым"},
            status=status.HTTP_400_BAD_REQUEST
        )

    faq.answer_text = answer_text
    faq.answered = True
    faq.admin = user
    faq.full_clean()
    faq.save()

    EntityLog.objects.create(
        action="change",
        id_user=user,
        type="faq",
        id_entity=faq.id
    )

    return Response(
        {"message": "Ответ успешно сохранён"},
        status=status.HTTP_200_OK
    )

@api_view(["DELETE"])
def delete_QA(request, qa_id):
    """
    DELETE /api/QA/<qa_id>/delete/
    Удаляет вопрос и его ответ
    """
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "ID пользователя обязателен"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "Пользователь не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Проверка прав администратора
    is_admin = Role.objects.filter(user=user, role="admin").exists()
    if not is_admin:
        return Response(
            {"error": "Недостаточно прав. Только администраторы могут удалять вопросы."},
            status=status.HTTP_403_FORBIDDEN
        )

    # Вопрос
    try:
        faq = FAQ.objects.get(id=qa_id)
    except FAQ.DoesNotExist:
        return Response(
            {"error": "Вопрос не найден"},
            status=status.HTTP_404_NOT_FOUND
        )

    faq_id = faq.id
    faq.delete()

    EntityLog.objects.create(
        action="remove",
        id_user=user,
        type="faq",
        id_entity=faq_id
    )

    return Response(
        {"message": "Вопрос удалён"},
        status=status.HTTP_204_NO_CONTENT
    )