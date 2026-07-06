from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import Q
from django.contrib.auth import get_user_model

from api.choices import CompanyInviteStatus
from api.models.companies import Company, CompanyMember, CompanyInvite
from api.models.repositories import Repository
from api.models.companies import (
    is_company_member,
    can_manage_company,
)
from api.utils.auth_service import get_user_from_request_data
from api.utils.logging_service import log_action
from api.utils.repository_service import with_user

from api.utils.serializers import serialize_user, serialize_repository, serialize_company

from django.contrib.auth import get_user_model
User = get_user_model()


def _file_url(file_field):
    if not file_field:
        return None
    try:
        return file_field.url
    except ValueError:
        return None

def _iso(value):
    return value.isoformat() if value and hasattr(value, "isoformat") else value

def company_name_taken(name, exclude_company_id=None):
    queryset = Company.objects.filter(name__iexact=name)

    if exclude_company_id:
        queryset = queryset.exclude(id=exclude_company_id)

    return queryset.exists()



@api_view(["GET"])
@with_user
def get_companies(request, user):
    companies = (
        Company.objects
        .select_related("owner")
        .filter(
            Q(owner=user) |
            Q(companymember__user=user)
        )
        .distinct()
        .order_by("name")
    )

    return Response(
        [serialize_company(company, user) for company in companies],
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
@with_user
def get_company(request, user, company_id):
    try:
        company = Company.objects.select_related("owner").get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=404)

    return Response(serialize_company(company, user))


@api_view(["POST"])
@with_user
def create_company(request, user):
    name = (request.data.get("name") or "").strip()
    description = (request.data.get("description") or "").strip()

    if not name:
        return Response({"error": "Название обязательно"}, status=400)

    if company_name_taken(name):
        return Response({"error": "Компания с таким названием уже существует"}, status=400)

    try:
        company = Company.objects.create(
            owner=user,
            name=name,
            description=description
        )
    except IntegrityError:
        return Response({"error": "Компания с таким названием уже существует"}, status=400)

    CompanyMember.objects.create(company=company, user=user)

    log_action(user, "create", company)

    return Response(
        {"company": serialize_company(company, user)},
        status=201
    )


@api_view(["PUT"])
@with_user
def update_company(request, user, company_id):
    try:
        company = Company.objects.select_related("owner").get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=404)

    # Только управляющие могут обновлять
    if not can_manage_company(user, company):
        return Response({"error": "Нет прав на редактирование"}, status=403)

    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Название обязательно"}, status=400)

    if company_name_taken(name, exclude_company_id=company.id):
        return Response({"error": "Компания с таким названием уже существует"}, status=400)

    if "logo" in request.FILES:
        company.logo = request.FILES["logo"]

    company.name = name
    company.description = (request.data.get("description") or "").strip()

    remove_logo = request.POST.get("remove_logo") or request.data.get("remove_logo")
    if remove_logo == "true":
        if company.logo:
            company.logo.delete(save=False)
        company.logo = None

    try:
        company.save()
    except IntegrityError:
        return Response({"error": "Компания с таким названием уже существует"}, status=400)

    log_action(user, "update", company)

    return Response({"company": serialize_company(company, user)})


@api_view(["DELETE"])
@with_user
def delete_company(request, user, company_id):
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=404)

    if not can_manage_company(user, company):
        return Response({"error": "Нет прав"}, status=403)

    log_action(user, "delete", company)
    company.delete()

    return Response({"message": "deleted"})


# =========================================================
# MEMBERS
# =========================================================

@api_view(["GET"])
@with_user
def get_company_members(request, user, company_id):
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=404)

    if not is_company_member(user, company):
        return Response({"error": "Нет прав"}, status=403)

    members = User.objects.filter(companymember__company=company)

    return Response([serialize_user(m) for m in members])



@api_view(["DELETE"])
@with_user
def remove_company_member(request, user, company_id):
    member_id = request.data.get("member_id")

    try:
        company = Company.objects.get(id=company_id)
        member = User.objects.get(id=member_id)
    except:
        return Response({"error": "not_found"}, status=404)

    if company.owner_id == member.id:
        return Response({"error": "Нельзя удалить owner"}, status=400)

    if user.id == member.id:
        CompanyMember.objects.filter(company=company, user=member).delete()

        log_action(user, "leave_company", company)

        return Response({"message": "Вы вышли из компании"})

    if can_manage_company(user, company):
        CompanyMember.objects.filter(company=company, user=member).delete()

        log_action(user, "remove_member", company, {"member_id": member.id})

        return Response({"message": "Участник удалён"})

    return Response({"error": "Нет прав"}, status=403)


@api_view(["DELETE"])
@with_user
def leave_company(request, user, company_id):
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "not_found"}, status=404)

    if company.owner_id == user.id:
        return Response(
            {"error": "Владелец не может выйти из компании"},
            status=400
        )

    member_qs = CompanyMember.objects.filter(company=company, user=user)

    if not member_qs.exists():
        return Response({"error": "Вы не участник компании"}, status=400)

    member_qs.delete()

    log_action(user, "leave_company", company)

    return Response({"message": "Вы вышли из компании"})


