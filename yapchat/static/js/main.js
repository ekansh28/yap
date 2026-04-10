import { initSenderTypingDetection, handleTypingStart, handleTypingStop, stopTypingImmediately } from './features/typingIndicator.js';

function getCookie(name) {
    let cookieValue = null;
    if(document.cookie && document.cookie !== ''){
        const cookies = document.cookie.split(';');
        for(let i= 0; i < cookies.length; i++){
            const cookie = cookies[i].trim();
            if(cookie.substring(0,name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
document.addEventListener('DOMContentLoaded', () => {
    // DOM ELEMENTS
    const roomName = JSON.parse(document.getElementById('room-name').textContent);
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    const chatLog = document.querySelector("#chat-log");
    const messageInput = document.querySelector("#chat-message-input");   
    const messageSubmit = document.querySelector('#chat-message-submit');

    let localStream;
    let peerConnection;
    let iceCandidatesQueue = []; 
    let remoteUsernameDisplay = document.getElementById('remote-username-display'); 
    let isMuted = false;
    let currentOpenMenu = null;
    
    const muteToggleButton = document.getElementById('remote-video-close-button');
    const skipButton = document.getElementById('skip-button');

    const user_name = localStorage.getItem('chat_username') || 'Anonymous';
    console.log("Retrieved username from storage:", user_name);
    
    const stunServers = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    };

    // Setting up WebSocket
    const chatSocket = new WebSocket(
        'ws://' + window.location.host + '/ws/chat/' + roomName + '/'
    );

    function sendSignal(type,sdp,candidate){
        chatSocket.send(JSON.stringify({
            'type' : type,
            'sdp' : sdp,
            'candidate' : candidate,
            'username' : user_name // Added username
        }));
    }

    function processIceQueue(){
        if(iceCandidatesQueue.length > 0){
            console.log("Processing Queued Ice Candidates... (" + iceCandidatesQueue.length + ")");
            iceCandidatesQueue.forEach(candidate => {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error("Error Adding Queued ICE Candidates",e));
            });
            iceCandidatesQueue = []; // Clearing the queue
        }
    }
    // Handle Incoming Messages
    chatSocket.onmessage = async function(e) {
        const data = JSON.parse(e.data);
        
        // Differentiating between Chat Messages and WebRTC Signaling
        if (data.type == 'chat_message') {
            // ^^ This is conditional executes if the data is a message 

            const sender = data.username ? data.username : "Stranger";
            const messageText = data.message;

            if (sender === user_name){
                return;
            }
            
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message-item');

            messageElement.innerHTML = `
                <span class="message-content">${sender}: ${messageText}</span>
                <span class="message-options-button">&#x22EE;</span>
            `
            chatLog.appendChild(messageElement);
            chatLog.scrollTop = chatLog.scrollHeight;

        } else if (data.type == 'webrtc_offer'){
            console.log("Received WebRTC Offer!");
            handleOffer(data.sdp, data.username);
        } else if (data.type == 'webrtc_answer'){
            console.log("Received WebRTC Answer!");
            handleAnswer(data.sdp, data.username);
        } else if (data.type == "webrtc_ice_candidate"){
            // receieved an ICE Candidate from the other peer
            console.log("Received ICE Candidate!");
            if (data.candidate){
                // if remote description is set, add candidate immediately
                if(peerConnection && peerConnection.remoteDescription){
                    peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
                        .catch(error => console.error("Error Adding ICE Candidate:", error));                
                } else {
                    //otherwise queue it for later
                    console.log("Remote description not set yet, Adding the user to the queue..");
                    iceCandidatesQueue.push(data.candidate);
                }
            }
        } else if (data.type == 'typing_start'){
            handleTypingStart(data.username);
        } else if (data.type == 'typing_stop'){
            handleTypingStop();
        } else if (data.type == 'partner_left'){
            console.log("Partner left signal received:", data.message);
            chatLog.value += (data.message + "\n");
            chatLog.scrollTop = chatLog.scrollHeight;

            const randomDelay = Math.floor(Math.random() * 2000) + 500;
            await new Promise(resolve => setTimeout(resolve, 1500));

            cleanupAndClose();
            
            window.location.href = '/chat/new-room-request/';
        } else {
            console.log("Unknown Message Type:", data.type);
        }
    };


    // Add click listener to the mute toggle button
    if (muteToggleButton) {
        muteToggleButton.addEventListener('click', () => {
            isMuted = !isMuted; // Toggle the boolean state
            console.log("Mute button clicked. isMuted:", isMuted);

            if (isMuted) {
                // Apply muted state: add CSS class, mute remote video audio
                muteToggleButton.classList.add('is-muted');
                if(remoteVideo && remoteVideo.srcObject){ // ensure srcobject exists
                    const remoteAudioTracks = remoteVideo.srcObject.getAudioTracks();
                    if(remoteAudioTracks.length > 0){
                        remoteAudioTracks[0].enabled = false; // disabling audio track
                        console.log("Remote Audio Disabled.")
                    }
                }
            } else {
                // Apply unmuted state: remove CSS class, unmute remote video audio
                muteToggleButton.classList.remove('is-muted');
                if(remoteVideo && remoteVideo.srcObject){ // ensure srcobject exists
                    const remoteAudioTracks = remoteVideo.srcObject.getAudioTracks();
                    if(remoteAudioTracks.length > 0){
                        remoteAudioTracks[0].enabled = true; // disabling audio track
                        console.log("Remote Audio enabled.")
                    }
                }            
                // Attempt to play if it was paused (e.g., by autoplay policy that stopped audio)
                remoteVideo.play().catch(e => console.error("Error playing remote video after unmute:", e));
            }
        });
    }

    if(skipButton) {
        skipButton.addEventListener('click', async () => {
            console.log("Skipped User");
            chatLog.value += ("You have disconnected from your partner. Finding a new one...\n");
            chatLog.scrollTop = chatLog.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds

            // Making a request to the backend to delete messages for the current room
            try {
                const response = await fetch(`/chat/delete-messages/${roomName}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type' : 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                        // if we get 403 forbidden error then we need to add a csrf token for protection to get a getcookie function
                    },

                });

                const data = await response.json();
                if (response.ok) {
                    console.log(data.message);
                } else {
                    console.error("Error deleting messages:", data.message);
                } 
            } catch (error) {
                console.error("Network Error while deleting Messages :", error);
            }

            // Clean up local connections
            cleanupAndClose();

            // Redirect to a new, empty lobby
            window.location.href = '/chat/new-room-request/';
        })
    }




    function cleanupAndClose(){
        console.log('Cleaning up and closing connections..')

        // close the peer connection if exists
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        // close websocket connection
        if (chatSocket){
            chatSocket.onclose = null;
            chatSocket.close();
        }

        // Reset Video Elements
        if (remoteVideo && remoteVideo.srcObject) {
            remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            remoteVideo.srcObject = null;
        }
        
        // Clear Chat Log
        if (chatLog) {
            chatLog.value = '';
        }
    }
    // Offer/Answer Handlers
    function createOffer(){
        console.log("Creating Offer...");
  
        peerConnection.createOffer()
            .then(offer => {
                peerConnection.setLocalDescription(offer);
                sendSignal('webrtc_offer', offer, null);
            }).catch(error => console.error("Error Creating Offer:", error));
    }

    function handleOffer(sdp, remoteUsername){
        console.log("Handling Offer...");

        // Glare Handling: if we already made an offer (have-local-offer state)
        // rollback our local offer before processing the inconming offer
        if(remoteUsername && remoteUsernameDisplay) {
            remoteUsernameDisplay.textContent = remoteUsername;
        }
        if(peerConnection.signalingState === "have-local-offer"){
            peerConnection.setLocalDescription({type: "rollback"})
                .then(() => peerConnection.setRemoteDescription(sdp))
                .then(() =>{
                    console.log("Remote Description Set. Processing Queue...");
                    processIceQueue();
                })
                .then(() => peerConnection.createAnswer())
                .then(answer => peerConnection.setLocalDescription(answer))
                .then(() => sendSignal('webrtc_answer', peerConnection.localDescription, null))
                .catch(error => console.error("Error handling GLARE SITUATION (offer received while having local offer): ", error));
        } else {
            //standard offer handling: process the remote offer
            peerConnection.setRemoteDescription(sdp)
                .then(() => {
                    console.log("Remote Description Set. Processing Queue...");
                    processIceQueue();
                    console.log("Creating Answer...");
                    return peerConnection.createAnswer();
                })
                .then(answer => {
                    peerConnection.setLocalDescription(answer);
                    sendSignal('webrtc_answer', answer, null);
                })
                .catch(error => console.error("Error handling Offer: ", error));
        }

    }

    function handleAnswer(sdp, remoteUsername){
        console.log("Handling Answer...");
        // An answer should only be processed if we have previously sent an offer
        // and are waiting for an answer (i.e : signalingState is 'have-local-offer)
        if(remoteUsername && remoteUsernameDisplay) {
            remoteUsernameDisplay.textContent = remoteUsername;
        }
        if(peerConnection && peerConnection.signalingState === "have-local-offer") {
            peerConnection.setRemoteDescription(sdp)
                .then(() => {
                    console.log("Remote Description Set. Processing Queue...");
                    processIceQueue();
                })
                .catch(e => console.error("Error setting remote description for answer: ", e));
        } else {
            console.warn("Received an answer but not in 'local-have-offer' state, Current State: ", peerConnection ? peerConnection.signalingState : "NOT INITIALIZED");
        }
    }
        // Getting User Media and Display Locally
    navigator.mediaDevices.getUserMedia({video:true,audio:true,})
        .then(stream => {
            // Storing the Stream into localStream to use it for the peer connection
            localStream = stream
            // Attaching the stream to the local-video element to display it
            localVideo.srcObject = stream;
            
            // Initialize peerconnection only ONCE after the local stream is ready.
            peerConnection = new RTCPeerConnection(stunServers);

            // Adding local tracks to this peerconnection
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Setting up an event handler for receiving remote tracks
            peerConnection.ontrack = event => {
                console.log("Received Remote Track:", event.track.kind);
                
                const stream = event.streams[0];

                if (remoteVideo.srcObject !== stream) {
                    console.log("New remote stream received. Setting video source.");
                    remoteVideo.srcObject = stream;
                }

                // Only try to play if paused, to avoid "Interrupted by new load request" error
                if (remoteVideo.paused) {
                    remoteVideo.play().catch(e => console.error("Error playing remote video:", e));
                }
            };

            // Fallback: clicked anywhere on page to resume audio context (often needed for Chrome/Safari)
            document.body.addEventListener('click', () => {
                 if (remoteVideo.paused && remoteVideo.srcObject) {
                     remoteVideo.play().catch(e => console.error("Error playing remote video on click:", e));
                 }
            });
            
            // Setting up an event handler for receiving ICE Candidates
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    console.log("New ICE Candidate found, sending it to the peer connection...");
                    sendSignal('webrtc_ice_candidate', null, event.candidate);
                };
            }
            // Once we have the local stream and peer connection is set up
            //  we decide to create an offer or wait for one
            if (chatSocket.readyState === WebSocket.OPEN){
                console.log("Socket Already Open, Creating Offer.");
                createOffer();
            } else {
                // if not, wait for the open event
                console.log("Waiting for socket to open...");
                chatSocket.onopen = () => {
                    console.log("Socket has opened, Creating Offer...");
                    createOffer();
                };
            }
        }).catch(error => {
            console.error("Error Accessing media devices.", error);
        })

    chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
    };

    // Text Chat Logic
    if (messageInput) {
        messageInput.focus();
        messageInput.onkeyup = function(e) {
            if (e.key === 'Enter') {  // enter, return
                if (messageSubmit) {
                    messageSubmit.click();
                }
            }
        };

        // initialize sender-side typing detection from the module
        initSenderTypingDetection(messageInput, chatSocket, user_name);
    }

    if (messageSubmit) {
        messageSubmit.onclick = function(e) {
            if (!messageInput) return;
            
            const message = messageInput.value;
            // Only send non-empty messages
            if (message.trim() === "") return;
            chatSocket.send(JSON.stringify({
                'type': 'chat_message', 
                'message': message,
                'username' : user_name
            }));
            
            // creating div element for messsages
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message-item', 'self-sent');
            messageElement.innerHTML = `
            <span class="message-content">You: ${message}</span>
            <span class="message-options-button">&#x22EE;</span>
            `;
            chatLog.appendChild(messageElement);
            messageInput.value = '';
            chatLog.scrollTop = chatLog.scrollHeight;

            // Immediately stops the type indicator when message is sent.
            stopTypingImmediately(chatSocket, user_name);
        };
    }

    // --- Add Event Listener for Message Options Button Clicks ---
    chatLog.addEventListener('click', (e) => {
        // Check if the clicked element (or its parent) is the message-options-button
        const optionsButton = e.target.closest('.message-options-button');
        if (optionsButton) {
            e.stopPropagation(); // Prevent event from bubbling up further

            const messageElement = optionsButton.closest('.chat-message-item');
            if (messageElement) {
                displayMessageOptionsMenu(optionsButton, messageElement);
            }
        }
    });

    // --- Placeholder for the menu display function ---
    function displayMessageOptionsMenu(clickedButton, messageElement) {
        // Close any other open menu first
        if (currentOpenMenu) {
            currentOpenMenu.remove();
            currentOpenMenu = null;
        }

        const menu = document.createElement('div');
        menu.classList.add('message-options-menu'); // For CSS styling
        
        // Create the translate icon button
        const translateOption = document.createElement('img');
        translateOption.src = '/static/image/translate-icon.png'; // Make sure this path is correct
        translateOption.classList.add('menu-icon'); // For CSS styling
        translateOption.alt = 'Translate';
        translateOption.title = 'Translate Message';
        
        // Add click listener for the translate icon
            // Inside displayMessageOptionsMenu in main.js
    translateOption.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeMenu();

        const originalMessageSpan = messageElement.querySelector('.message-content');
        const fullText = originalMessageSpan.textContent;

        // Split "Username: Message" and take only the message part
        const parts = fullText.split(': ');
        const username = parts[0];
        const textToTranslate = parts.slice(1).join(': '); // Handles cases where the message has colons

        originalMessageSpan.textContent = "Translating...";

        try {
            const response = await fetch('/chat/translate-message/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ message_text: textToTranslate }), // Send only the message text
            });

            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success') {
                    // Reconstruct the string with the original username
                    originalMessageSpan.textContent = `${username}: ${data.translated_text}`;
                }
            }
        } catch (error) {
            console.error("Translation error:", error);
        }
    });

        menu.appendChild(translateOption);
        
        // Position the menu
        const buttonRect = clickedButton.getBoundingClientRect();
        
        // Append to body first to calculate its size correctly
        document.body.appendChild(menu);

        const menuRect = menu.getBoundingClientRect();

        // Position above the button, horizontally centered with the button or to its right
        // Adjust these values as needed for precise positioning
        menu.style.position = 'absolute';
        menu.style.left = `${buttonRect.right - menuRect.width}px`; // Align right edge of menu with right edge of button
        menu.style.top = `${buttonRect.top - menuRect.height - 5}px`; // 5px above the button
        
        currentOpenMenu = menu; // Store reference to the open menu

        // Close menu if user clicks anywhere else on the document
        document.addEventListener('click', closeMenu);
    }

    // Helper function to close the menu
    function closeMenu() {
        if (currentOpenMenu) {
            currentOpenMenu.remove();
            currentOpenMenu = null;
            document.removeEventListener('click', closeMenu); // Remove listener to prevent memory leaks
        }
    }



});