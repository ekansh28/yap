from django.shortcuts import render,redirect
from django.http import JsonResponse, HttpResponseRedirect
from .models import Room, Message
import uuid
from django.db import transaction, models
import json
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt

# Create your views here.
@ensure_csrf_cookie
def index(request):
    return render(request, "chat/main.html")

def room(request, room_name):
    return render(request, "chat/room.html", {"room_name": room_name})

def join_lobby(request):
    room_name_to_return = None
    print(f"DEBUG: join_lobby called by user. Request path: {request.path}")

    with transaction.atomic():
        #try to find an available room
        # First, try to find a room with 1 user waiting for a second partner
        waiting_room = Room.objects.select_for_update().filter(current_users=1, capacity=2).first()

        if waiting_room:
            print(f"DEBUG: join_lobby found waiting room: {waiting_room.name} with {waiting_room.current_users} users (capacity {waiting_room.capacity})")
            waiting_room.current_users += 1
            waiting_room.isFull = (waiting_room.current_users >= waiting_room.capacity) # Should become True now (1+1=2)
            waiting_room.save()
            room_name_to_return = waiting_room.name
            print(f"DEBUG: join_lobby assigned to waiting room: {room_name_to_return}. New user count: {waiting_room.current_users}")
        else:
            # If no waiting room found, create a new one (this user will be the first)
            print("DEBUG: join_lobby - No waiting room found. Creating a new one.")
            random_name = str(uuid.uuid4())[:12]
            new_room = Room.objects.create(
                name=random_name,
                capacity=2,
                current_users=1, # this user is first in the room
                isFull=False
            )
            new_room.isFull = (new_room.current_users >= new_room.capacity) # Will be False (1 < 2)
            new_room.save()
            room_name_to_return = new_room.name
            print(f"DEBUG: join_lobby created new room: {room_name_to_return}")

    return HttpResponseRedirect(f"/chat/{room_name_to_return}/")
  

def delete_room_messages(request, room_name):
    if request.method == 'POST': # only allow post requests for deletion
        try:
            room = Room.objects.get(name=room_name)
            # Delete all messages associated with this room
            Message.objects.filter(room=room).delete()
            return JsonResponse({'status' : 'success', 'message': f'Messages for room {room_name} deleted.'})
        except Room.DoesNotExist:
            return JsonResponse({'status' : 'error', 'message' : f'Room {room_name} not found.'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status' : 'error', 'message': 'Only POST Requests are allowed.'}, status =405)
       

def create_and_join_new_room(request):
    print(f"DEBUG: create_and_join_new_room called by user. Request path: {request.path}")
    with transaction.atomic():
        random_name = str(uuid.uuid4())[:12]
        new_room = Room.objects.create(
            name=random_name,
            capacity=2,
            current_users=1, # This user is the first in the new room
            isFull=False
        )
        new_room.isFull = (new_room.current_users >= new_room.capacity)
        new_room.save()
        room_name_to_return = new_room.name
        print(f"DEBUG: create_and_join_new_room created new room: {room_name_to_return}")
    
    return HttpResponseRedirect(f"/chat/{room_name_to_return}/")

