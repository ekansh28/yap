# YapChat

YapChat is a Django + Channels chat app for matching strangers into private rooms for real-time text chat and WebRTC video chat. The UI currently uses a Windows 98-inspired style through `98.css`, with a fully functional authentication and profile management system.

## Current State

This repo is an active prototype. The main working areas are:

- Stranger matchmaking into two-person chat rooms.
- WebSocket text messaging with saved message history.
- WebRTC video signaling over the same room WebSocket.
- Typing indicators.
- Partner disconnect / skip flow.
- A custom `accounts.User` model and `Profile` model.
- A fully wired Registration/Sign-in system with Email Verification via Celery.
- A modular Profile Editor with a custom-built Vanilla JS Image Cropper for avatars and banners.

## Tech Stack

- Django
- Django Channels
- Daphne / ASGI
- Celery (Background Tasks & Emails)
- Redis channel layer & Celery broker
- PostgreSQL
- WhiteNoise for static files
- Vanilla JavaScript (ES6 Modules)
- WebSockets
- WebRTC
- 98.css

## Features

### Landing Page

The landing page lives at `chat/templates/chat/main.html`.

It includes:

- Login / Signup button.
- Tag input UI for interests.
- Text Chat and Video Chat entry buttons.

### Auth & Profile System

The app features a robust user management system:

- **Authentication:** Login and Registration modals with comprehensive client-side and server-side validation.
- **Email Verification:** Background email sending powered by Celery to verify new users and email changes.
- **Profile Editor Modal:**
  - Edit Display Name and Bio.
  - Securely change Username, Email, and Password with atomic database transactions.
  - Account deletion flow.
- **Custom Image Cropper:** A completely custom, zero-dependency Vanilla JS image cropper. It features dragging constraints, dynamic CSS-transform zooming, and mathematical auto-centering for uploading Profile Avatars and Banners.

The frontend uses native ES6 modules for clean, modular code:
- `yapchat/accounts/static/accounts/js/profile_modal.js`
- `yapchat/accounts/static/accounts/js/profile_media.js`
- `yapchat/accounts/static/accounts/js/profile_api.js`

### Chat Rooms

The chat app automatically matches users into rooms with a capacity of 2.

The room flow is:

- `join_lobby` looks for a waiting room.
- If one exists, the user joins it.
- If none exists, a new room is created with a short UUID-based name.
- Rooms track `current_users`, `capacity`, and `isFull`.
- Empty rooms are cleaned up on disconnect.

### Real-Time Chat

Room messages are sent over WebSockets using Django Channels.

The app currently supports:

- Sending and receiving text messages.
- Saving messages to the database.
- Loading recent message history on connect.
- Sender-side display for your own messages.
- Partner-left events.
- Typing start / stop events.

### Video Chat

The room page includes local and remote video windows.

WebRTC signaling messages are routed through the room WebSocket:

- `webrtc_offer`
- `webrtc_answer`
- `webrtc_ice_candidate`

The client currently uses a Google STUN server:

```js
stun:stun.l.google.com:19302
```

## Local Setup

From the repo root:

```powershell
cd yapchat
```

Create and activate a virtual environment if needed:

```powershell
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
```

Install the Python dependencies used by the current codebase:

```powershell
pip install django channels daphne channels-redis dj-database-url python-dotenv whitenoise django-browser-reload psycopg celery
```

Apply migrations:

```powershell
python manage.py makemigrations
python manage.py migrate
```

### Running the App

You will need two terminal windows to run both the Django server and the Celery worker (for sending emails).

**Terminal 1 (Django Server):**
```powershell
python manage.py runserver
```

**Terminal 2 (Celery Worker):**
```powershell
# On Windows, --pool=solo is recommended for local development
celery -A yapchat worker -l info --pool=solo
```

Then open:

```text
http://127.0.0.1:8000/
```

## Environment Notes

The app currently expects a PostgreSQL-compatible database and a Redis-compatible Channels layer.

Recommended `.env` values:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
REDIS_URL=rediss://USER:PASSWORD@HOST:PORT
```

The current `settings.py` uses `dj_database_url` and a configured Channels Redis layer. For production or shared development, secrets should live in `.env` instead of being committed directly in settings.
