from django.urls import path

from . import views


urlpatterns = [
    # Auth / users
    path("registration/", views.register_user, name="register_user"),
    path("login/", views.login_user, name="login_user"),
    path("validate/", views.validate_token, name="validate_token"),
    path("refresh/", views.refresh_token, name="refresh_token"),
    path("logout/", views.logout_user, name="logout_user"),
    path("checkDB/", views.check_db, name="check_db"),
    path("users/", views.get_all_users, name="get_all_users"),
    path("user/role/", views.check_user_role, name="check_user_role"),
    path("profile/", views.get_user_profile, name="get_user_profile"),
    path("profile/update/", views.update_user_profile, name="update_user_profile"),

    # Download / app versions
    path("download/", views.download_view, name="download"),
    path("download/create/", views.create_version, name="create_version"),
    path("download/<int:version_id>/", views.download_file, name="download_file"),
    path("download/<int:version_id>/update/", views.update_version, name="update_version"),
    path("download/<int:version_id>/delete/", views.delete_version, name="delete_version"),

    # Notifications
    path("notifications/", views.get_notifications, name="get_notifications"),
    path("notifications/create/", views.create_notification, name="create_notification"),
    path("notifications/events/", views.notification_events, name="notification_events"),
    path("notifications/<int:notification_id>/read/", views.mark_notification_read, name="mark_notification_read"),
    path("notifications/<int:notification_id>/delete/", views.delete_notification, name="delete_notification"),

    # Companies
    path("companies/", views.get_companies, name="get_companies"),
    path("companies/create/", views.create_company, name="create_company"),
    path("companies/<int:company_id>/", views.update_company, name="update_company"),
    path("companies/<int:company_id>/delete/", views.delete_company, name="delete_company"),
    path("companies/<int:company_id>/members/", views.get_company_members, name="get_company_members"),
    path("companies/<int:company_id>/members/add/", views.add_company_member, name="add_company_member"),
    path("companies/<int:company_id>/members/remove/", views.remove_company_member, name="remove_company_member"),

    # Repositories
    path("repositories/", views.get_repositories, name="get_repositories"),
    path("repositories/create/", views.create_repository, name="create_repository"),
    path("repositories/<int:repository_id>/", views.get_repository, name="get_repository"),
    path("repositories/<int:repository_id>/update/", views.update_repository, name="update_repository"),
    path("repositories/<int:repository_id>/delete/", views.delete_repository, name="delete_repository"),

    # Repository files / commits
    path("repositories/<int:repository_id>/files/", views.get_repository_files, name="get_repository_files"),
    path("repositories/<int:repository_id>/commits/", views.get_repository_commits, name="get_repository_commits"),
    path("repositories/<int:repository_id>/commits/create/", views.create_commit, name="create_commit"),
    path("commits/<int:commit_id>/files/", views.get_commit_files, name="get_commit_files"),
    path("commit-files/<int:commit_file_id>/download/", views.download_commit_file, name="download_commit_file"),

    # News / documentation
    path("news/", views.news_view, name="news"),
    path("news/create/", views.create_news, name="create_news"),
    path("news/<int:news_id>/", views.update_news, name="update_news"),
    path("news/<int:news_id>/delete/", views.delete_news, name="delete_news"),
    path("documentation/", views.documentation_view, name="documentation"),
    path("documentation/create/", views.create_documentation, name="create_documentation"),
    path("documentation/<int:doc_id>/", views.update_documentation, name="update_documentation"),
    path("documentation/<int:doc_id>/delete/", views.delete_documentation, name="delete_documentation"),

    # FAQ
    path("QA/", views.get_QA_list, name="QA_list"),
    path("QA/answered/", views.get_answered_QA_list, name="QA_answered_list"),
    path("QA/unanswered/", views.get_unanswered_QA_list, name="QA_unanswered_list"),
    path("QA/create/", views.create_QA, name="QA_create"),
    path("QA/<int:qa_id>/answer/", views.answer_QA, name="answer_QA"),
    path("QA/<int:qa_id>/delete/", views.delete_QA, name="delete_QA"),
]
