from django.shortcuts import render
from django.http import JsonResponse
from .models import Room
import uuid

# Create your views here.
def index(request):
    return render(request, "chat/main.html")

def room(request, room_name):
    return render(request, "chat/room.html", {"room_name": room_name})

def join_lobby(request) :
    available_room = Room.objects.filter(isFull=False).first()

    if available_room:
        available_room.isFull = True

        # Sending back the room details to the browser as a json object
        available_room.save()

        return JsonResponse({
            'room_name' : available_room.name
        })
    else :
        # IF NO ROOMS ARE FOUND IT WILL CREATE A NEW ROOM
        random_name = str(uuid.uuid4())[:12]

        # Creating a new room
        new_room = Room.objects.create(name=random_name, isFull=False)
        
        return JsonResponse({
            'room_name' : new_room.name
        })
