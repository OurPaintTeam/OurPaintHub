from django.contrib import admin
from django.urls import path, include
from api.views import health

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
]