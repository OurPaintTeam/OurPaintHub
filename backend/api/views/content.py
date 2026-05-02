from django.http import FileResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from api.choices import ContentAudience
from api.models.content import (
    Documentation,
    AppVersion,
    DocumentationType,
)
from api.utils.auth_service import get_user_from_request_data, is_admin
from api.utils.logging_service import log_action


def build_document_text(title, content, category=None):
    parts = [f"# {title}", "", content]
    if category:
        parts.extend(["", f"<!-- CATEGORY: {category} -->"])
    return "\n".join(parts).strip()

def serialize_app_version(app_version):
    return {
        "id": app_version.id,
        "title": app_version.title,
        "content": app_version.content,
        "version": app_version.version,
        "platform": app_version.platform,
        "file_name": app_version.original_name,
        "file_size": app_version.file_size,
        "created_by_id": app_version.created_by_id,
        "created_at": app_version.created_at.isoformat(),
        "updated_at": app_version.updated_at.isoformat(),
        "download_url": f"/api/download/{app_version.id}/",
    }

def parse_document_text(text):
    if not text:
        return {"title": "", "content": "", "category": None}

    lines = text.splitlines()
    title = lines[0][2:].strip() if lines and lines[0].startswith("# ") else ""
    category = None
    content_lines = []

    for line in lines[1:]:
        if line.startswith("<!-- CATEGORY:") and line.endswith("-->"):
            category = line.replace("<!-- CATEGORY:", "").replace("-->", "").strip()
        elif not line.startswith("<!--"):
            content_lines.append(line)

    content = "\n".join(content_lines).strip()
    return {"title": title or text[:80], "content": content, "category": category}


