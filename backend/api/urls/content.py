from django.urls import path

from api.views.content import download_view, create_version, download_file, update_version, news_view, create_news, \
    update_news, documentation_view, create_documentation, delete_version, delete_news, update_documentation, \
    delete_documentation

urlpatterns = [
    # Download / versions
    path("download/", download_view),
    path("download/create/", create_version),
    path("download/<int:version_id>/", download_file),
    path("download/<int:version_id>/update/", update_version),
    path("download/<int:version_id>/delete/", delete_version),

    # News
    path("news/", news_view),
    path("news/create/", create_news),
    path("news/<int:news_id>/", update_news),
    path("news/<int:news_id>/delete/", delete_news),

    # Documentation
    path("documentation/", documentation_view),
    path("documentation/create/", create_documentation),
    path("documentation/<int:doc_id>/", update_documentation),
    path("documentation/<int:doc_id>/delete/", delete_documentation),
]