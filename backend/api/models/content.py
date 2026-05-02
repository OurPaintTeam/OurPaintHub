from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

from api.choices import DocumentationType, ContentAudience
from api.models.auth import User
from api.models.base import TimeStampedModel, validate_50mb, validate_500mb
from api.models.repositories import Repository


# FILES AND BLOBS

class File(TimeStampedModel):
    """
    Логический файл внутри репозитория.

    Хранит путь, но не хранит содержимое.
    Содержимое лежит в FileBlob и привязывается к конкретному CommitFile.
    """

    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="files")
    path = models.CharField(max_length=512, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["repository", "path"], name="unique_file_path_in_repository"),
        ]
        indexes = [
            models.Index(fields=["repository", "path"]),
        ]

    @property
    def name(self):
        return self.path.rsplit("/", 1)[-1]

    def __str__(self):
        return self.path


class FileBlob(TimeStampedModel):
    """
    Физическое содержимое файла.

    Это замена BinaryField/file_url:
    - файл хранится через Django storage;
    - sha256 нужен для проверки целостности;
    - size/mime_type полезны для API/UI.

    Привязан к Repository, чтобы blob-ы удалялись каскадом вместе с проектом.
    """

    repository = models.ForeignKey(Repository, on_delete=models.CASCADE, related_name="blobs")
    blob = models.FileField(
        upload_to="repository_blobs/",
        validators=[validate_50mb]
    )
    sha256 = models.CharField(max_length=64, db_index=True)
    size = models.PositiveBigIntegerField()
    mime_type = models.CharField(max_length=255, null=True, blank=True)
    original_name = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["repository", "sha256"]),
            models.Index(fields=["sha256"]),
        ]

    def __str__(self):
        return self.sha256




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
        User,
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



# MEDIA FILES

class MediaFile(TimeStampedModel):
    """
    Медиа-файл: изображение, видео, документ и т.д.

    Удаляется физически.
    """

    file = models.FileField(upload_to="media/")
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_media_files",
    )

    def __str__(self):
        return self.file.name


class MediaMeta(TimeStampedModel):
    """
    Метаданные медиа.

    Управляется администраторами приложения.
    Удаляется физически.
    """

    admin = models.ForeignKey(User, on_delete=models.PROTECT, related_name="managed_media_meta")
    media = models.OneToOneField(MediaFile, on_delete=models.CASCADE, related_name="meta")
    description = models.TextField(null=True, blank=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name



# APP VERSIONS / DOWNLOADS

class AppVersion(TimeStampedModel):
    """
    Версия приложения для download-раздела.

    Это отдельная бизнес-сущность, а не MediaMeta JSON:
    - список версий приложения публичный;
    - скачивание файла публичное;
    - создавать/редактировать/удалять версии может только admin приложения.
    """

    file = models.FileField(
        upload_to="app_versions/",
        validators=[validate_500mb]
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    version = models.CharField(max_length=50, db_index=True)
    platform = models.CharField(max_length=100, default="all", db_index=True)
    file_size = models.PositiveBigIntegerField()
    original_name = models.CharField(max_length=255)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_app_versions")

    class Meta:
        indexes = [
            models.Index(fields=["version"]),
            models.Index(fields=["platform"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.title} {self.version}"



# DOCUMENTATION

class Documentation(TimeStampedModel):
    """
    Документация/новости/справочные материалы.

    Управляется администраторами приложения.
    Удаляется физически.
    """

    type = models.CharField(
        max_length=20,
        choices=DocumentationType.choices,
        default=DocumentationType.GUIDE,
        db_index=True,
    )
    admin = models.ForeignKey(User, on_delete=models.PROTECT, related_name="documentation_items")
    target_audience = models.CharField(
        max_length=20,
        choices=ContentAudience.choices,
        default=ContentAudience.ALL,
        db_index=True,
    )
    text = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["type"]),
            models.Index(fields=["target_audience"]),
        ]

    def __str__(self):
        return self.type



# FAQ

class FAQ(TimeStampedModel):
    """
    FAQ: вопрос-ответ система.

    Пользователь задаёт вопрос, администратор отвечает.
    Удаляется физически.
    """

    text_question = models.TextField()
    answered = models.BooleanField(default=False, db_index=True)
    answer_text = models.TextField(null=True, blank=True)
    target_audience = models.CharField(
        max_length=20,
        choices=ContentAudience.choices,
        default=ContentAudience.ALL,
        db_index=True,
    )
    questioner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="faq_questions")
    answerer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="faq_answers",
    )

    class Meta:
        indexes = [
            models.Index(fields=["answered"]),
            models.Index(fields=["target_audience"]),
            models.Index(fields=["questioner", "created_at"]),
        ]

    def __str__(self):
        return self.text_question[:80]
