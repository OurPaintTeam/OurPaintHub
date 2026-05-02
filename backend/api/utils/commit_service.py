from api.models.commit import Commit, CommitFile
from api.models.content import FileBlob, File

from django.core.files.base import ContentFile
import hashlib
import mimetypes

from api.choices import CommitFileOperation
from api.utils.repository_service import build_commit_hash, get_latest_commit, get_current_repository_file_versions


def get_commit_snapshot_files(commit):
    repository = commit.repository

    commits = repository.commits.filter(
        id__lte=commit.id
    ).order_by("id")

    files_map = {}

    for c in commits:
        rows = CommitFile.objects.filter(
            commit=c
        ).select_related("blob", "file")

        for row in rows:
            if row.operation == CommitFileOperation.DELETED:
                files_map.pop(row.path, None)
            else:
                files_map[row.path] = row

    return list(files_map.values())

def _serialize_commit_file(commit_file, file_obj, blob=None):
    return {
        "file_id": file_obj.id,
        "commit_file_id": commit_file.id,
        "path": commit_file.path,
        "previous_path": commit_file.previous_path,
        "operation": commit_file.operation,
        "blob_id": blob.id if blob else None,
        "size": blob.size if blob else None,
        "sha256": blob.sha256 if blob else None,
        "download_url": (
            f"/api/commit-files/{commit_file.id}/download/"
            if blob else None
        ),
    }

def create_repository_commit(
    repository,
    user,
    message,
    uploaded_files=None,
    paths=None,
    delete_paths=None,
):
    uploaded_files = uploaded_files or []
    paths = paths or []
    delete_paths = delete_paths or []

    latest_commit = get_latest_commit(repository)
    current_file_versions = get_current_repository_file_versions(repository)

    commit = Commit.objects.create(
        repository=repository,
        created_by=user,
        message=message,
        parent=latest_commit,
        commit_hash=build_commit_hash(repository, user, message),
    )

    changed_files = []


    for delete_path in delete_paths:
        path = str(delete_path).strip()
        if not path:
            continue

        file_obj, _ = File.objects.get_or_create(repository=repository, path=path)

        commit_file = CommitFile.objects.create(
            commit=commit,
            file=file_obj,
            path=path,
            operation=CommitFileOperation.DELETED,
            blob=None,
        )

        changed_files.append(_serialize_commit_file(commit_file, file_obj))


    for index, uploaded_file in enumerate(uploaded_files):
        path = paths[index] if index < len(paths) and paths[index] else uploaded_file.name

        content = uploaded_file.read()
        sha256 = hashlib.sha256(content).hexdigest()
        mime_type, _ = mimetypes.guess_type(uploaded_file.name)

        file_obj, _ = File.objects.get_or_create(repository=repository, path=path)

        blob = FileBlob.objects.create(
            repository=repository,
            blob=ContentFile(content, name=uploaded_file.name),
            sha256=sha256,
            size=len(content),
            mime_type=mime_type,
            original_name=uploaded_file.name,
        )

        commit_file = CommitFile.objects.create(
            commit=commit,
            file=file_obj,
            path=path,
            operation=(
                CommitFileOperation.MODIFIED
                if path in current_file_versions
                else CommitFileOperation.ADDED
            ),
            blob=blob,
        )

        changed_files.append(_serialize_commit_file(commit_file, file_obj, blob))

    for index, uploaded_file in enumerate(uploaded_files):
        path = paths[index] if index < len(paths) and paths[index] else uploaded_file.name

        content = uploaded_file.read()
        sha256 = hashlib.sha256(content).hexdigest()
        mime_type, _ = mimetypes.guess_type(uploaded_file.name)

        file_obj, _ = File.objects.get_or_create(repository=repository, path=path)

        blob = FileBlob.objects.create(
            repository=repository,
            blob=ContentFile(content, name=uploaded_file.name),
            sha256=sha256,
            size=len(content),
            mime_type=mime_type,
            original_name=uploaded_file.name,
        )

        commit_file = CommitFile.objects.create(
            commit=commit,
            file=file_obj,
            path=path,
            operation=(
                CommitFileOperation.MODIFIED
                if path in current_file_versions
                else CommitFileOperation.ADDED
            ),
            blob=blob,
        )

        changed_files.append(_serialize_commit_file(commit_file, file_obj, blob))
    return commit, changed_files