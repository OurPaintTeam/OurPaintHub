from django.urls import path

from api.views.users import get_all_users, get_user_profile, update_user_profile, check_user_role, \
    get_public_user_profile, search_users

urlpatterns = [
    path("list/", get_all_users),
    path("profile/", get_user_profile),
    path("profile/update/", update_user_profile),
    path("role/", check_user_role),
    path("profile/<int:user_id>/", get_public_user_profile),

    path("search/", search_users),
]
