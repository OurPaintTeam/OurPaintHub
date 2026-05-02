import hashlib
from django.utils import timezone
from django.core.files.base import ContentFile

from api.choices import CommitFileOperation
from api.models.commit import CommitFile

def get_latest_commit(repository):
    return repository.commits.order_by("-created_at", "-id").first()

def get_current_repository_file_versions(repository):
    current_files = {}

    commit_files = CommitFile.objects.filter(
        commit__repository=repository
    ).select_related("blob").order_by(
        "commit__created_at",
        "commit_id",
        "id",
    )

    for cf in commit_files:
        current_files[cf.path] = cf

    return {
        path: cf
        for path, cf in current_files.items()
        if cf.operation != CommitFileOperation.DELETED
    }

def get_current_repository_file_versions(repository):
    current_files = {}

    commit_files = CommitFile.objects.filter(
        commit__repository=repository
    ).select_related("blob").order_by(
        "commit__created_at",
        "commit_id",
        "id",
    )

    for cf in commit_files:
        current_files[cf.path] = cf

    return {
        path: cf
        for path, cf in current_files.items()
        if cf.operation != CommitFileOperation.DELETED
    }

def build_commit_hash(repository, user, message):
    raw = f"{repository.id}:{user.id}:{message}:{repository.commits.count()}:{timezone.now().timestamp()}"
    return hashlib.sha256(raw.encode()).hexdigest()

def sanitize_archive_path(path):
    parts = [
        p for p in str(path).replace("\\", "/").split("/")
        if p not in ("", ".", "..")
    ]
    return "/".join(parts) or "file"