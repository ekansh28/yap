# YapChat

YapChat is a real-time chat application built with Django that allows users to anonymously connect with strangers. It features an automated matchmaking system similar to Omegle, where users are paired into private chat rooms.

## Technologies Used

*   **Django (v6.0.2):** The core web framework used for handling HTTP requests, routing, and database interactions.
*   **Django Channels:** Extends Django to handle WebSockets, allowing for real-time, bidirectional communication between the client and server.
*   **ASGI (Asynchronous Server Gateway Interface):** Used via `daphne` to serve the application, enabling asynchronous capabilities required for WebSockets.
*   **WebSockets:** The protocol used for the chat functionality, ensuring instant message delivery without page reloads.
*   **Vanilla JavaScript:** Handles the frontend logic for connecting to WebSockets and DOM manipulation.
*   **98.css:** A Windows 98 inspired CSS framework for the retro UI design.

## Current Features

### 1. Automated Matchmaking (Lobby System)
*   **Logic:** Users do not manually create rooms. The server automatically handles room assignment.
*   **Waiting Room:** When a user clicks "Enter", the server checks for an existing room with a `waiting` status (partially full).
*   **Room Creation:** If no waiting rooms exist, the server creates a new room with a unique ID and assigns the user to it.
*   **Room Filling:** If a waiting room is found, the user joins it, and the room status is updated to `full`.

### 2. Real-Time Chat
*   **WebSocket Connection:** Upon entering a room, a WebSocket connection is established.
*   **Instant Messaging:** Messages sent by one user are instantly broadcast to the other user in the room via the Django Channels group layer.
*   **Username Persistence:** Usernames are temporarily stored in `localStorage` to identify senders within the session.

### 3. Retro UI
*   The interface is styled to resemble a Windows 98 application window, providing a nostalgic user experience.

## Project Structure

*   `yapchat/`: The main project configuration directory.
    *   `asgi.py`: Entry point for the ASGI server, routing both HTTP and WebSocket traffic.
    *   `settings.py`: Configuration for Django and Channels.
    *   `urls.py`: Main URL routing.
*   `chat/`: The main application app.
    *   `consumers.py`: Handles WebSocket events (connect, receive, disconnect) and message broadcasting.
    *   `models.py`: Defines the `Room` model for tracking room status.
    *   `routing.py`: Maps WebSocket URLs to consumers.
    *   `views.py`: Handles HTTP views for the index page and matchmaking logic (`join_lobby`).
    *   `templates/chat/`: Contains `main.html` (entry) and `room.html` (chat interface).
*   `static/`: Contains CSS and JavaScript files.

## How to Run

1.  **Install Dependencies:**
    ```bash
    pip install django channels daphne
    ```

2.  **Apply Migrations:**
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```

3.  **Run the Server:**
    ```bash
    python manage.py runserver
    ```

4.  **Access the App:**
    Open your browser and navigate to `http://127.0.0.1:8000/`.

## Usage
1.  Enter a username on the home page.
2.  Click "Enter" to get automatically matched into a room.
3.  Chat with the connected stranger!
