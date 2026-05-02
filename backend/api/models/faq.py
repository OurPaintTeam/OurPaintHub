from django.urls import path
from api import views

urlpatterns = [
    path("", views.get_QA_list),
    path("answered/", views.get_answered_QA_list),
    path("unanswered/", views.get_unanswered_QA_list),

    path("create/", views.create_QA),
    path("<int:qa_id>/answer/", views.answer_QA),
    path("<int:qa_id>/delete/", views.delete_QA),
]