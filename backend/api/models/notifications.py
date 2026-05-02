from django.db import models

from api.choices import NotificationStatus
from api.models.auth import User
from api.models.base import TimeStampedModel


class Notification(TimeStampedModel):
    """
    Уведомление пользователя.

    Состояния:
    - unread: новое уведомление;
    - read: пользователь прочитал;

    Удаление уведомления — физическое удаление строки из БД.
    """

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
    )
    title = models.CharField(max_length=255)
    text = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=NotificationStatus.choices,
        default=NotificationStatus.UNREAD,
        db_index=True,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["recipient", "status", "created_at"]),
            models.Index(fields=["recipient", "created_at"]),
        ]

    def mark_read(self):
        if self.status != NotificationStatus.READ:
            self.status = NotificationStatus.READ
            self.save(update_fields=["status", "updated_at"])

    def __str__(self):
        return self.title

