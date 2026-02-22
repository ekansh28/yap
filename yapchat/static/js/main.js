console.log("RUNNING LATEST JAVASCRIPT - Video Chat Version");

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
        }));
    }
    // Handle Incoming Messages
    chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        
        // Differentiating between Chat Messages and WebRTC Signaling
        if (data.type == 'chat_message') {
            // ^^ This is conditional executes if the data is a message 
            const sender = data.username ? data.username : "Stranger";
            chatLog.value += (sender + ": " + data.message + "\n");
        } else if (data.type == 'webrtc_offer'){
            console.log("Received WebRTC Offer!");
            handleOffer(data.sdp);
        } else if (data.type == 'webrtc_answer'){
            console.log("Received WebRTC Answer!");
            handleAnswer(data.sdp);
        } else if (data.type == "webrtc_ice_candidate"){
            // receieved an ICE Candidate from the other peer
            console.log("Received ICE Candidate!");
        } else{
            console.log("Unknown Message Type:", data.type);
        }
    };

    // Creating and Configuring RTCPeerConnection
    function createPeerConnection(){
        peerConnection = new RTCPeerConnection(stunServers);

        // Adding Local Stream Tracks to the Connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Setting up an Event Handler for receiving Remote Tracks
        peerConnection.ontrack = event => {
            console.log("Received Remote Track");
            remoteVideo.srcObject = event.streams[0];
        };

        // Setting up an Event Handler for receiving ICE Candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log("New ICE Candidate Found, Sending it to peer...");
                sendSignal('webrtc_ice_candidate', null, event.candidate);
            }
        };
    }

    // Offer/Answer Handlers
    function createOffer(){
        console.log("Creating Offer...");
        createPeerConnection();
        peerConnection.createOffer()
            .then(offer => {
                peerConnection.setLocalDescription(offer);
                sendSignal('webrtc_offer', offer, null);
            }).catch(error => console.error("Error Creating Offer:", error));
    }

    function handleOffer(sdp){
        console.log("Handling Offer...");
        createPeerConnection();
        peerConnection.setRemoteDescription(sdp)
            .then(() => {
                console.log("Creating Answer...");
                return peerConnection.createAnswer();
            })
            .then(answer => {
                peerConnection.setLocalDescription(answer);
                sendSignal('webrtc_answer', answer, null);
            })
            .catch(error => console.error("Error handling Offer: ", error));
    }

    function handleAnswer(sdp){
        console.log("Handling Answer...");
        peerConnection.setRemoteDescription(sdp)
            .catch(error => console.error("Error handling ICE Candidate: ", error));
    }
        // Getting User Media and Display Locally
    navigator.mediaDevices.getUserMedia({video:true,audio:true,})
        .then(stream => {
            // Storing the Stream into localStream to use it for the peer connection
            localStream = stream
            // Attaching the stream to the local-video element to display it
            localVideo.srcObject = stream;
            
            // Once we have the local stream we create an offer
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
            messageInput.value = '';
        };
    }


});