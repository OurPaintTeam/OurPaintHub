from django.urls import path

from api.views.users import get_all_users, get_user_profile, update_user_profile, check_user_role, \
    get_public_user_profile

urlpatterns = [
    path("", get_all_users),
    path("profile/", get_user_profile),
    path("profile/update/", update_user_profile),
    path("role/", check_user_role),
    path("<int:user_id>/profile/", get_public_user_profile),
]