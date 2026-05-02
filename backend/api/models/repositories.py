from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.db.models.functions import Lower

from api.choices import RepositoryVisibility
from api.models.base import TimeStampedModel
from api.models.companies import Company


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
