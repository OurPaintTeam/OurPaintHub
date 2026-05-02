from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from api.models import FAQ
from api.auth import get_user_from_request_data, is_admin
from api.utils import log_action


# =========================================================
# SERIALIZER
# =========================================================

def serialize_faq(faq):
    return {
        "id": faq.id,
        "text_question": faq.text_question,
        "answered": faq.answered,
        "answer_text": faq.answer_text,
        "questioner_id": faq.questioner_id,
        "answerer_id": faq.answerer_id,
        "created_at": faq.created_at.isoformat(),
        "updated_at": faq.updated_at.isoformat(),
    }


# =========================================================
# PUBLIC LISTS
# =========================================================

@api_view(["GET"])
def get_QA_list(request):
    qs = FAQ.objects.select_related("questioner", "answerer").order_by("-created_at")
    return Response([serialize_faq(q) for q in qs])


@api_view(["GET"])
def get_answered_QA_list(request):
    qs = (
        FAQ.objects
        .select_related("questioner", "answerer")
        .filter(answered=True)
        .order_by("-updated_at")
    )
    return Response([serialize_faq(q) for q in qs])


# =========================================================
# ADMIN LIST
# =========================================================

@api_view(["GET"])
def get_unanswered_QA_list(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    qs = (
        FAQ.objects
        .select_related("questioner", "answerer")
        .filter(answered=False)
        .order_by("-created_at")
    )

    return Response([serialize_faq(q) for q in qs])


# =========================================================
# CREATE QUESTION (USER)
# =========================================================

@api_view(["POST"])
def create_QA(request):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    text = (request.data.get("text_question") or "").strip()
    if not text:
        return Response({"error": "text_question required"}, status=400)

    faq = FAQ.objects.create(
        questioner=user,
        text_question=text
    )

    log_action(user, "create", faq)

    return Response(serialize_faq(faq), status=201)


# =========================================================
# ANSWER (ADMIN)
# =========================================================

@api_view(["PATCH"])
def answer_QA(request, qa_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    answer = (request.data.get("answer_text") or "").strip()
    if not answer:
        return Response({"error": "answer_text required"}, status=400)

    try:
        faq = FAQ.objects.get(id=qa_id)
    except FAQ.DoesNotExist:
        return Response({"error": "not_found"}, status=404)

    faq.answer_text = answer
    faq.answerer = user
    faq.answered = True
    faq.save()

    log_action(user, "answer", faq)

    return Response(serialize_faq(faq))


# =========================================================
# DELETE (ADMIN)
# =========================================================

@api_view(["DELETE"])
def delete_QA(request, qa_id):
    user, error = get_user_from_request_data(request)
    if error:
        return error

    if not is_admin(user):
        return Response({"error": "forbidden"}, status=403)

    try:
        faq = FAQ.objects.get(id=qa_id)
    except FAQ.DoesNotExist:
        return Response({"error": "not_found"}, status=404)

    log_action(user, "delete", faq)
    faq.delete()

    return Response(status=204)