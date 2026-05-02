from django.contrib import admin
from django.urls import path, include
from api.views.base import health
from api.views.commits import download_commit_file, get_commit_files, get_commit_snapshot

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/health/", health),
    path("api/auth/", include("api.urls.auth")),
    path("api/users/", include("api.urls.users")),
    path("api/companies/", include("api.urls.companies")),
    path("api/repositories/", include("api.urls.repositories")),
    path("api/notifications/", include("api.urls.notifications")),
    path("api/content/", include("api.urls.content")),
    path("api/faq/", include("api.urls.faq")),
    path("api/commits/<int:commit_id>/files/", get_commit_files),
    path("api/commits/<int:commit_id>/snapshot/", get_commit_snapshot),
    path("api/commit-files/<int:commit_file_id>/download/", download_commit_file),
]
