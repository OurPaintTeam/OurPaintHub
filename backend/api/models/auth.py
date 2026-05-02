from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser, UserManager as DjangoUserManager

from api.models.base import TimeStampedModel

class AuthRefreshSession(TimeStampedModel):
    """
    Backend refresh-сессия.

    Frontend хранит только access_token.
    Refresh token не отдаётся в JSON и хранится у клиента только в HttpOnly cookie.
    В БД хранится hash refresh token, а не сам token.
    """

    user = models.ForeignKey("api.User", on_delete=models.CASCADE, related_name="refresh_sessions")
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
