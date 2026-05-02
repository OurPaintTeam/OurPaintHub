from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
import os
import io
from django.core.files.base import ContentFile
from django.utils import timezone
from django.db import transaction
from django.http import HttpResponse
import zipfile

from api.choices import CommitFileOperation, RepositoryVisibility
from api.models.companies import can_view_repository, can_edit_repository, can_delete_repository, \
    can_create_company_repository, Company
from api.models.content import File, FileBlob
from api.models.commit import CommitFile, Commit
from api.models.repositories import Repository
from api.utils.auth_service import get_user_from_request_data
from api.utils.commit_service import create_repository_commit
from api.utils.logging_service import log_action
from api.utils.repository_service import get_current_repository_file_versions, sanitize_archive_path, build_commit_hash, \
    get_latest_commit
from api.utils.serializers import serialize_repository
from api.utils.session import request_get_list


# =========================================================
# REPOSITORIES
# =========================================================
@api_view(["GET"])
def get_repositories(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    repositories = Repository.objects.filter(
        Q(visibility=RepositoryVisibility.PUBLIC)
        | Q(owner_user=user)
        | Q(owner_company__owner=user)
        | Q(owner_company__members__user=user)
    ).distinct().order_by("name")

    return Response([serialize_repository(repository, user) for repository in repositories], status=status.HTTP_200_OK)


@api_view(["GET"])
def get_my_repositories(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    repositories = Repository.objects.filter(owner_user=user).order_by("name")
    return Response([serialize_repository(repository, user) for repository in repositories], status=status.HTTP_200_OK)


@api_view(["GET"])
def get_public_repositories(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    repositories = Repository.objects.filter(visibility=RepositoryVisibility.PUBLIC).order_by("name")
    return Response([serialize_repository(repository, user) for repository in repositories], status=status.HTTP_200_OK)


@api_view(["POST"])
def create_repository(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    name = (request.data.get("name") or "").strip()
    description = (request.data.get("description") or "").strip()
    visibility = request.data.get("visibility") or RepositoryVisibility.PRIVATE
    owner_company_id = request.data.get("company_id")

    if not name:
        return Response({"error": "Название репозитория обязательно"}, status=status.HTTP_400_BAD_REQUEST)

    if visibility not in RepositoryVisibility.values:
        return Response({"error": "Некорректная видимость репозитория"}, status=status.HTTP_400_BAD_REQUEST)

    if owner_company_id:
        try:
            company = Company.objects.get(id=owner_company_id)
        except Company.DoesNotExist:
            return Response({"error": "Компания не найдена"}, status=status.HTTP_404_NOT_FOUND)

        if not can_create_company_repository(user, company):
            return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

        repository = Repository.objects.create(
            owner_company=company,
            created_by=user,
            name=name,
            description=description,
            visibility=visibility,
        )
    else:
        repository = Repository.objects.create(
            owner_user=user,
            created_by=user,
            name=name,
            description=description,
            visibility=visibility,
        )

    changed_files = []
    uploaded_files = request.FILES.getlist("files")
    if uploaded_files:
        message = (request.data.get("message") or "Первый коммит").strip()
        if not message:
            message = "Первый коммит"
        paths = request_get_list(request.data, "paths")
        with transaction.atomic():
            commit, changed_files = create_repository_commit(
                repository=repository,
                user=user,
                message=message,
                uploaded_files=uploaded_files,
                paths=paths,
            )
        log_action(user, "add", commit)

    log_action(user, "add", repository)
    return Response(
        {
            "message": "Репозиторий создан",
            "repository": serialize_repository(repository, user),
            "files": changed_files,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def get_repository(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    return Response(serialize_repository(repository, user), status=status.HTTP_200_OK)


@api_view(["PUT"])
def update_repository(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_edit_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    if "name" in request.data:
        repository.name = request.data.get("name")
    if "description" in request.data:
        repository.description = request.data.get("description")
    if "visibility" in request.data:
        visibility = request.data.get("visibility")
        if visibility not in RepositoryVisibility.values:
            return Response({"error": "Некорректная видимость репозитория"}, status=status.HTTP_400_BAD_REQUEST)
        repository.visibility = visibility

    repository.save()
    log_action(user, "change", repository)
    return Response(
        {"message": "Репозиторий обновлён", "repository": serialize_repository(repository, user)},
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
def delete_repository(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_delete_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    log_action(
        user,
        "delete",
        repository,
        {
            "repository_id": repository.id,
            "name": repository.name,
            "owner_user_id": repository.owner_user_id,
            "owner_company_id": repository.owner_company_id,
        },
    )
    repository.delete()
    return Response({"message": "Репозиторий удалён"}, status=status.HTTP_200_OK)


@api_view(["GET"])
def get_repository_files(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    current_versions = get_current_repository_file_versions(repository)
    return Response(
        [
            {
                "id": commit_file.file_id,
                "path": path,
                "name": os.path.basename(path),
                "commit_file_id": commit_file.id,
                "blob_id": commit_file.blob_id,
                "size": commit_file.blob.size if commit_file.blob else None,
                "sha256": commit_file.blob.sha256 if commit_file.blob else None,
                "download_url": f"/api/commit-files/{commit_file.id}/download/" if commit_file.blob_id else None,
            }
            for path, commit_file in sorted(current_versions.items())
        ],
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def get_repository_detail(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    current_versions = get_current_repository_file_versions(repository)
    commits = repository.commits.select_related("created_by").order_by("-created_at", "-id")

    return Response(
        {
            "repository": serialize_repository(repository, user),
            "files": [
                {
                    "id": commit_file.file_id,
                    "path": path,
                    "name": os.path.basename(path),
                    "commit_file_id": commit_file.id,
                    "blob_id": commit_file.blob_id,
                    "size": commit_file.blob.size if commit_file.blob else None,
                    "sha256": commit_file.blob.sha256 if commit_file.blob else None,
                    "download_url": f"/api/commit-files/{commit_file.id}/download/" if commit_file.blob_id else None,
                }
                for path, commit_file in sorted(current_versions.items())
            ],
            "commits": [
                {
                    "id": commit.id,
                    "message": commit.message,
                    "commit_hash": commit.commit_hash,
                    "parent_id": commit.parent_id,
                    "created_by_id": commit.created_by_id,
                    "created_by_username": commit.created_by.username,
                    "created_at": commit.created_at.isoformat(),
                }
                for commit in commits
            ],
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def get_repository_commits(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    commits = repository.commits.select_related("created_by").order_by("-created_at")
    return Response(
        [
            {
                "id": commit.id,
                "message": commit.message,
                "commit_hash": commit.commit_hash,
                "parent_id": commit.parent_id,
                "created_by_id": commit.created_by_id,
                "created_by_username": commit.created_by.username,
                "created_at": commit.created_at.isoformat(),
            }
            for commit in commits
        ],
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def delete_repository_file(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_edit_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    path = (request.data.get("path") or "").strip()
    if not path:
        return Response({"error": "path обязателен"}, status=status.HTTP_400_BAD_REQUEST)

    if path not in get_current_repository_file_versions(repository):
        return Response({"error": "Файл не найден"}, status=status.HTTP_404_NOT_FOUND)

    message = (request.data.get("message") or f"Удалён файл {path}").strip()
    with transaction.atomic():
        commit, changed_files = create_repository_commit(
            repository=repository,
            user=user,
            message=message,
            delete_paths=[path],
        )

    log_action(user, "delete", commit, {"path": path})
    return Response(
        {
            "message": "Файл удалён",
            "commit": {
                "id": commit.id,
                "hash": commit.commit_hash,
                "message": commit.message,
                "parent_id": commit.parent_id,
                "created_by_id": commit.created_by_id,
                "created_at": commit.created_at.isoformat(),
            },
            "files": changed_files,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
def download_repository(request, repository_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    current_versions = get_current_repository_file_versions(repository)
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for path, commit_file in current_versions.items():
            if not commit_file.blob:
                continue
            with commit_file.blob.blob.open("rb") as file_handle:
                archive.writestr(sanitize_archive_path(path), file_handle.read())

    buffer.seek(0)
    filename = f"{repository.name}.zip"
    response = HttpResponse(buffer.getvalue(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["POST"])
def revert_repository_to_commit(request, repository_id, commit_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    repository = Repository.objects.get(id=repository_id)
    target_commit = Commit.objects.get(id=commit_id, repository=repository)

    message = (
            request.data.get("message")
            or f"Откат к коммиту {target_commit.commit_hash[:12]}"
    ).strip()

    with transaction.atomic():

        new_commit = Commit.objects.create(
            repository=repository,
            created_by=user,
            message=message,
            parent=get_latest_commit(repository),
            commit_hash=build_commit_hash(repository, user, message),
        )

        # состояние target commit
        target_files = {
            f.path: f
            for f in get_commit_snapshot_files(target_commit)
            if f.operation != CommitFileOperation.DELETED
        }

        # текущее состояние HEAD
        current_files = get_current_repository_file_versions(repository)

        # ------------------------
        # 1. удаляем лишние файлы
        # ------------------------
        for path in current_files.keys():
            if path not in target_files:
                file_obj = current_files[path].file

                CommitFile.objects.create(
                    commit=new_commit,
                    file=file_obj,
                    path=path,
                    operation=CommitFileOperation.DELETED,
                    blob=None,
                )

        # ------------------------
        # 2. восстанавливаем нужные
        # ------------------------
        for path, f in target_files.items():
            file_obj, _ = File.objects.get_or_create(
                repository=repository,
                path=path
            )

            CommitFile.objects.create(
                commit=new_commit,
                file=file_obj,
                path=path,
                operation=CommitFileOperation.MODIFIED,
                blob=f.blob,
            )

    return Response({"message": "OK"})
