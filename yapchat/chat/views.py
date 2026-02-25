from django.shortcuts import render
from django.http import JsonResponse
from .models import Room
import uuid
from django.db import transaction, models

# Create your views here.
def index(request):
    return render(request, "chat/main.html")

def room(request, room_name):
    return render(request, "chat/room.html", {"room_name": room_name})

def join_lobby(request) :
    room_name_to_return = None

    # using database transaction for concurrency
    with transaction.atomic():
        #try to find an available room
        available_room = Room.objects.select_for_update().filter(current_users__lt=models.F('capacity')).first()
    
        if available_room:
            available_room.current_users += 1
            available_room.isFull = (available_room.current_users >= available_room.capacity)

            # Sending back the room details to the browser as a json object        
            available_room.save()
            room_name_to_return = available_room.name
        else:
            # no available room, create a new one
            random_name = str(uuid.uuid4())[:12]
            new_room = Room.objects.create(
                name=random_name,
                capacity=2,
                current_users=1, # this user is first in the room
                isFull=False
            )
            #check if this new room is now full (if capacity was 1 for example)
            new_room.isFull = (new_room.current_users >= new_room.capacity)
            new_room.save()
            room_name_to_return = new_room.name

    return JsonResponse({
        'room_name' : available_room.name
    })
  
       