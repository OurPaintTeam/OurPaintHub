from django.urls import path
from . import views

urlpatterns = [
    path("hello/", views.hello, name="hello"),
    path("welcome/", views.welcome, name="welcome"),  
    path("send/", views.send_message),
]