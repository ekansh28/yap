function getTokenFromFragment() {
    // The token is expected to be in the URL fragment (after the #)
    const hash = window.location.hash;

    if (!hash || !hash.startsWith('#')) {
        return null;
    }

    const fragment = new URLSearchParams(hash.slice(1)); // Remove the '#' character
    return fragment.get('token');
}

// Read the CSRF token django rendered in the page
function getCSRFToken() {
    const cookieName = "csrftoken=";
    const cookies = document.cookie ? document.cookie.split(";") : [];

    for (const cookie of cookies) {
        const trimmedCookie = cookie.trim();
        if (trimmedCookie.startsWith(cookieName)) {
            return decodeURIComponent(trimmedCookie.slice(cookieName.length));
        }
    }

    return "";
}

async function verifyToken() {
    const messageElement = document.getElementById('verification-status');
    const statusElement = document.getElementById('status');
    const token = getTokenFromFragment();

    if (!token) {
        if (messageElement) {
            messageElement.textContent = "The verification link is missing a token.";
        }
        statusElement.hidden = false;
        statusElement.textContent = "Invalid Link.";
        return;
    }

    try {
        const response = await fetch('/api/verify-email/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();

        statusElement.hidden = false;
        statusElement.textContent = data.message || "Verification Complete.";

        if (data.ok) {
            if (messageElement) {
                messageElement.textContent = "Your email has been successfully verified.";
            }
            history.replaceState(null, '', window.location.pathname); // Clear the token from the URL

            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            }
        } else {
            if (messageElement) {
                messageElement.textContent = "The verification link is invalid or has expired.";
            }
        }
    } catch (error) {
        if (messageElement) {
            messageElement.textContent = "An error occurred while verifying your email. Please try again later.";
        }
        statusElement.hidden = false;
        statusElement.textContent = "Network or Server Error.";
    }
}
verifyToken();
