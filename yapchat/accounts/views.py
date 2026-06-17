import json
import re
from smtplib import SMTPException
from time import perf_counter

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.mail import BadHeaderError
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse

from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.contrib.auth import update_session_auth_hash

from django.shortcuts import render
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db import transaction
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import ensure_csrf_cookie

from accounts.services.email_delivery import send_verification_email
from accounts.services.email_verification import (
    consume_email_verification_token,
    create_email_verification_token,
)  



# send_verification_email_task is the Celery task that will be called to send the verification email asynchronously. It is imported here so that it can be used in the register_user view to send the email without blocking the request-response cycle.
from accounts.tasks import send_verification_email_task

User = get_user_model()
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.]+$")
# Create your views here.

@require_http_methods(["GET"])
@ensure_csrf_cookie
def verify_email_page(request):
    # This page is opened when the user clicks the email link
    # The fragment token is read by frontend JavaScript and not django
    return render(request, 'accounts/email_verification.html')

@require_http_methods(["GET"])
def verify_email_success_page(request):
    return render(request, "accounts/verify_email_success.html")

def is_at_least_13(date_of_birth):
    today = timezone.localdate()
    age = today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )
    return age >= 13

@require_http_methods(["POST"])
@csrf_protect
def register_user(request):
    # TEMP DEBUG: registration timing instrumentation. Remove after profiling.
    request_started_at = perf_counter()
    print("[register] start: 0.000s")

    try:
        step_started_at = perf_counter()
        payload = json.loads(request.body.decode("utf-8"))
        print(f"[register] parse_input: {perf_counter() - step_started_at:.3f}s")
    except json.JSONDecodeError:
        print(f"[register] total: {perf_counter() - request_started_at:.3f}s")
        return JsonResponse({"ok": False, "message": "Invalid Request."}, status=400)

    validation_started_at = perf_counter()
    email = payload.get("email", "").strip()
    username = payload.get("username", "").strip()
    display_name = payload.get("display_name", "").strip()
    password = payload.get("password", "")
    date_of_birth_raw = payload.get("date_of_birth", "").strip()

    errors = {}

    if not email:
        errors["email"] = "Email is required."
    else:
        try:
            validate_email(email)
        except ValidationError:
            errors["email"] = "Enter a valid email address."
        if "email" not in errors:
            step_started_at = perf_counter()
            email_exists = User.objects.filter(email__iexact=email).exists()
            print(f"[register] email_uniqueness: {perf_counter() - step_started_at:.3f}s")
            if email_exists:
                errors["email"] = "An account with this email already exists."

    if not username:
        errors["username"] = "Username is required."
    elif len(username) < 3:
        errors["username"] = "Username must be at least 3 characters."
    elif len(username) > 32:
        errors["username"] = "Username must be 32 characters or less."
    elif not USERNAME_PATTERN.fullmatch(username):
        errors["username"] = "Use only letters, numbers, underscores, or periods."
    else:
        step_started_at = perf_counter()
        username_exists = User.objects.filter(username__iexact=username).exists()
        print(f"[register] username_uniqueness: {perf_counter() - step_started_at:.3f}s")
        if username_exists:
            errors["username"] = "That username is already taken."

    if display_name and len(display_name) > 32:
        errors["display_name"] = "Display name must be 32 characters or less."

    if not password:
        errors["password"] = "Password is required."
    elif len(password) < 8:
        errors["password"] = "Password must be at least 8 characters."
    else:
        try:
            validate_password(password)
        except ValidationError as exc:
            errors["password"] = exc.messages[0] if exc.messages else "Password is too weak."

    date_of_birth = parse_date(date_of_birth_raw) if date_of_birth_raw else None
    if date_of_birth is None:
        errors["date_of_birth"] = "Please select a valid date of birth."
    elif not is_at_least_13(date_of_birth):
        errors["date_of_birth"] = "You must be at least 13 years old to register."

    print(f"[register] validation: {perf_counter() - validation_started_at:.3f}s")

    if errors:
        print(f"[register] total: {perf_counter() - request_started_at:.3f}s")
        return JsonResponse(
            {
                "ok": False,
                "message": "Please fix the highlighted fields.",
                "errors": errors,
            },
            status=400,
        )

    try:
        atomic_started_at = perf_counter()
        with transaction.atomic():
            step_started_at = perf_counter()
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                date_of_birth=date_of_birth,
            )
            print(f"[register] create_user: {perf_counter() - step_started_at:.3f}s")

            step_started_at = perf_counter()
            if display_name:
                user.profile.display_name = display_name
                user.profile.save()
            print(f"[register] profile_display_name_save: {perf_counter() - step_started_at:.3f}s")

            step_started_at = perf_counter()
            _, raw_token = create_email_verification_token(user)
            print(f"[register] create_email_verification_token: {perf_counter() - step_started_at:.3f}s")

            step_started_at = perf_counter()
            verification_url = request.build_absolute_uri(reverse("verify_email_page"))
            verification_url = f"{verification_url}#token={raw_token}"

            def queue_verification_email():
                # TEMP DEBUG: this callback runs after the DB transaction commits.
                celery_started_at = perf_counter()
                send_verification_email_task.delay(
                    to_email=user.email,
                    username=user.profile.effective_display_name,
                    verification_url=verification_url,
                    idempotency_key=f"verify-email/{user.pk}",
                )
                print(f"[register] celery_publish: {perf_counter() - celery_started_at:.3f}s")

            transaction.on_commit(queue_verification_email)
            print(f"[register] on_commit_register: {perf_counter() - step_started_at:.3f}s")
        print(f"[register] transaction_atomic_exit: {perf_counter() - atomic_started_at:.3f}s")
    except (BadHeaderError, SMTPException, OSError) as exc:
        print(f"[register] total: {perf_counter() - request_started_at:.3f}s")
        return JsonResponse(
            {
                "ok": False,
                "message": "Account was not created because the verification email could not be sent.",
                "detail": str(exc) if settings.DEBUG else "",
            },
            status=502,
        )

    print(f"[register] total: {perf_counter() - request_started_at:.3f}s")
    return JsonResponse(
        {
            "ok": True,
            "message": "Account created. Check your email to verify your account.",
        },
        status=201,
    )

