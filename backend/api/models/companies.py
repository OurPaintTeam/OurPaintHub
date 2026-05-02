from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.db.models.functions import Lower
from django.db.models import Q

from django.contrib.auth import get_user_model

from api.choices import CompanyInviteStatus, RepositoryVisibility
from api.models.base import TimeStampedModel, validate_5mb
from api.models.notifications import Notification


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
        "api.User",
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
        "api.User",
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
        "api.User",
        on_delete=models.CASCADE,
        related_name="company_invites"
    )

    invited_by = models.ForeignKey(
        "api.User",
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
