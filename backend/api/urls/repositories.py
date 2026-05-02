from django.urls import path

from api.repositories import get_repositories

from api.views.commits import create_commit
from api.views.repositories import revert_repository_to_commit, get_repository_commits, delete_repository_file, \
    get_repository_files, download_repository, get_repository, get_repository_detail, update_repository, \
    delete_repository, get_my_repositories, get_public_repositories, create_repository

urlpatterns = [
    path("", get_repositories),
    path("my/", get_my_repositories),
    path("public/", get_public_repositories),

    path("create/", create_repository),

    path("<int:repository_id>/", get_repository),
    path("<int:repository_id>/detail/", get_repository_detail),

    path("<int:repository_id>/update/", update_repository),
    path("<int:repository_id>/delete/", delete_repository),

    path("<int:repository_id>/download/", download_repository),

    path("<int:repository_id>/files/", get_repository_files),
    path("<int:repository_id>/files/delete/", delete_repository_file),

    path("<int:repository_id>/commits/", get_repository_commits),
    path("<int:repository_id>/commits/create/", create_commit),

    path("<int:repository_id>/commits/<int:commit_id>/revert/", revert_repository_to_commit, ),
]
