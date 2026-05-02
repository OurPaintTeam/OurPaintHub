import time

from django.http import StreamingHttpResponse
from django.contrib.auth import get_user_model

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from api.models.notifications import Notification, NotificationStatus

from django.contrib.auth import get_user_model

from api.utils.auth_service import get_user_from_request_data, is_admin

User = get_user_model()

def notification_events(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    def stream():
        last_count = None

        while True:
            count = Notification.objects.filter(
                recipient=user,
                status=NotificationStatus.UNREAD,
            ).count()

            if count != last_count:
                last_count = count
                yield f"event: notifications_changed\ndata: {count}\n\n"

            time.sleep(5)

    response = StreamingHttpResponse(stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"

    return response


def serialize_notification(notification):
    return {
        "id": notification.id,
        "recipient_id": notification.recipient_id,
        "actor_id": notification.actor_id,
        "title": notification.title,
        "text": notification.text,
        "status": notification.status,
        "metadata": notification.metadata,
        "created_at": notification.created_at.isoformat(),
        "updated_at": notification.updated_at.isoformat(),
    }

@api_view(["GET"])
def get_notifications(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    status_filter = request.GET.get("status")

    notifications = Notification.objects.filter(recipient=user)

    if status_filter:
        if status_filter not in NotificationStatus.values:
            return Response(
                {"error": "invalid_status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notifications = notifications.filter(status=status_filter)

    notifications = notifications.order_by("-created_at")

    return Response(
        [serialize_notification(n) for n in notifications],
        status=status.HTTP_200_OK,
    )



@api_view(["GET"])
def get_notifications(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    status_filter = request.GET.get("status")

    notifications = Notification.objects.filter(recipient=user)

    if status_filter:
        if status_filter not in NotificationStatus.values:
            return Response(
                {"error": "invalid_status"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        notifications = notifications.filter(status=status_filter)

    notifications = notifications.order_by("-created_at")

    return Response(
        [serialize_notification(n) for n in notifications],
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
def create_notification(request):
    actor, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(actor):
        return Response({"error": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

    recipient_id = request.data.get("recipient_id")
    title = (request.data.get("title") or "").strip()
    text = (request.data.get("text") or "").strip()
    metadata = request.data.get("metadata") or {}

    if not recipient_id or not title:
        return Response(
            {"error": "recipient_id and title required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        recipient = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        return Response({"error": "user_not_found"}, status=status.HTTP_404_NOT_FOUND)

    notification = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        title=title,
        text=text,
        metadata=metadata,
    )

    return Response(
        {
            "message": "created",
            "notification": serialize_notification(notification),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def mark_notification_read(request, notification_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        notification = Notification.objects.get(
            id=notification_id,
            recipient=user,
        )
    except Notification.DoesNotExist:
        return Response({"error": "not_found"}, status=status.HTTP_404_NOT_FOUND)

    notification.mark_read()

    return Response(
        {
            "message": "read",
            "notification": serialize_notification(notification),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["DELETE"])
def delete_notification(request, notification_id):
    """
    Физически удалить уведомление из БД.
    """

    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        notification = Notification.objects.get(id=notification_id, recipient=user)
    except Notification.DoesNotExist:
        return Response({"error": "Уведомление не найдено"}, status=status.HTTP_404_NOT_FOUND)

    notification.delete()
    return Response({"message": "Уведомление удалено"}, status=status.HTTP_200_OK)