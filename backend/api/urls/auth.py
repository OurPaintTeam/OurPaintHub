from django.urls import path

from api.views.auth import (
    register_user,
    login_user,
    validate_token,
    refresh_token,
    logout_user,
)

urlpatterns = [
    path("registration/", register_user),
    path("login/", login_user),
    path("validate/", validate_token),
    path("refresh/", refresh_token),
    path("logout/", logout_user),
]