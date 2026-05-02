from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import transaction
from django.http import HttpResponse
from rest_framework import status
import os

from api.models.commit import Commit, CommitFile
from api.models.companies import can_edit_repository, can_view_repository
from api.models.repositories import Repository
from api.utils.auth_service import get_user_from_request_data
from api.utils.commit_service import get_commit_snapshot_files, create_repository_commit
from api.utils.logging_service import log_action
from api.utils.session import request_get_list


@api_view(["POST"])
def create_commit(request, repository_id):
    """
    Создать линейный commit.

    Request:
    - Authorization: Bearer <access_token>
    - message
    - files[] multipart, опционально
    - paths[] multipart, опционально

    Упрощение для MVP:
    каждый загруженный файл создаёт/обновляет File + CommitFile с operation added/modified.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        repository = Repository.objects.get(id=repository_id)
    except Repository.DoesNotExist:
        return Response({"error": "Репозиторий не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_edit_repository(user, repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    message = (request.data.get("message") or "").strip()
    if not message:
        return Response({"error": "Сообщение коммита обязательно"}, status=status.HTTP_400_BAD_REQUEST)

    uploaded_files = request.FILES.getlist("files")
    paths = request_get_list(request.data, "paths")
    delete_paths = request_get_list(request.data, "delete_paths")

    if not uploaded_files and not delete_paths:
        return Response({"error": "Нужно передать files или delete_paths"}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        commit, changed_files = create_repository_commit(
            repository=repository,
            user=user,
            message=message,
            uploaded_files=uploaded_files,
            paths=paths,
            delete_paths=delete_paths,
        )

    log_action(user, "add", commit)
    return Response(
        {
            "message": "Коммит создан",
            "repository": {
                "id": repository.id,
                "name": repository.name,
            },
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
def get_commit_files(request, commit_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        commit = Commit.objects.select_related("repository").get(id=commit_id)
    except Commit.DoesNotExist:
        return Response({"error": "Коммит не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, commit.repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    commit_files = commit.files.select_related("file", "blob").order_by("path")
    return Response(
        [
            {
                "id": commit_file.id,
                "path": commit_file.path,
                "previous_path": commit_file.previous_path,
                "operation": commit_file.operation,
                "file_id": commit_file.file_id,
                "blob_id": commit_file.blob_id,
                "size": commit_file.blob.size if commit_file.blob else None,
                "sha256": commit_file.blob.sha256 if commit_file.blob else None,
            }
            for commit_file in commit_files
        ],
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def download_commit_file(request, commit_file_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        commit_file = CommitFile.objects.select_related("commit__repository", "blob").get(id=commit_file_id)
    except CommitFile.DoesNotExist:
        return Response({"error": "Файл коммита не найден"}, status=status.HTTP_404_NOT_FOUND)

    if not can_view_repository(user, commit_file.commit.repository):
        return Response({"error": "Недостаточно прав"}, status=status.HTTP_403_FORBIDDEN)

    if not commit_file.blob:
        return Response({"error": "У этой операции нет файла для скачивания"}, status=status.HTTP_404_NOT_FOUND)

    file_handle = commit_file.blob.blob.open("rb")
    filename = commit_file.blob.original_name or os.path.basename(commit_file.path)
    mime_type = commit_file.blob.mime_type or "application/octet-stream"
    response = HttpResponse(file_handle.read(), content_type=mime_type)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@api_view(["GET"])
def get_commit_snapshot(request, commit_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        commit = Commit.objects.select_related("repository").get(id=commit_id)
    except Commit.DoesNotExist:
        return Response(
            {"error": "Коммит не найден"},
            status=status.HTTP_404_NOT_FOUND,
        )

    repository = commit.repository

    if not can_view_repository(user, repository):
        return Response(
            {"error": "Недостаточно прав"},
            status=status.HTTP_403_FORBIDDEN,
        )

    snapshot = get_commit_snapshot_files(commit)

    result = []

    for commit_file in snapshot:
        result.append(
            {
                "id": commit_file.file_id,
                "path": commit_file.path,
                "name": os.path.basename(commit_file.path),
                "commit_file_id": commit_file.id,
                "blob_id": commit_file.blob_id,
                "size": commit_file.blob.size if commit_file.blob else None,
                "sha256": commit_file.blob.sha256 if commit_file.blob else None,
                "download_url": f"/api/commit-files/{commit_file.id}/download/"
                if commit_file.blob_id
                else None,
            }
        )

    return Response(result, status=status.HTTP_200_OK)
