from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.core.exceptions import ValidationError
from django.db import transaction

from .choices import (
    CommitFileOperation,
    ContentAudience,
    DocumentationType,
    NotificationStatus,
    RepositoryVisibility,
    UserRole,
    CompanyInviteStatus
)

def validate_5mb(file):
    if file.size > 5 * 1024 * 1024:
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



# USER

class UserManager(DjangoUserManager):
    """
    Manager пользователя.

    Нормализует username/email:
    - username хранится в lowercase;
    - email хранится в lowercase;
    - обычный user получает role=user;
    - superuser автоматически получает role=admin, is_staff=True, is_superuser=True.
    """

    def _normalize_username_email(self, username, email):
        username = username.lower().strip() if username else username
        email = self.normalize_email(email).lower().strip() if email else email
        return username, email

    def create_user(self, username, email=None, password=None, **extra_fields):
        username, email = self._normalize_username_email(username, email)
        extra_fields.setdefault("role", UserRole.USER)
        return super().create_user(username=username, email=email, password=password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        username, email = self._normalize_username_email(username, email)
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return super().create_superuser(username=username, email=email, password=password, **extra_fields)


class User(AbstractUser):
    """
    Основной пользователь системы.

    Правила:
    - username обязателен и уникален;
    - email обязателен и уникален;
    - first_name/last_name необязательные;
    - date_of_birth хранится в UserProfile и необязательна;
    - бизнес-роли только две: user/admin;
    - вход можно делать по username или email на уровне auth backend/serializer.

    Важно:
    - role отвечает за бизнес-логику приложения;
    - is_staff отвечает за доступ в Django admin;
    - is_superuser отвечает за полные Django permissions.
    """

    username = models.CharField(max_length=150, unique=True, db_index=True)
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.USER,
        db_index=True,
    )

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    objects = UserManager()

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("username"), name="unique_lower_username"),
            models.UniqueConstraint(Lower("email"), name="unique_lower_email"),
        ]

    def save(self, *args, **kwargs):
        if self.username:
            self.username = self.username.lower().strip()
        if self.email:
            self.email = User.objects.normalize_email(self.email).lower().strip()
        super().save(*args, **kwargs)

    @property
    def is_app_admin(self):
        return self.role == UserRole.ADMIN


class UserProfile(TimeStampedModel):
    """
    Дополнительные данные пользователя.

    User отвечает за авторизацию.
    UserProfile хранит необязательные профильные данные.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.user.username


class AuthRefreshSession(TimeStampedModel):
    """
    Backend refresh-сессия.

    Frontend хранит только access_token.
    Refresh token не отдаётся в JSON и хранится у клиента только в HttpOnly cookie.
    В БД хранится hash refresh token, а не сам token.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="refresh_sessions")
    token_hash = models.CharField(max_length=128, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "expires_at"]),
            models.Index(fields=["token_hash"]),
        ]

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_at > timezone.now()

    def revoke(self):
        if self.revoked_at is None:
            self.revoked_at = timezone.now()
            self.save(update_fields=["revoked_at", "updated_at"])

    def __str__(self):
        return f"refresh session for {self.user.username}"


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



# COMPANY

class Company(TimeStampedModel):
    """
    Компания — организация/пространство.

    Правила:
    - у компании всегда есть owner;
    - только owner управляет названием, описанием, участниками и удалением компании;
    - участники компании равны в работе над репозиториями;
    - любой участник может создать repository внутри компании;
    - удалить company repository может только owner компании.

    Удаление:
    - Company удаляется физически;
    - CompanyMember удаляются каскадом;
    - Repository компании удаляются каскадом;
    - история репозиториев компании тоже удаляется каскадом.
    """

    owner = models.ForeignKey(
        "User",
        on_delete=models.CASCADE,
        related_name="owned_companies"
    )

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(null=True, blank=True)

    logo = models.ImageField(
        upload_to="companies/logos/",
        null=True,
        blank=True,
        validators=[validate_5mb]
    )

    cover = models.ImageField(
        upload_to="companies/covers/",
        null=True,
        blank=True,
        validators=[validate_5mb]
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                name="unique_company_name_ci"
            )
        ]

    def __str__(self):
        return self.name


