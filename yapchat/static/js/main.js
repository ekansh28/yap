document.addEventListener('DOMContentLoaded', () => {
    // 1. Get Room Name and Username
    const roomNameElement = document.getElementById('room-name');
    if (!roomNameElement) {
        console.error('Room name script tag not found!');
        return;
    }
    const roomName = JSON.parse(roomNameElement.textContent);
    
    const user_name = localStorage.getItem('chat_username') || 'Anonymous';
    console.log("Retrieved username from storage:", user_name);

    // 2. Setup WebSocket
    const chatSocket = new WebSocket(
        'ws://'
        + window.location.host
        + '/ws/chat/'
        + roomName
        + '/'
    );

    // 3. Handle Incoming Messages
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const sender = data.username ? data.username : 'Stranger';
        const chatLog = document.querySelector('#chat-log');
        if (chatLog) {
            chatLog.value += (sender + " : " + data.message + '\n');
        }
    };

    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };

    // 4. Handle Input and Send
    const messageInput = document.querySelector('#chat-message-input');
    const messageSubmit = document.querySelector('#chat-message-submit');

    if (messageInput) {
        messageInput.focus();
        messageInput.onkeyup = function(e) {
            if (e.key === 'Enter') {  // enter, return
                if (messageSubmit) {
                    messageSubmit.click();
                }
            }
        };
    }

    if (messageSubmit) {
        messageSubmit.onclick = function(e) {
            if (!messageInput) return;
            
            const message = messageInput.value;
            
            // Only send non-empty messages
            if (message.trim() === "") return;

            chatSocket.send(JSON.stringify({
                'message': message,
                'username' : user_name
            }));
            messageInput.value = '';
        };
    }
});