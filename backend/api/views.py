from django.shortcuts import render

from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def hello(request):
    return Response({"message": "Hello from Django API!"})

@api_view(["GET"])
def welcome(request):
    return Response({"message": "Welcome to the Django API!"})

@api_view(["POST"])
def send_message(request):
    text = request.data.get("text", "")
    with open("messages.txt", "a", encoding="utf-8") as f:
        f.write(text + "\n")
    return Response({"status": "ok", "message": text})