@require_http_methods(["POST"])
@csrf_protect
def verify_email_token(request):
    # Parse JSON sent by the frontend
    try:
        # payload contains the data sent by the frontend
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({
                            "ok": False, 
                            "message": "Invalid Request."
                            },status=400)
    
    # Extract the token from the JSON payload
    # payload.get("token", "") tries to get the value associated with the key "token" from the payload dictionary
    raw_token = payload.get("token", "").strip()
    if not raw_token:
        return JsonResponse({
                            "ok": False, 
                            "message": "Verification Token is required."
                            },status=400)
    
    # Delegate (means to pass on) the actual security logic to the service layer
    success, message = consume_email_verification_token(raw_token)
    if not success:
        return JsonResponse({
                            "ok": False, 
                            "message": message
                            },status=400)
    return JsonResponse({
                        "ok": True,
                        "message": message,
                        "redirect_url": "/verify/success/"
                        },status=200)

@login_required
@require_POST # only allow POST requests 
def update_profile(request):
    try:
        #1. Parse the JSON data sent from JS
        data=json.loads(request.body)
        
        #2. Get specific fields we want to update
        #.get() is safe because it returns None if the key is missing
        new_display_name = data.get('display_name')
        new_bio = data.get('bio')

        #3. Get the user's profile object
        profile = request.user.profile

        #4. Basic Validation (Backend must always revalidates)
        if new_display_name is not None:
            if len(new_display_name) > 32:
                return JsonResponse({'ok': False, 'message' : 'Display name too long'}, status=400)
            profile.display_name=new_display_name
        
        if new_bio is not None:
            if len(new_bio) > 200:
                return JsonResponse({'ok' : False, 'message' : 'Bio too long'}, status=400)
            profile.bio = new_bio

        #5. Save Changes to the database
        profile.save()

        return JsonResponse({
            'ok': True,
            'message': 'Profile updated sucessfully',
            'display_name' : profile.display_name,
            'bio' : profile.bio
        })
    except json.JSONDecodeError:
         return JsonResponse({'ok': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Error updating profile: {e}")
        return JsonResponse({'ok': False, 'message': 'Internal Server Error'}, status=500)

@login_required
@require_POST # only allow POST requests 
def change_username(request):
    try:
        data = json.loads(request.body)
        new_username = data.get('username', '').strip()
        password = data.get('password','')
        
        #1. Verify Password
        # Check_Password() is a built-in Django Function
        if not request.user.check_password(password):
            return JsonResponse({'ok': False, 'message': 'Incorrect password'}, status=403)
        #2. Validate Username(Uniqueness,length,patterns)
        if User.objects.filter(username__iexact=new_username).exists():
            return JsonResponse({'ok': False, 'message': 'Username already  taken'}, status=400)
        if len(new_username) > 32:
            return JsonResponse({'ok': False, 'message' : 'Username too long'}, status=400)
        if len(new_username) < 3:
            return JsonResponse({'ok': False, 'message' : 'Username too short'}, status=400)
        
        #3. Save
        request.user.username= new_username
        request.user.save()
        update_session_auth_hash(request,request.user)
        return JsonResponse({
            'ok': True,
            'message': 'Username Changed'
        })
    except json.JSONDecodeError:
         return JsonResponse({'ok': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Error updating profile: {e}")
        return JsonResponse({'ok': False, 'message': 'Internal Server Error'}, status=500)

        