from django.db.models import Q

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from api.models.user import UserProfile

from api.models.repositories import Repository
from api.models.companies import Company

from api.choices import RepositoryVisibility
from api.utils.auth_service import get_user_from_request_data
from api.utils.serializers import serialize_user,serialize_repository,serialize_company

from django.contrib.auth import get_user_model
User = get_user_model()


@api_view(["GET"])
def get_all_users(request):
    users = User.objects.order_by("username")
    return Response([serialize_user(user) for user in users], status=status.HTTP_200_OK)


@api_view(["GET"])
def get_public_user_profile(request, user_id):
    requester, error = get_user_from_request_data(request)
    if error:
        return error

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "Пользователь не найден"}, status=status.HTTP_404_NOT_FOUND)

    repositories = Repository.objects.filter(owner_user=user, visibility=RepositoryVisibility.PUBLIC).order_by("name")
    companies = Company.objects.filter(Q(owner=user) | Q(companymember__user=user)).distinct().order_by("name")

    return Response(
        {
            "user": serialize_user(user),
            "repositories": [serialize_repository(repository, requester) for repository in repositories],
            "companies": [serialize_company(company, requester) for company in companies],
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def check_user_role(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    return Response(
        {
            "user_id": user.id,
            "role": user.role,
            "is_admin": user.is_app_admin,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
def get_user_profile(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    return Response(serialize_user(user), status=status.HTTP_200_OK)


@api_view(["GET", "PUT"])
def update_user_profile(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    profile, _ = UserProfile.objects.get_or_create(user=user)

    user.first_name = request.data.get("first_name", user.first_name)
    user.last_name = request.data.get("last_name", user.last_name)
    user.save(update_fields=["first_name", "last_name"])

    if "bio" in request.data:
        profile.bio = request.data.get("bio")
    if "date_of_birth" in request.data:
        profile.date_of_birth = request.data.get("date_of_birth") or None
    if "avatar" in request.FILES:
        profile.avatar = request.FILES["avatar"]
    profile.save()

    return Response({"message": "Профиль обновлён", "user": serialize_user(user)}, status=status.HTTP_200_OK)
