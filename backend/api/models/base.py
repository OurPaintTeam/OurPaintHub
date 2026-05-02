from django.core.exceptions import ValidationError
from django.db import models

MB = 1024 * 1024

def validate_5mb(file):
    if file.size > 5 * MB:
        raise ValidationError("Max file size is 5 MB")


def validate_50mb(file):
    if file.size > 50 * 1024 * 1024:
        raise ValidationError("Max file size is 50 MB")


def validate_500mb(file):
    if file.size > 500 * 1024 * 1024:
        raise ValidationError("Max file size is 500 MB")



# BASE MODEL

class TimeStampedModel(models.Model):
    """
    Базовая абстрактная модель для времени создания/обновления.

    Soft-delete не используется:
    - если сущность удаляется, она удаляется физически;
    - если удаляется Company, каскадом удаляются её участники и репозитории;
    - если удаляется Repository, каскадом удаляется его история, файлы и коммиты.
    """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
