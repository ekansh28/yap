# YapChat

YapChat is a Django + Channels chat app for matching strangers into private rooms for real-time text chat and WebRTC video chat. The UI currently uses a Windows 98-inspired style through `98.css`, with a newer authentication modal prototype being built into the landing page.

## Current State

This repo is an active prototype. The main working areas are:

- Stranger matchmaking into two-person chat rooms.
- WebSocket text messaging with saved message history.
- WebRTC video signaling over the same room WebSocket.
- Typing indicators.
- Partner disconnect / skip flow.
- A custom `accounts.User` model and `Profile` model.
- A registration/sign-in modal prototype with email, display name, username, password, date of birth, and OAuth-style buttons.

## Tech Stack

- Django 6
- Django Channels
- Daphne / ASGI
- Redis channel layer through Upstash-compatible `rediss://`
- PostgreSQL, currently configured through `dj-database-url`
- Supabase Postgres-compatible database setup
- WhiteNoise for static files
- `django-browser-reload` for development refreshes
- Vanilla JavaScript
- WebSockets
- WebRTC
- 98.css

## Features

### Landing Page

The landing page lives at `chat/templates/chat/main.html`.

It includes:

- Login / Signup button.
- Auth modal component from `accounts/templates/accounts/components/auth_modal.html`.
- Tag input UI for interests.
- Text Chat and Video Chat entry buttons.

### Auth Modal Prototype

The auth modal currently includes:

- Email field with required validation.
- Display name field with a character counter.
- Username field with:
  - `0/32` counter.
  - allowed-character guidance.
  - minimum length validation.
  - animated helper text.
- Password field with required and minimum length validation.
- Date of birth dropdowns for day, month, and year.
- Hidden DOB value formatted as `YYYY-MM-DD`.
- Required warning icons using `warning.png`.
- Discord and Google OAuth-style buttons with logo placeholders/images.
- Fade, slide, and shake feedback animations.

The frontend files are:

- `yapchat/accounts/templates/accounts/components/auth_modal.html`
- `yapchat/accounts/static/accounts/css/auth_modal.css`
- `yapchat/accounts/static/accounts/js/auth_modal.js`

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

## Project Structure

```text
yap/
|-- README.md
|-- package.json
|-- package-lock.json
`-- yapchat/
    |-- manage.py
    |-- accounts/
    |   |-- models.py
    |   |-- signals.py
    |   |-- migrations/
    |   |-- static/accounts/
    |   |   |-- css/auth_modal.css
    |   |   |-- js/auth_modal.js
    |   |   `-- images/
    |   `-- templates/accounts/components/auth_modal.html
    |-- chat/
    |   |-- consumers.py
    |   |-- models.py
    |   |-- routing.py
    |   |-- urls.py
    |   |-- views.py
    |   `-- templates/chat/
    |       |-- main.html
    |       `-- room.html
    |-- static/
    |   |-- css/
    |   `-- js/
    `-- yapchat/
        |-- asgi.py
        |-- settings.py
        |-- urls.py
        `-- wsgi.py
```

## Data Models

### `accounts.User`

Custom user model extending Django `AbstractUser`.

Current extra fields:

- `email`
- `email_verified`
- `date_of_birth`
- `created_at`
- `updated_at`

### `accounts.Profile`

User profile model with:

- `display_name`
- `bio`
- `avatar_key`
- `banner_key`
- `status_preference`
- timestamps

### `chat.Room`

Tracks matchmaking room state:

- `name`
- `capacity`
- `isFull`
- `current_users`

### `chat.Message`

Stores chat history:

- `room`
- `content`
- `sender`
- `timestamp`

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
pip install django channels daphne channels-redis dj-database-url python-dotenv whitenoise django-browser-reload psycopg
```

Install Node dependencies if you are working with the existing package setup:

```powershell
cd ..
npm install
cd yapchat
```

Apply migrations:

```powershell
python manage.py makemigrations
python manage.py migrate
```

Run the dev server:

```powershell
python manage.py runserver
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

## Useful Commands

Check the Django project:

```powershell
python manage.py check
```

Create migrations:

```powershell
python manage.py makemigrations
```

Apply migrations:

```powershell
python manage.py migrate
```

Run the server:

```powershell
python manage.py runserver
```

Check the auth modal JavaScript syntax:

```powershell
node --check yapchat\accounts\static\accounts\js\auth_modal.js
```

## Current Caveats

- The auth modal is currently a frontend prototype. Backend registration/login/OAuth handling still needs to be connected.
- The README does not list pinned Python package versions because there is no committed `requirements.txt` yet.
- Secrets and connection strings should be moved fully into environment variables before production use.
- WebRTC behavior depends on browser permissions, network conditions, and STUN/TURN availability.
