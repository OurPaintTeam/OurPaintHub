from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q


from api.models.companies import Company, CompanyMember
from api.models.repositories import Repository
from api.models.companies import (
    is_company_member,
    can_manage_company,
)
from api.utils.auth_service import get_user_from_request_data
from api.utils.logging_service import log_action

from api.utils.serializers import serialize_user, serialize_repository, serialize_company

from django.contrib.auth import get_user_model
User = get_user_model()


def with_user(view_func):
    def wrapper(request, *args, **kwargs):
        user, error = get_user_from_request_data(request)
        if error:
            return error
        return view_func(request, user, *args, **kwargs)
    return wrapper


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

    if not is_company_member(user, company):
        return Response({"error": "Недостаточно прав"}, status=403)

    return Response(serialize_company(company, user))


@api_view(["POST"])
@with_user
def create_company(request, user):
    name = (request.data.get("name") or "").strip()
    description = (request.data.get("description") or "").strip()

    if not name:
        return Response({"error": "Название обязательно"}, status=400)

    company = Company.objects.create(
        owner=user,
        name=name,
        description=description
    )

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
        company = Company.objects.get(id=company_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=404)

    if not can_manage_company(user, company):
        return Response({"error": "Нет прав"}, status=403)

    company.name = request.data.get("name", company.name)
    company.description = request.data.get("description", company.description)
    company.save()

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


@api_view(["POST"])
@with_user
def add_company_member(request, user, company_id):
    member_id = request.data.get("member_id")

    if not member_id:
        return Response({"error": "member_id required"}, status=400)

    try:
        company = Company.objects.get(id=company_id)
        member = User.objects.get(id=member_id)
    except Company.DoesNotExist:
        return Response({"error": "Компания не найдена"}, status=404)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if not can_manage_company(user, company):
        return Response({"error": "Нет прав"}, status=403)

    CompanyMember.objects.get_or_create(company=company, user=member)

    log_action(user, "add_member", company, {"member_id": member.id})

    return Response({"message": "added"}, status=201)


@api_view(["DELETE"])
@with_user
def remove_company_member(request, user, company_id):
    member_id = request.data.get("member_id")

    try:
        company = Company.objects.get(id=company_id)
        member = User.objects.get(id=member_id)
    except:
        return Response({"error": "not found"}, status=404)

    if not can_manage_company(user, company):
        return Response({"error": "Нет прав"}, status=403)

    if company.owner_id == member.id:
        return Response({"error": "Нельзя удалить owner"}, status=400)

    CompanyMember.objects.filter(company=company, user=member).delete()

    log_action(user, "remove_member", company, {"member_id": member.id})

    return Response({"message": "removed"})


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

    if not is_company_member(user, company):
        return Response({"error": "Нет прав"}, status=403)

    repos = Repository.objects.filter(owner_company=company).order_by("name")

    return Response([serialize_repository(r, user) for r in repos])