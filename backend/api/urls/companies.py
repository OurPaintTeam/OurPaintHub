from django.urls import path

from api.views.companies import get_companies, create_company, get_or_update_company, delete_company, get_company_members, \
    add_company_member, remove_company_member, get_company_repositories, get_incoming_invites, get_sent_invites, \
    accept_invite, reject_invite, cancel_invite

urlpatterns = [
    path("list/", get_companies),
    path("create/", create_company),

    path("<int:company_id>/", get_or_update_company),
    path("<int:company_id>/delete/", delete_company),

    path("<int:company_id>/members/", get_company_members),
    path("<int:company_id>/members/add/", add_company_member),
    path("<int:company_id>/members/remove/", remove_company_member),

    path("<int:company_id>/repositories/", get_company_repositories),

    # входящие приглашения пользователя
    path("invites/incoming/", get_incoming_invites),

    # исходящие приглашения пользователя
    path("invites/sent/", get_sent_invites),

    # принять приглашение
    path("invites/<int:invite_id>/accept/", accept_invite),

    # отклонить приглашение
    path("invites/<int:invite_id>/reject/", reject_invite),

    # отменить приглашение (owner / inviter)
    path("invites/<int:invite_id>/cancel/", cancel_invite),
]
