from django.urls import path

from api.views.companies import get_companies, create_company, update_company, delete_company, get_company_members, \
    add_company_member, remove_company_member, get_company_repositories

urlpatterns = [
    path("", get_companies),
    path("create/", create_company),

    path("<int:company_id>/", update_company),
    path("<int:company_id>/delete/", delete_company),

    path("<int:company_id>/members/", get_company_members),
    path("<int:company_id>/members/add/", add_company_member),
    path("<int:company_id>/members/remove/", remove_company_member),

    path("<int:company_id>/repositories/", get_company_repositories),
]