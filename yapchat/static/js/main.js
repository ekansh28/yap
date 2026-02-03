document.addEventListener('DOMContentLoaded', () => {
    const chatLog = document.getElementById('chat-log');
    const messageInput = document.getElementById('chat-message-input');
    const sendButton = document.getElementById('chat-message-submit');
    const muteButton = document.getElementById('btn-mute');
    const videoOffButton = document.getElementById('btn-video-off');
    const shareScreenButton = document.getElementById('btn-share-screen');
    const stopButton = document.querySelector('.btn-stop');

    // Helper to append message
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text; // In a real app, use textContent for safety
        chatLog.appendChild(messageDiv);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // Send Message Logic
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
            appendMessage('You: ' + message, 'you');
            messageInput.value = '';
            // Here you would typically send the message via WebSocket
        }
    }

    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Media Control Placeholders
    let isMuted = false;
    muteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        muteButton.textContent = isMuted ? 'Unmute Audio' : 'Mute Audio';
        console.log('Audio muted:', isMuted);
    });

    let isVideoOff = false;
    videoOffButton.addEventListener('click', () => {
        isVideoOff = !isVideoOff;
        videoOffButton.textContent = isVideoOff ? 'Video On' : 'Video Off';
        console.log('Video off:', isVideoOff);
    });

    shareScreenButton.addEventListener('click', () => {
        console.log('Share screen clicked');
        // Logic for getDisplayMedia would go here
    });

    stopButton.addEventListener('click', () => {
        console.log('Stop button clicked');
        appendMessage('You have disconnected.', 'system');
        // Logic to close connection
    });
});
