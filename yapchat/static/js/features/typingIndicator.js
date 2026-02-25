// Reference to the typign indicator dom element
const typingIndicatorElement = document.getElementById("typing-indicator");
let typingTimeout = null;

// Client-Side Functions
/**
 * Initializes Typing Detection on the chat message input field.
 * if the user types it sends a 'typing_start' signal.
 * when user stops for a short period it sends 'typing_stop' signal.
 * 
 */
export function initSenderTypingDetection(messageInput, chatSocket, username){
    if(!messageInput || !chatSocket || !username){
        console.error("initSenderTypingDetection : Missing Required Parameters");
        return;
    }

    // attach an input event listener to the message input field
    // this event fires whenever the user types
    messageInput.addEventListener('input', () => {
        // Step 1: Send a 'typing_start' signal immediately
        // This tells the server that the user is typing

        chatSocket.send(JSON.stringify({
            'type': 'typing_start',
            'username' : username
        }));

        // Step 2: Implement Debouncing for 'typing_stop' signal
        // If theres an existing timeout(meaning the user typed recently) it will clear it
        // This prevents sending 'typing_stop' too early if the user is still actively typing
        if(typingTimeout){
            clearTimeout(typingTimeout);
        }

        // Set a new timeout. If this timeout completes without being cleared (i.e the user stops tyoing)
        // it means the user has been inactive for 2 seconds so we send a 'typing_stop' signal
        typingTimeout = setTimeout(() =>{
            chatSocket.send(JSON.stringify({
                'type': 'typing_stop',
                'username': username
            }));
            typingTimeout = null;
        },2000); // the delay before sending 'typing_stop' (2 seconds)
    });
}

// Receiver Side
/**
 * Handles an incoming 'typing_start' signal from a remote user
 * It displays the typing indicator with the remote user's username
 */
export function handleTypingStart(username){
    // check if the typing indicator exists in the HTML.
    if(typingIndicatorElement){
        // update the text content to show who is typing
        typingIndicatorElement.textContent = `${username} is typing...`
        typingIndicatorElement.style.display = 'block';
    }
}

/**
 * Handles an incoming 'typing_stop' signal from a remote user.
 * It hides the typing indicator
 */
export function handleTypingStop(){
    // Check if the typing indicator exists in the HTML.
    if(typingIndicatorElement){
        // Clear the text content
        typingIndicatorElement.textContent = '';
        // Hide the indicator
        typingIndicatorElement.style.display = 'none';
    }
}

export function stopTypingImmediately(chatSocket, username) {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
    // Only send if chatSocket is open and user was potentially typing
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
            'type': 'typing_stop',
            'username': username
        }));
    }
}