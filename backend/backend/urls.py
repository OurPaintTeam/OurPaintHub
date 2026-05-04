from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from api.views.content import (
    create_documentation,
    create_news,
    create_version,
    delete_documentation,
    delete_news,
    delete_version,
    documentation_view,
    download_file,
    download_view,
    news_view,
    update_documentation,
    update_news,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("api.urls.auth")),
    path("api/users/", include("api.urls.users")),
    path("api/companies/", include("api.urls.companies")),
    path("api/repositories/", include("api.urls.repositories")),
    path("api/notifications/", include("api.urls.notifications")),
    path("api/content/", include("api.urls.content")),
    path("api/faq/", include("api.urls.faq")),
    path("api/news/", news_view),
    path("api/news/create/", create_news),
    path("api/news/<int:news_id>/", update_news),
    path("api/news/<int:news_id>/delete/", delete_news),
    path("api/documentation/", documentation_view),
    path("api/documentation/create/", create_documentation),
    path("api/documentation/<int:doc_id>/", update_documentation),
    path("api/documentation/<int:doc_id>/delete/", delete_documentation),
    path("api/download/", download_view),
    path("api/download/create/", create_version),
    path("api/download/<int:version_id>/", download_file),
    path("api/download/<int:version_id>/delete/", delete_version),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
