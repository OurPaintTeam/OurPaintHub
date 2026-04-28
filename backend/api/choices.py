from django.db import models


class UserRole(models.TextChoices):
    """
    Роль пользователя в системе.

    В системе есть только две бизнес-роли:
    - USER: обычный пользователь;
    - ADMIN: администратор приложения.

    Это НЕ Django permissions.
    Для доступа в Django admin всё ещё используются is_staff/is_superuser.
    """

    USER = "user", "User"
    ADMIN = "admin", "Admin"


class RepositoryVisibility(models.TextChoices):
    """
    Видимость репозитория.

    Важно:
    visibility управляет только просмотром.
    Она НЕ даёт права редактировать или удалять репозиторий.
    """

    PRIVATE = "private", "Private"
    PUBLIC = "public", "Public"


class CommitFileOperation(models.TextChoices):
    """
    Тип изменения файла внутри коммита.

    ADDED: файл появился.
    MODIFIED: файл изменён.
    DELETED: файл удалён, blob должен быть пустым.
    RENAMED: файл переименован, previous_path хранит старый путь.
    """

    ADDED = "added", "Added"
    MODIFIED = "modified", "Modified"
    DELETED = "deleted", "Deleted"
    RENAMED = "renamed", "Renamed"


class EntityLogAction(models.TextChoices):
    """
    Тип действия для audit log.

    Можно расширять без PostgreSQL enum migration.
    """

    ADD = "add", "Add"
    CHANGE = "change", "Change"
    DELETE = "delete", "Delete"


class EntityLogEntityType(models.TextChoices):
    """
    Старый EntityLogTypeField заменён на choices.

    В новой архитектуре часть старых сущностей больше не используется:
    - role;
    - projects/project_meta/project_changes;
    - shared;
    - friendship.

    Вместо них:
    - company;
    - company_member;
    - repository;
    - file;
    - file_blob;
    - commit;
    - commit_file.
    """

    USER = "user", "User"
    USER_PROFILE = "user_profile", "User profile"
    COMPANY = "company", "Company"
    COMPANY_MEMBER = "company_member", "Company member"
    REPOSITORY = "repository", "Repository"
    FILE = "file", "File"
    FILE_BLOB = "file_blob", "File blob"
    COMMIT = "commit", "Commit"
    COMMIT_FILE = "commit_file", "Commit file"
    MEDIA_FILE = "media_file", "Media file"
    MEDIA_META = "media_meta", "Media meta"
    DOCUMENTATION = "documentation", "Documentation"
    FAQ = "faq", "FAQ"


class MediaFileType(models.TextChoices):
    """
    Тип медиа-файла.

    Можно использовать, если в MediaFile нужно отдельное поле file_type.
    Сейчас в models.py это поле не обязательно, потому что mime_type/расширение
    можно определять по самому файлу.
    """

    IMAGE = "image", "Image"
    VIDEO = "video", "Video"
    MARKDOWN = "md", "Markdown"
    INSTALLER = "installer", "Installer"
    DOCUMENT = "document", "Document"
    OTHER = "other", "Other"


class DocumentationType(models.TextChoices):
    """
    Тип документации.

    Замена старого DocumentationTypeField.
    """

    GUIDE = "guide", "Guide"
    REFERENCE = "reference", "Reference"
    API = "api", "API"
    NEWS = "news", "News"


class ContentAudience(models.TextChoices):
    """
    Аудитория контента.

    Замена старой Role-модели для FAQ/Documentation/News.
    """

    ALL = "all", "All users"
    USERS = "users", "Regular users"
    ADMINS = "admins", "Admins"


class NotificationStatus(models.TextChoices):
    """
    Состояние уведомления.

    UNREAD: пользователь ещё не прочитал уведомление.
    READ: пользователь прочитал уведомление.
    """

    UNREAD = "unread", "Unread"
    READ = "read", "Read"