class CompanyMember(TimeStampedModel):
    """
    Участник компании.

    Ролей внутри компании нет:
    - owner хранится в Company.owner;
    - остальные участники равны для работы с repository;
    - управление компанией остаётся только у owner.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE
    )

    user = models.ForeignKey(
        "User",
        on_delete=models.CASCADE
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "user"],
                name="unique_company_member"
            )
        ]



class CompanyInvite(TimeStampedModel):
    """
    Приглашение пользователя в компанию.

    Логика:
    - нельзя приглашать owner компании;
    - нельзя приглашать действующего участника;
    - нельзя создать второй pending invite;
    - accept добавляет пользователя в компанию;
    - reject/cancel отправляют уведомления инициатору;
    - защита от race condition через select_for_update;
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="invites"
    )

    invited_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="company_invites"
    )

    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_company_invites"
    )

    status = models.CharField(
        max_length=20,
        choices=CompanyInviteStatus.choices,
        default=CompanyInviteStatus.PENDING,
        db_index=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["company", "invited_user"],
                condition=models.Q(status=CompanyInviteStatus.PENDING),
                name="unique_pending_company_invite"
            )
        ]

        indexes = [
            models.Index(fields=["company", "invited_user"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        if self.company.owner_id == self.invited_user_id:
            raise ValidationError("Owner cannot be invited.")

        if CompanyMember.objects.filter(
                company=self.company,
                user=self.invited_user
        ).exists():
            raise ValidationError("User is already a member.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @transaction.atomic
    def accept(self, user):
        invite = CompanyInvite.objects.select_for_update().get(pk=self.pk)

        if invite.invited_user_id != user.id:
            raise ValidationError("You cannot accept this invite.")

        if invite.status != CompanyInviteStatus.PENDING:
            raise ValidationError("Invite is no longer active.")

        CompanyMember.objects.get_or_create(
            company=invite.company,
            user=invite.invited_user
        )

        invite.status = CompanyInviteStatus.ACCEPTED
        invite.save(update_fields=["status", "updated_at"])

        if invite.invited_by:
            Notification.objects.create(
                recipient=invite.invited_by,
                actor=invite.invited_user,
                title="Invitation accepted",
                text=f"{invite.invited_user.username} joined {invite.company.name}.",
            )

    @transaction.atomic
    def reject(self, user):
        invite = CompanyInvite.objects.select_for_update().get(pk=self.pk)

        if invite.invited_user_id != user.id:
            raise ValidationError("You cannot reject this invite.")

        if invite.status != CompanyInviteStatus.PENDING:
            raise ValidationError("Invite is no longer active.")

        invite.status = CompanyInviteStatus.REJECTED
        invite.save(update_fields=["status", "updated_at"])

        if invite.invited_by:
            Notification.objects.create(
                recipient=invite.invited_by,
                actor=invite.invited_user,
                title="Invitation declined",
                text=f"{invite.invited_user.username} declined invitation to {invite.company.name}.",
            )

    @transaction.atomic
    def cancel(self, user):
        invite = CompanyInvite.objects.select_for_update().get(pk=self.pk)

        if invite.invited_by_id != user.id and invite.company.owner_id != user.id:
            raise ValidationError("You cannot cancel this invite.")

        if invite.status != CompanyInviteStatus.PENDING:
            raise ValidationError("Invite is no longer active.")

        invite.status = CompanyInviteStatus.CANCELLED
        invite.save(update_fields=["status", "updated_at"])

    def __str__(self):
        return f"{self.invited_user.username} -> {self.company.name} ({self.status})"


# REPOSITORY

class Repository(TimeStampedModel):
    """
    Репозиторий проекта.

    Репозиторий принадлежит ровно одному владельцу:
    - либо owner_user;
    - либо owner_company.

    Visibility отвечает только за просмотр:
    - public видят все авторизованные пользователи;
    - private видит owner_user или участники компании.

    Редактирование:
    - personal repo редактирует только owner_user;
    - company repo редактируют участники компании.

    Удаление:
    - personal repo удаляет owner_user;
    - company repo удаляет owner компании;
    - repository удаляется физически вместе с файлами, blob-ами и коммитами.
    """

    owner_user = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repositories"
    )

    owner_company = models.ForeignKey(
        Company,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="repositories"
    )

    created_by = models.ForeignKey(
        "User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_repositories"
    )

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(null=True, blank=True)
    visibility = models.CharField(
        max_length=20,
        choices=RepositoryVisibility.choices,
        default=RepositoryVisibility.PRIVATE,
        db_index=True,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="repository_has_exactly_one_owner",
                check=(
                        Q(owner_user__isnull=False, owner_company__isnull=True)
                        | Q(owner_user__isnull=True, owner_company__isnull=False)
                ),
            ),
            models.UniqueConstraint(
                Lower("name"),
                "owner_user",
                condition=Q(owner_user__isnull=False),
                name="unique_personal_repo_ci"
            ),
            models.UniqueConstraint(
                Lower("name"),
                "owner_company",
                condition=Q(owner_company__isnull=False),
                name="unique_company_repo_ci"
            ),
        ]
        indexes = [
            models.Index(fields=["visibility"]),
            models.Index(fields=["owner_user", "visibility"]),
            models.Index(fields=["owner_company", "visibility"]),
            models.Index(fields=["name"]),
        ]

    @property
    def is_personal(self):
        return self.owner_user_id is not None

    @property
    def is_company_repository(self):
        return self.owner_company_id is not None

    def clean(self):
        super().clean()
        has_user_owner = self.owner_user_id is not None
        has_company_owner = self.owner_company_id is not None

        if has_user_owner == has_company_owner:
            raise ValidationError("Repository must have exactly one owner: user or company.")

    def __str__(self):
        return self.name



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



class Commit(TimeStampedModel):
    """
    Коммит — неизменяемый снимок изменения репозитория.

    История линейная:
    - у коммита максимум один parent;
    - старый коммит нельзя обновлять;
    - отдельного удаления коммита в API быть не должно;
    - при удалении Repository коммиты удаляются каскадом.
    """

    repository = models.ForeignKey(
    Repository,
    on_delete=models.CASCADE,
    related_name="commits"
    )

    message = models.TextField()

    created_by = models.ForeignKey(
    "User",
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name="commits"
    )

    author_name = models.CharField(max_length=150)
    author_email = models.EmailField()

    commit_hash = models.CharField(max_length=64, unique=True, db_index=True)

    parent = models.ForeignKey(
    "self",
    null=True,
    blank=True,
    on_delete=models.SET_NULL,
    related_name="children",
    )

    class Meta:
        indexes = [
            models.Index(fields=["repository", "created_at"]),
            models.Index(fields=["commit_hash"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and Commit.objects.filter(pk=self.pk).exists():
            raise ValidationError("Commit is immutable and cannot be changed after creation.")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.commit_hash


class CommitFile(TimeStampedModel):
    """
    Файл внутри конкретного коммита.

    path дублируется специально:
    если файл потом переименуют, старый коммит должен показывать старый путь.

    Старый CommitFile нельзя обновлять.
    При удалении Repository/Commit удаляется каскадом.
    """

    commit = models.ForeignKey(Commit, on_delete=models.CASCADE, related_name="files")
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name="commit_versions")
    path = models.CharField(max_length=512)
    previous_path = models.CharField(max_length=512, null=True, blank=True)
    operation = models.CharField(max_length=20, choices=CommitFileOperation.choices)
    blob = models.ForeignKey(
        FileBlob,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="commit_files",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["commit", "path"], name="unique_file_path_per_commit"),
            models.CheckConstraint(
                name="commit_file_blob_matches_operation",
                check=(
                        Q(operation=CommitFileOperation.DELETED, blob__isnull=True)
                        | Q(
                    operation__in=[
                        CommitFileOperation.ADDED,
                        CommitFileOperation.MODIFIED,
                        CommitFileOperation.RENAMED,
                    ],
                    blob__isnull=False,
                )
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["commit", "path"]),
            models.Index(fields=["file"]),
            models.Index(fields=["operation"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and CommitFile.objects.filter(pk=self.pk).exists():
            raise ValidationError("CommitFile is immutable and cannot be changed after creation.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.commit.commit_hash}: {self.path}"



def is_company_member(user, company):
    """
    Проверяет, является ли user участником company.

    Owner компании считается участником даже без отдельной CompanyMember записи.
    """

    if not user or not user.is_authenticated or company is None:
        return False

    if company.owner_id == user.id:
        return True

    return CompanyMember.objects.filter(company=company, user=user).exists()


def can_view_repository(user, repository):
    """
    Проверяет право просмотра repository.

    Public repository виден всем авторизованным пользователям.
    Private repository виден owner_user или участникам owner_company.
    """

    if not user or not user.is_authenticated:
        return False

    if repository.visibility == RepositoryVisibility.PUBLIC:
        return True

    if repository.is_personal:
        return repository.owner_user_id == user.id

    return is_company_member(user, repository.owner_company)


def can_edit_repository(user, repository):
    """
    Проверяет право редактирования repository.

    Public не даёт права редактирования.
    """

    if not user or not user.is_authenticated:
        return False

    if repository.is_personal:
        return repository.owner_user_id == user.id

    return is_company_member(user, repository.owner_company)


def can_delete_repository(user, repository):
    """
    Проверяет право удаления repository.

    Personal repository удаляет owner_user.
    Company repository удаляет owner компании.
    """

    if not user or not user.is_authenticated:
        return False

    if repository.is_personal:
        return repository.owner_user_id == user.id

    return repository.owner_company.owner_id == user.id


def can_manage_company(user, company):
    """
    Проверяет право управления компанией.

    Управлять компанией может только owner.
    """

    if not user or not user.is_authenticated:
        return False

    return company.owner_id == user.id


def can_create_company_repository(user, company):
    """
    Проверяет право создания repository внутри компании.

    Создавать может owner или любой участник компании.
    """

    if not user or not user.is_authenticated:
        return False

    return is_company_member(user, company)



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
