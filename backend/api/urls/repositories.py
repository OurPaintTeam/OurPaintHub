from django.urls import path
from api import views

urlpatterns = [
    path("", views.get_repositories),
    path("my/", views.get_my_repositories),
    path("public/", views.get_public_repositories),

    path("create/", views.create_repository),

    path("<int:repository_id>/", views.get_repository),
    path("<int:repository_id>/detail/", views.get_repository_detail),

    path("<int:repository_id>/update/", views.update_repository),
    path("<int:repository_id>/delete/", views.delete_repository),

    path("<int:repository_id>/download/", views.download_repository),

    path("<int:repository_id>/files/", views.get_repository_files),
    path("<int:repository_id>/files/delete/", views.delete_repository_file),

    path("<int:repository_id>/commits/", views.get_repository_commits),
    path("<int:repository_id>/commits/create/", views.create_commit),

    path("<int:repository_id>/commits/<int:commit_id>/revert/",views.revert_repository_to_commit,),
]