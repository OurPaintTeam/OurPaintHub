from django.urls import path

from api.views.faq import get_QA_list, get_answered_QA_list, get_unanswered_QA_list, create_QA, answer_QA, delete_QA

urlpatterns = [
    path("list/", get_QA_list),
    path("answered/", get_answered_QA_list),
    path("unanswered/", get_unanswered_QA_list),

    path("create/", create_QA),
    path("<int:qa_id>/answer/", answer_QA),
    path("<int:qa_id>/delete/", delete_QA),
]