from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

from api.models.base import TimeStampedModel

# ENTITY LOG
class EntityLog(TimeStampedModel):
    """
    Универсальный audit log.

    GenericForeignKey позволяет логировать любую модель.

    Важно:
    - связанные бизнес-объекты могут быть физически удалены;
    - после удаления entity может вернуть None;
    - поэтому важные данные нужно дублировать в metadata.
    """

    action = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(
        "api.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entity_logs",
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=64)
    entity = GenericForeignKey("content_type", "object_id")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["action"]),
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return self.action
