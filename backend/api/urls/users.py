from django.urls import path
from api import views

urlpatterns = [
    path("", views.get_all_users),
    path("profile/", views.get_user_profile),
    path("profile/update/", views.update_user_profile),
    path("role/", views.check_user_role),
    path("<int:user_id>/profile/", views.get_public_user_profile),
]