from django.http import FileResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from api.models import (
    Documentation,
    AppVersion,
    DocumentationType,
)
from api.auth import get_user_from_request_data, is_admin
from api.utils import log_action


# =========================================================
# NEWS
# =========================================================

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