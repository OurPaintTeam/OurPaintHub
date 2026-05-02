from django.db import connection
from django.db.utils import OperationalError

from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def health(request):
    try:
        connection.ensure_connection()
    except OperationalError:
        return Response({"db": "down"}, status=503)

    return Response({"db": "ok"})



