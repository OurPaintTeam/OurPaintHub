from django.urls import path
from api import views

urlpatterns = [
    # Download / versions
    path("download/", views.download_view),
    path("download/create/", views.create_version),
    path("download/<int:version_id>/", views.download_file),
    path("download/<int:version_id>/update/", views.update_version),
    path("download/<int:version_id>/delete/", views.delete_version),

    # News
    path("news/", views.news_view),
    path("news/create/", views.create_news),
    path("news/<int:news_id>/", views.update_news),
    path("news/<int:news_id>/delete/", views.delete_news),

    # Documentation
    path("documentation/", views.documentation_view),
    path("documentation/create/", views.create_documentation),
    path("documentation/<int:doc_id>/", views.update_documentation),
    path("documentation/<int:doc_id>/delete/", views.delete_documentation),
]