# =========================================================
# REPOSITORIES
# =========================================================

@api_view(["GET"])
@with_user
def get_company_repositories(request, user, company_id):
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=404)

    is_member = is_company_member(user, company)

    repos = Repository.objects.filter(owner_company=company)

    if not is_member:
        repos = repos.filter(visibility="public")

    repos = repos.order_by("name")

    return Response([serialize_repository(r, user) for r in repos])


@api_view(["POST"])
@with_user
def create_company_invite(request, user, company_id):
    try:
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "company_not_found"}, status=404)

    if not can_manage_company(user, company):
        return Response({"error": "forbidden"}, status=403)

    username = request.data.get("username")
    email = request.data.get("email")

    if not username and not email:
        return Response({"error": "username_or_email_required"}, status=400)

    invited_user = None

    if username:
        invited_user = User.objects.filter(username=username).first()

    if not invited_user and email:
        invited_user = User.objects.filter(email=email).first()

    if not invited_user:
        return Response({"error": "user_not_found"}, status=404)

    if CompanyMember.objects.filter(company=company, user=invited_user).exists():
        return Response({"error": "already_member"}, status=400)

    existing = CompanyInvite.objects.filter(
        company=company,
        invited_user=invited_user,
        status=CompanyInviteStatus.PENDING
    ).first()

    if existing:
        return Response({
            "error": "invite_already_sent",
            "invite_id": existing.id
        }, status=400)

    try:
        invite = CompanyInvite.create_invite(
            company=company,
            invited_user=invited_user,
            invited_by=user,
        )
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response({
        "id": invite.id,
        "status": invite.status,
        "message": "Приглашение отправлено"
    }, status=201)


@api_view(["GET"])
def get_incoming_invites(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    invites = CompanyInvite.objects.filter(
        invited_user=user,
        status=CompanyInviteStatus.PENDING
    ).select_related("company", "invited_by")

    return Response([
        {
            "id": i.id,
            "company": i.company.name,
            "company_id": i.company_id,
            "invited_by": i.invited_by.username if i.invited_by else None,
            "status": i.status,
            "created_at": i.created_at,
        }
        for i in invites
    ])



@api_view(["POST"])
def accept_invite(request, invite_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        invite = CompanyInvite.objects.get(id=invite_id)
    except CompanyInvite.DoesNotExist:
        return Response({"error": "Приглашение не найдено"}, status=404)

    # Если приглашение отменено - просто удаляем его
    if invite.status == CompanyInviteStatus.CANCELLED:
        invite.delete()
        return Response({
            "error": "invite_cancelled",
            "message": "Это приглашение было отменено. Пожалуйста, запросите новое приглашение."
        }, status=400)

    if invite.status != CompanyInviteStatus.PENDING:
        status_messages = {
            CompanyInviteStatus.ACCEPTED: "Это приглашение уже было принято",
            CompanyInviteStatus.REJECTED: "Это приглашение было отклонено",
        }
        message = status_messages.get(invite.status, f"Приглашение имеет статус: {invite.status}")
        return Response({"error": message}, status=400)

    try:
        invite.accept(user)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response({
        "message": "Вы присоединились к компании",
        "company_id": invite.company.id,
        "company_name": invite.company.name
    })



@api_view(["POST"])
def reject_invite(request, invite_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        invite = CompanyInvite.objects.get(id=invite_id)
        invite.reject(user)
    except CompanyInvite.DoesNotExist:
        return Response({"error": "not_found"}, status=404)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response({"message": "rejected"})


@api_view(["POST"])
def cancel_invite(request, invite_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        invite = CompanyInvite.objects.get(id=invite_id)
    except CompanyInvite.DoesNotExist:
        return Response({"error": "Приглашение не найдено"}, status=404)

    try:
        invite.cancel(user)
    except ValidationError as e:
        return Response({"error": str(e)}, status=400)

    return Response({"message": "Приглашение отменено"})


@api_view(["GET"])
@with_user
def get_company_invites(request, user, company_id):
    company = Company.objects.get(id=company_id)

    if not can_manage_company(user, company):
        return Response({"error": "forbidden"}, status=403)

    invites = CompanyInvite.objects.filter(
        company=company,
        status=CompanyInviteStatus.PENDING
    ).select_related("invited_user")

    result = []
    for invite in invites:
        # Получаем аватар приглашенного пользователя
        invited_user = invite.invited_user
        invited_user_avatar = None

        if invited_user:
            profile = getattr(invited_user, "profile", None)
            if profile and profile.avatar:
                try:
                    invited_user_avatar = profile.avatar.url
                except (ValueError, AttributeError):
                    invited_user_avatar = None

        result.append({
            "id": invite.id,
            "invited_user": invited_user.username if invited_user else str(invited_user),
            "invited_user_id": invited_user.id if invited_user else None,
            "invited_user_avatar": invited_user_avatar,
            "status": invite.status,
            "created_at": _iso(invite.created_at) if hasattr(invite, 'created_at') else None,
        })

    return Response(result)