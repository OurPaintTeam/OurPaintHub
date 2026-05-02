from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
from django.db.models.functions import Lower
from django.utils import timezone

from api.models.base import TimeStampedModel
from api.choices import UserRole

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
            self.save(update_fields=["revoked_at"])

    def __str__(self):
        return f"refresh session for {self.user.username}"
