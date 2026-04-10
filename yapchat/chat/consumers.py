import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # After connecting get the message history and send it to the client
        history = await self.get_message_history(self.room_name)
        for message_data in history:
            # Formatting the Timestamp to a string (in case it is a datetime object)
            message_data['timestamp'] = message_data['timestamp'].isoformat()

            # Send each message to the client
            await self.send(text_data= json.dumps({
                'type' : 'chat_message',
                'message' : message_data['content'],
                'username' : message_data['sender'],
                'timestamp' : message_data['timestamp']
            }))

    async def disconnect(self, close_code):
        print(f"DEBUG: User {self.scope['user'].username if self.scope['user'].is_authenticated else 'Stranger'} disconnecting from room {self.room_name}")
        # Send a signal to the group that this user has disconnected
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'partner_left',
                'username': self.scope['user'].username if self.scope['user'].is_authenticated else 'Stranger',
                'sender_channel_name': self.channel_name,
            }
        )

        # *** ADD THIS LINE ***
        # Clean up the room's user count and potentially delete the room
        await self.cleanup_room_on_disconnect(self.room_name)
        # *********************

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"DEBUG: User disconnected from room {self.room_name}. Room group discarded.")

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type') # Getting the message type

        if message_type == 'chat_message':
            message = text_data_json['message']
            username = text_data_json.get('username', 'Stranger') # capturing the username

            await self.save_message(username, self.room_name, message)

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message' : message,
                    'username' : username
                }
            )

        elif message_type == 'webrtc_offer':
            username = text_data_json.get('username', 'Stranger') # capturing the username

            # fowarding the offer to the other peer
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_offer',
                    'sdp' : text_data_json['sdp'],
                    'sender_channel_name' : self.channel_name,
                    'username' : username,
                }
            )

        elif message_type == 'webrtc_answer':
            username = text_data_json.get('username', 'Stranger') # capturing the username

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_answer',
                    'sdp' : text_data_json['sdp'],
                    'sender_channel_name' : self.channel_name,
                    'username' : username,
                }
            )

        elif message_type == 'webrtc_ice_candidate':
            username = text_data_json.get('username', 'Stranger') # capturing the username

            # Forward the ICE Candidate to the other peer in the group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_ice_candidate',
                    'candidate' : text_data_json['candidate'],
                    'sender_channel_name' : self.channel_name,
                    'username' : username,
                }
        )

        elif message_type == 'typing_start':
            username = text_data_json.get('username', 'Stranger') # capturing the username
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_start',
                    'username': username,
                    'sender_channel_name' : self.channel_name,
                }
            )

        elif message_type == 'typing_stop':
            username = text_data_json.get('username', 'Stranger') # capturing the username
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_stop',
                    'username': username,
                    'sender_channel_name' : self.channel_name,
                }
            )

        else:
            print(f"Unknown message type: {message_type}")


    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        username = event.get('username', 'Stranger') 

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message', 
            'message': message,
            'username': username
        }))
    
    # receive WebRTC offer from room group
    async def webrtc_offer(self,event):
        # Dont send the offer back to the person who sent it
        if self.channel_name == event.get('sender_channel_name'):
            return
        username = event.get('username', 'Stranger')
        await self.send(text_data=json.dumps({
            'type': 'webrtc_offer',
            'sdp' : event['sdp'],
            'username' : username,
        }))
    
    # receive WebRTC answer from room group
    async def webrtc_answer(self, event):
        # Dont send the offer back to the person who sent it
        if self.channel_name == event.get('sender_channel_name'):
            return
        username = event.get('username', 'Stranger')
        await self.send(text_data=json.dumps({
            'type' : 'webrtc_answer',
            'sdp' : event['sdp'],
            'username' : username,
        }))
    
    # receive WebRTC ICE Candidate from groom group
    async def webrtc_ice_candidate(self,event):
        # Dont send the offer back to the person who sent it
        if self.channel_name == event.get('sender_channel_name'):
            return
        username = event.get('username', 'Stranger')
        await self.send(text_data=json.dumps({
            'type' : 'webrtc_ice_candidate',
            'candidate' : event['candidate'],
            'username' : username,
        }))
    
    async def typing_start(self,event):
        # Dont send the indicator back to the person who sent it
        if self.channel_name == event.get('sender_channel_name'):
            return
        username = event.get('username', 'Stranger')
        await self.send(text_data=json.dumps({
            'type': 'typing_start',
            'username': username,
        }))
    
    async def typing_stop(self,event):
        # Dont send the indicator back to the person who sent it
        if self.channel_name == event.get('sender_channel_name'):
            return
        username = event.get('username', 'Stranger')
        await self.send(text_data=json.dumps({
            'type': 'typing_stop',
            'username': username,
        }))
    
    async def partner_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'partner_left',
            'username' : event.get('username', 'Stranger'),
            'message': "User has disconnected, Finding a new one..."
        }))

    @database_sync_to_async
    def save_message(self, username, room_name, message):
        # Find the room object from the database using room_name
        try:
            room = Room.objects.get(name=room_name)
        except Room.DoesNotExist:
            return None
        
        # Create and save the new message
        return Message.objects.create(
            room=room,
            sender=username,
            content=message
        )
    
    @database_sync_to_async
    def get_message_history(self,room_name):
        try:
            room = Room.objects.get(name=room_name)
            # Fetch last 50 messages ordered by timestamp
            history = Message.objects.filter(room=room).order_by('timestamp')[:50]
            return list(history.values('sender', 'content', 'timestamp'))
        except Room.DoesNotExist:
            return []
    @database_sync_to_async
    def cleanup_room_on_disconnect(self, room_name):
        print(f"DEBUG: cleanup_room_on_disconnect called for room: {room_name}")
        try:
            room = Room.objects.get(name=room_name)
            print(f"DEBUG: Room {room_name} found. Current users BEFORE decrement: {room.current_users}")
            
            room.current_users -= 1
            room.isFull = (room.current_users >= room.capacity) # Re-evaluate if it's full

            if room.current_users <= 0:
                print(f"DEBUG: Room {room_name} is empty ({room.current_users} users). Deleting room and its messages.")
                Message.objects.filter(room=room).delete() 
                room.delete()
            else:
                room.save()
                print(f"DEBUG: Room {room_name} still has {room.current_users} users. Saved.")
        except Room.DoesNotExist:
            print(f"DEBUG: Room {room_name} not found during disconnect cleanup. It might have been deleted already.")
        except Exception as e:
            print(f"ERROR in cleanup_room_on_disconnect for room {room_name}: {e}")