def serialize_documentation(item):
    parsed = parse_document_text(item.text)
    return {
        "id": item.id,
        "type": item.type,
        "title": parsed["title"],
        "content": parsed["content"],
        "category": parsed["category"],
        "target_audience": item.target_audience,
        "author_id": item.admin_id,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


@api_view(["GET"])
def news_view(request):
    news = Documentation.objects.filter(
        type=DocumentationType.NEWS
    ).order_by("-created_at")

    return Response([serialize_documentation(n) for n in news])


@api_view(["POST"])
def create_news(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    title = request.data.get("title", "").strip()
    content = request.data.get("content", "").strip()

    if not title or not content:
        return Response({"error": "missing_fields"}, status=400)

    news = Documentation.objects.create(
        type=DocumentationType.NEWS,
        admin=user,
        text=build_document_text(title, content),
    )

    log_action(user, "create", news)

    return Response(serialize_documentation(news), status=201)


@api_view(["PUT", "DELETE"])
def update_news(request, news_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    try:
        news = Documentation.objects.get(
            id=news_id,
            type=DocumentationType.NEWS
        )
    except Documentation.DoesNotExist:
        return Response({"error": "not_found"}, status=404)

    if request.method == "DELETE":
        log_action(user, "delete", news)
        news.delete()
        return Response(status=204)

    news.text = build_document_text(
        request.data.get("title", ""),
        request.data.get("content", "")
    )
    news.save()

    log_action(user, "update", news)

    return Response(serialize_documentation(news))


@api_view(["DELETE"])
def delete_news(request, news_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        news = Documentation.objects.get(id=news_id, type=DocumentationType.NEWS)
    except Documentation.DoesNotExist:
        return Response({"error": "Новость не найдена"}, status=status.HTTP_404_NOT_FOUND)

    log_action(user, "delete", news, {"news_id": news.id, "text": news.text})
    news.delete()
    return Response({"message": "Новость удалена"}, status=status.HTTP_200_OK)

# =========================================================
# DOCUMENTATION
# =========================================================

@api_view(["GET"])
def documentation_view(request):
    docs = Documentation.objects.filter(
        type=DocumentationType.REFERENCE
    ).order_by("-created_at")

    return Response([serialize_documentation(d) for d in docs])


@api_view(["POST"])
def create_documentation(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    title = request.data.get("title", "").strip()
    content = request.data.get("content", "").strip()

    if not title or not content:
        return Response({"error": "missing_fields"}, status=400)

    doc = Documentation.objects.create(
        type=DocumentationType.REFERENCE,
        admin=user,
        text=build_document_text(title, content),
    )

    log_action(user, "create", doc)

    return Response(serialize_documentation(doc), status=201)


@api_view(["PUT"])
def update_documentation(request, doc_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        doc = Documentation.objects.get(id=doc_id, type=DocumentationType.REFERENCE)
    except Documentation.DoesNotExist:
        return Response({"error": "Документация не найдена"}, status=status.HTTP_404_NOT_FOUND)

    title = (request.data.get("title") or "").strip()
    content = (request.data.get("content") or "").strip()
    category = (request.data.get("category") or "").strip()
    target_audience = request.data.get("target_audience") or doc.target_audience

    if not title or not content:
        return Response({"error": "title и content обязательны"}, status=status.HTTP_400_BAD_REQUEST)

    if target_audience not in ContentAudience.values:
        return Response({"error": "Некорректная аудитория"}, status=status.HTTP_400_BAD_REQUEST)

    doc.text = build_document_text(title, content, category)
    doc.target_audience = target_audience
    doc.save()
    log_action(user, "change", doc)
    return Response({"message": "Документация обновлена", "documentation": serialize_documentation(doc)}, status=status.HTTP_200_OK)

# =========================================================
# APP VERSIONS
# =========================================================

@api_view(["GET"])
def download_view(request):
    versions = AppVersion.objects.order_by("-created_at")
    return Response([serialize_app_version(v) for v in versions])


@api_view(["GET"])
def download_file(request, version_id):
    try:
        version = AppVersion.objects.get(id=version_id)
    except AppVersion.DoesNotExist:
        return Response({"error": "not_found"}, status=404)

    return FileResponse(
        version.file.open("rb"),
        as_attachment=True,
        filename=version.original_name
    )


@api_view(["POST"])
def create_version(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    file = request.FILES.get("file")
    if not file:
        return Response({"error": "file_required"}, status=400)

    version = AppVersion.objects.create(
        file=file,
        title=request.data.get("title"),
        content=request.data.get("content"),
        version=request.data.get("version"),
        platform=request.data.get("platform", "all"),
        file_size=file.size,
        original_name=file.name,
        created_by=user,
    )

    log_action(user, "create", version)

    return Response(serialize_app_version(version), status=201)


@api_view(["PUT", "DELETE"])
def update_version(request, version_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    try:
        version = AppVersion.objects.get(id=version_id)
    except AppVersion.DoesNotExist:
        return Response({"error": "not_found"}, status=404)

    if request.method == "DELETE":
        log_action(user, "delete", version)
        version.delete()
        return Response(status=204)

    for field in ["title", "content", "version", "platform"]:
        if field in request.data:
            setattr(version, field, request.data[field])

    if "file" in request.FILES:
        file = request.FILES["file"]
        version.file = file
        version.file_size = file.size
        version.original_name = file.name

    version.save()

    log_action(user, "update", version)

    return Response(serialize_app_version(version))


@api_view(["DELETE"])
def delete_version(request, version_id):
    """
    Удалить версию приложения.

    Доступно только admin приложения.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        app_version = AppVersion.objects.get(id=version_id)
    except AppVersion.DoesNotExist:
        return Response({"error": "Версия не найдена"}, status=status.HTTP_404_NOT_FOUND)

    log_action(
        user,
        "delete",
        app_version,
        {"app_version_id": app_version.id, "title": app_version.title, "version": app_version.version},
    )
    app_version.delete()

    return Response({"message": "Версия приложения удалена"}, status=status.HTTP_200_OK)

@api_view(["DELETE"])
def delete_documentation(request, doc_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    try:
        doc = Documentation.objects.get(id=doc_id, type=DocumentationType.REFERENCE)
    except Documentation.DoesNotExist:
        return Response({"error": "Документация не найдена"}, status=status.HTTP_404_NOT_FOUND)

    log_action(user, "delete", doc, {"documentation_id": doc.id, "text": doc.text})
    doc.delete()
    return Response({"message": "Документация удалена"}, status=status.HTTP_200_OK)