from django.urls import path
from api.views.notifications import (
    get_notifications,
    create_notification,
    notification_events,
    mark_notification_read,
    delete_notification,
)

urlpatterns = [
    path("", get_notifications),
    path("list/", get_notifications),
    path("create/", create_notification),
    path("events/", notification_events),

    path("<int:notification_id>/read/", mark_notification_read),
    path("<int:notification_id>/delete/", delete_notification),
]
