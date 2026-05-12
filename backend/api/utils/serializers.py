from api.models.companies import (
    CompanyMember,
    can_delete_repository,
    can_edit_repository,
    can_manage_company,
    can_view_repository,
    is_company_member,
)


def _file_url(file_field):
    if not file_field:
        return None

    try:
        return file_field.url
    except ValueError:
        return None


def _iso(value):
    return value.isoformat() if value and hasattr(value, "isoformat") else value


def serialize_user(user):
    profile = getattr(user, "profile", None)
    avatar_url = _file_url(getattr(profile, "avatar", None))

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": getattr(user, "role", None),
        "is_admin": getattr(user, "is_app_admin", False),
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "bio": getattr(profile, "bio", None),
        "date_of_birth": _iso(getattr(profile, "date_of_birth", None)),
        "avatar": avatar_url,
        "avatar_url": avatar_url,
        "date_joined": _iso(getattr(user, "date_joined", None)),
        "last_login": _iso(getattr(user, "last_login", None)),
        "profile_created_at": _iso(getattr(profile, "created_at", None)),
        "profile_updated_at": _iso(getattr(profile, "updated_at", None)),
    }


def serialize_repository(repository, user=None):
    owner_user = repository.owner_user
    owner_company = repository.owner_company

    return {
        "id": repository.id,
        "name": repository.name,
        "description": repository.description,
        "visibility": repository.visibility,
        "created_by_id": repository.created_by_id,
        "logo": repository.logo.url if repository.logo else None,
        "created_by_username": repository.created_by.username if repository.created_by_id else None,
        "owner_user_id": repository.owner_user_id,
        "owner_user_username": owner_user.username if owner_user else None,
        "owner_company_id": repository.owner_company_id,
        "owner_company_name": owner_company.name if owner_company else None,
        "is_personal": repository.is_personal,
        "is_company_repository": repository.is_company_repository,
        "can_view": bool(user and can_view_repository(user, repository)),
        "can_edit": bool(user and can_edit_repository(user, repository)),
        "can_delete": bool(user and can_delete_repository(user, repository)),
        "created_at": _iso(repository.created_at),
        "updated_at": _iso(repository.updated_at),
    }


def serialize_company(company, user=None):
    logo_url = _file_url(company.logo)

    base_data = {
        "id": company.id,
        "name": company.name,
        "description": company.description,
        "owner_id": company.owner_id,
        "owner_username": company.owner.username if company.owner_id else None,
        "logo": logo_url,
        "member_count": CompanyMember.objects.filter(company=company).count(),
        "created_at": _iso(company.created_at),
        "updated_at": _iso(company.updated_at),
    }

    if not user or not user.is_authenticated or not is_company_member(user, company):
        return {
            **base_data,
            "is_member": False,
            "can_manage": False,
            "is_owner": False,
        }

    return {
        **base_data,
        "is_owner": company.owner_id == user.id,
        "is_member": True,
        "can_manage": can_manage_company(user, company),
    }
