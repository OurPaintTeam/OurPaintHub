from django.urls import path
from . import views

urlpatterns = [
    path("registration/", views.register_user, name="register_user"),
    path("login/", views.login_user, name="login_user"),
    path("news/", views.news_view, name="news"),
    path("documentation/", views.documentation_view, name="documentation"),
    path("download/", views.download_view, name="download"),
    path("profile/", views.get_user_profile, name="get_user_profile"),
    path("profile/update/", views.update_user_profile, name="update_user_profile"),
    path("QA/", views.QA_view, name="QA"),
]