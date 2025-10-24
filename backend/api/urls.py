from django.urls import path
from . import views

urlpatterns = [
    path("registration/", views.register_user, name="register_user"),
    path("login/", views.login_user, name="login_user"),
    path("news/", views.news_view, name="news"),
    path("news/create/", views.create_news, name="create_news"),
    path("news/<int:news_id>/", views.update_news, name="update_news"),
    path("news/<int:news_id>/delete/", views.delete_news, name="delete_news"),
    path("documentation/", views.documentation_view, name="documentation"),
    path("download/", views.download_view, name="download"),
    path("profile/", views.get_user_profile, name="get_user_profile"),
    path("profile/update/", views.update_user_profile, name="update_user_profile"),
    path("user/role/", views.check_user_role, name="check_user_role"),
    path("QA/", views.QA_view, name="QA"),
    path("project/add/<int:user_id>/", views.add_project, name="add_project"),
    path("project/delete/<int:project_id>/", views.delete_project, name="delete_project"),
    path("project/change/<int:project_id>/", views.change_project, name="change_project"),
    path("project/download/<int:project_id>/", views.download_project, name="download_project"),
]