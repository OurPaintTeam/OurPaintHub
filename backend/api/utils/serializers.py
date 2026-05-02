from api.models.companies import is_company_member, can_manage_company, can_view_repository, can_edit_repository, \
    can_delete_repository


def serialize_user(user, request=None):
    profile = getattr(user, "profile", None)

    def serialize_date(value):
        return value.isoformat() if hasattr(value, "isoformat") else value

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_admin": user.is_app_admin,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "bio": profile.bio if profile else None,
        "date_of_birth": serialize_date(profile.date_of_birth) if profile and profile.date_of_birth else None,
        "avatar": (request.build_absolute_uri(profile.avatar.url)
            if profile and profile.avatar and request
            else None
        ),
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "profile_created_at": profile.created_at.isoformat() if profile else None,
        "profile_updated_at": profile.updated_at.isoformat() if profile else None,
    }

def serialize_repository(repository, user=None):
    return {
        "id": repository.id,
        "name": repository.name,
        "description": repository.description,
        "visibility": repository.visibility,
        "created_by_id": repository.created_by_id,
        "owner_user_id": repository.owner_user_id,
        "owner_user_username": repository.owner_user.username if repository.owner_user_id else None,
        "owner_company_id": repository.owner_company_id,
        "owner_company_name": repository.owner_company.name if repository.owner_company_id else None,
        "is_personal": repository.is_personal,
        "is_company_repository": repository.is_company_repository,
        **(
            {
                "can_view": can_view_repository(user, repository),
                "can_edit": can_edit_repository(user, repository),
                "can_delete": can_delete_repository(user, repository),
            }
            if user
            else {}
        ),
    }


def serialize_company(company, user=None):
    data = {
        "id": company.id,
        "name": company.name,
        "description": company.description,
        "owner_id": company.owner_id,
        "owner_username": company.owner.username,
    }

    if user:
        data.update(
            {
                "is_owner": company.owner_id == user.id,
                "is_member": is_company_member(user, company),
                "can_manage": can_manage_company(user, company),
            }
        )

    return data
