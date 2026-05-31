from django.urls import path,include
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('join-lobby/', views.join_lobby, name='join_lobby'),
    path('delete-messages/<str:room_name>/', views.delete_room_messages, name='delete_room_messages'),
    path('new-room-request/', views.create_and_join_new_room, name='create_and_join_new_room'),
    path('<str:room_name>/', views.room, name='room'),
    path("__reload__/", include("django_browser_reload.urls")),
]