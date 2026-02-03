from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('join-lobby/', views.join_lobby, name='join_lobby'),
    path("<str:room_name>/", views.room, name="room"),
]