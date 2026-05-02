from django.urls import path
from api import views

urlpatterns = [
    path("", views.get_companies),
    path("create/", views.create_company),

    path("<int:company_id>/", views.update_company),
    path("<int:company_id>/delete/", views.delete_company),

    path("<int:company_id>/members/", views.get_company_members),
    path("<int:company_id>/members/add/", views.add_company_member),
    path("<int:company_id>/members/remove/", views.remove_company_member),

    path("<int:company_id>/repositories/", views.get_company_repositories),
]