import json
from channels.generic.websocket import AsyncWebsocketConsumer

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

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type') # Getting the message type

        if message_type == 'chat_message':
            message = text_data_json['message']
            username = text_data_json.get('username', 'Stranger') # capturing the username

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