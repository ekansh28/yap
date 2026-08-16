import json
import re
from smtplib import SMTPException
from time import perf_counter

from django.conf import settings
from django.contrib.auth import authenticate, login, logout, get_user_model, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.mail import BadHeaderError
from django.core.exceptions import ValidationError

from django.core.validators import validate_email
from django.http import JsonResponse

from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST, require_GET


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


from accounts.models import UserDevice, DeviceVerificationCode                  
from accounts.services.device_verification import (                             
    is_device_verified,                                                         
    create_device_verification_challenge                                        
)                                                                               


from accounts.services.r2_storage import (
    upload_to_r2_or_local,
    delete_from_r2_or_local
)
from accounts.tasks import send_verification_email_task, send_device_verification_code_task   

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
                    idempotency_key=f"verify-email/{user.pk}/{timezone.now().timestamp()}",
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
def login_view(request):
    """                                                                         
    Authenticates user credentials. If the credentials are valid but            
    the device is unrecognized/unverified, it creates a 5-digit verification    
challenge                                                                         
    and returns requires_device_verification: True to open the verification     
modal.                                                                            
    """  
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "message": "Invalid Request."}, status=400)

    username_or_email = payload.get("login", "").strip()
    password = payload.get("password", "")

    if not username_or_email or not password:
        return JsonResponse({"ok": False, "message": "Email/Username and password are required."}, status=400)

    # Try to find user by username or by email
    user = User.objects.filter(username__iexact=username_or_email).first() or \
    User.objects.filter(email__iexact=username_or_email).first()

    if user:
        # Always authenticate via username — Django's default backend requires it
        authenticated_user = authenticate(request, username=user.username, password=password)
    else:
        authenticated_user = None

    if authenticated_user is not None:
        # Check if this device is trusted for this user
        if not is_device_verified(authenticated_user, request):
          # Create 5-digit challenge code in DB
          session_token, raw_code = create_device_verification_challenge(authenticated_user,request)

          # Queue Celery background email task
          send_device_verification_code_task.delay(
              to_email=authenticated_user.email,
              username=authenticated_user.profile.effective_display_name,
              code=raw_code
          )

          # Mask email address for user privacy (e.g. e****h@gmail.com)
          email_parts = authenticated_user.email.split("@")
          username_part = email_parts[0]
          if len(username_part) > 2:
              masked_user = f"{username_part[0]}***{username_part[-1]}"
          else: 
              masked_user = "***"
          masked_email = f"{masked_user}@{email_parts[1]}"

          # Tell frontend to show 5 digit verification modal
          return JsonResponse({
              "ok": True,
              "requires_device_verification": True,
              "session_token": session_token,
              "masked_email": masked_email
          })

        # Device is already verified -> proceeds to standard login
        login(request, authenticated_user)
        return JsonResponse({"ok": True, "message": "Login successful."})
    else:
        return JsonResponse({"ok": False, "message": "Invalid credentials."}, status=400)

@require_POST
@csrf_protect
def verify_device_code(request):
    """                                                                         
    Validates the 5-digit security code entered by the user in the frontend     
modal.                                                                            
    If valid, registers the device as trusted in UserDevice and logs the user in.
    """  
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "message":"Invalid Request."}, status=400)

    session_token = payload.get("session_token", "").strip()
    code = payload.get("code", "").strip()

    # Validate code format (must be exactly 5 digits)
    if not session_token or not code or len(code) != 5 or not code.isdigit():
        return JsonResponse({"ok": False, "message" : "Please enter a valid 5-digit code."}, status=400)

    # Look up active verification challenged by session_token
    challenge = DeviceVerificationCode.objects.filter(session_token=session_token).first()

    if not challenge or not challenge.is_valid():
        return JsonResponse({"ok": False, "message" : "Verification code expired or invalid. Please try logging in aagain."}, status =400)
    # increment attempt count for security tracing
    challenge.attempts += 1

    # verify SHA-256 code hash
    if not challenge.check_code(code):
        challenge.save()
        remaining_attempts = 5 - challenge.attempts
        return JsonResponse({"ok":False, "message": f"incorrect code. {remaining_attempts} attempt(s) remaining."}, status= 400)

    # Code is correct, mark challenge as used
    challenge.used_at = timezone.now()
    challenge.save()

    # Register this device in UserDevice table as trusted
    UserDevice.objects.get_or_create(
        user=challenge.user,
        device_hash = challenge.device_hash,
        defaults= {
            "device_name" : challenge.device_name,
            "ip_address" : challenge.ip_address
        }
    )

    # Complete login session
    login(request,challenge.user)

    return JsonResponse({
        "ok": True,
        "message": "Device successfully verified! Logging in..."
    })

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
@require_POST
def resend_verification(request):
    """
    RESENDS EMAIL VERIFICATION LINK TO USERS EMAIL
    """
    try:
        if request.user.email_verified:
            return JsonResponse({'ok': False,'message': 'Email is already verified.'}, status=400)
        with transaction.atomic():
            # Generate a new verification token
            _, raw_token = create_email_verification_token(request.user)

            # Build the absolute URL for the verification page
            verification_url = request.build_absolute_uri(reverse("verify_email_page"))
            verification_url = f"{verification_url}#token={raw_token}"

            # Queue email using Celery
            def queue_verification_email():
                send_verification_email_task.delay(
                    to_email=request.user.email,
                    username=request.user.profile.effective_display_name,
                    verification_url=verification_url,
                    idempotency_key=f"verify-email-resend/{request.user.pk}/{timezone.now().timestamp()}"
                )
            transaction.on_commit(queue_verification_email)
            
        return JsonResponse({'ok': True, 'message': 'Verification email sent! Please check your inbox.'})
    except Exception as e:
        print(f'Error in resend_verification: {e}')
        return JsonResponse({'ok': False, 'message': 'Internal Server Error'}, status=500)

@login_required
@require_POST # only allow POST requests 
def update_profile(request):
    try:
        # 1. Parse the JSON data sent from JS
        data = json.loads(request.body)
        
        # 2. Get fields we want to update
        new_display_name = data.get('display_name')
        new_pronouns = data.get('pronouns')
        new_bio = data.get('bio')
        avatar_data = data.get('avatar_data')
        banner_data = data.get('banner_data')
        remove_avatar = data.get('remove_avatar', False)
        remove_banner = data.get('remove_banner', False)

        # 3. Get the user's profile object
        profile = request.user.profile

        # 4. Basic Validation
        if new_display_name is not None:
            if len(new_display_name) > 32:
                return JsonResponse({'ok': False, 'message': 'Display name too long'}, status=400)
            profile.display_name = new_display_name

        if new_pronouns is not None:
            if len(new_pronouns) > 32:
                return JsonResponse({'ok': False, 'message': 'Pronouns too long'}, status=400)
            profile.pronouns = new_pronouns
        
        if new_bio is not None:
            if len(new_bio) > 200:
                return JsonResponse({'ok': False, 'message': 'Bio too long'}, status=400)
            profile.bio = new_bio

        # 5. Handle Avatar changes
        if remove_avatar:
            if profile.avatar_key:
                delete_from_r2_or_local(profile.avatar_key)
                profile.avatar_key = ""
        elif avatar_data:
            key = upload_to_r2_or_local(request.user.id, avatar_data, folder="avatars")
            if profile.avatar_key and profile.avatar_key != key:
                delete_from_r2_or_local(profile.avatar_key)
            profile.avatar_key = key

        # 6. Handle Banner changes
        if remove_banner:
            if profile.banner_key:
                delete_from_r2_or_local(profile.banner_key)
                profile.banner_key = ""
        elif banner_data:
            key = upload_to_r2_or_local(request.user.id, banner_data, folder="banners")
            if profile.banner_key and profile.banner_key != key:
                delete_from_r2_or_local(profile.banner_key)
            profile.banner_key = key

        # 7. Handle Avatar Shape, Status Badge, Banner Color, and Decoration options
        new_avatar_shape = data.get('avatar_shape')
        if new_avatar_shape in ('square', 'round'):
            profile.avatar_shape = new_avatar_shape

        show_status_badge = data.get('show_status_badge')
        if show_status_badge is not None:
            profile.show_status_badge = bool(show_status_badge)

        new_banner_color = data.get('banner_color')
        if new_banner_color:
            if new_banner_color.startswith('#') and len(new_banner_color) in (4, 7):
                profile.banner_color = new_banner_color

        if data.get('remove_decoration') is True:
            profile.frame_key = ""
        elif 'decoration_key' in data or 'frame_key' in data:
            dec_key = data.get('decoration_key') if 'decoration_key' in data else data.get('frame_key')
            if dec_key is not None:
                profile.frame_key = str(dec_key).strip()

        # 8. Save Changes to the database
        profile.save()

        return JsonResponse({
            'ok': True,
            'message': 'Profile updated successfully',
            'display_name': profile.display_name,
            'effective_display_name': profile.effective_display_name,
            'pronouns': profile.pronouns,
            'bio': profile.bio,
            'banner_color': profile.banner_color,
            'avatar_url_64': profile.avatar_url_64,
            'banner_url_sm': profile.banner_url_sm,
            'avatar_shape': profile.avatar_shape,
            'show_status_badge': profile.show_status_badge,
            'frame_key': profile.frame_key,
            'decoration_key': profile.frame_key,
            'decoration_url': profile.decoration_url,
        })
    except json.JSONDecodeError:
        return JsonResponse({'ok': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Error updating profile: {e}")
        return JsonResponse({'ok': False, 'message': 'Internal Server Error'}, status=500)

@login_required
@require_GET
def get_decorations(request):
    from .decorations import DECORATIONS
    return JsonResponse({
        'ok': True,
        'decorations': DECORATIONS,
        'current_decoration': request.user.profile.frame_key or "",
    })

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
        request.user.username = new_username
        request.user.save()
        # NOTE: do NOT call update_session_auth_hash here — that is only for password changes.
        # Username changes do not affect the session auth hash and calling it here
        # can cause the session to be invalidated, logging the user out.
        return JsonResponse({
            'ok': True,
            'message': 'Username Changed'
        })
    except json.JSONDecodeError:
         return JsonResponse({'ok': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Error updating profile: {e}")
        return JsonResponse({'ok': False, 'message': 'Internal Server Error'}, status=500)

@login_required
@require_POST
def change_email(request):
    """
    Changes the user's email, marks it unverified and sends a verification link
    """
    try:
        #1. Parse the JSON data
        data = json.loads(request.body)
        new_email = data.get('email','').strip()
        password = data.get('password', '')

        #2. Security check: Always verify password before sensitive changes
        if not request.user.check_password(password):
            return JsonResponse({'ok': False, 'message': 'Incorrect password'}, status=403)
        
        #3. Basic Validations
        if not new_email:
            return JsonResponse({'ok': False, 'message': 'Email is required'}, status=400)

        # If email is the same and already verified, do nothing
        if new_email.lower() == request.user.email.lower() and request.user.email_verified:
            return JsonResponse({'ok': True, 'message': 'This email is already verified.'})

        # Check if another user already has this email
        if User.objects.filter(email__iexact=new_email).exclude(pk=request.user.pk).exists():
            return JsonResponse({'ok': False, 'message': 'Email already in use'}, status=400)
        
        #4. Atomic transaction: Ensures DB update and token creation happen together
        with transaction.atomic():
            #update user record
            request.user.email = new_email
            request.user.email_verified = False # set to false until they verify
            request.user.save()
            
            # Generate a new verification token using existing service
            # This creates a hashed token in the EmailVerificationToken table
            _, raw_token = create_email_verification_token(request.user)

            #build the absolute URL for the verification page
            # e.g., https://yap.chat/verify/#token=abc123xyz
            verification_url = request.build_absolute_uri(reverse("verify_email_page"))
            verification_url =  f"{verification_url}#token={raw_token}"

            #5. Queue email : using celery to send the email in background
            # we use transaction.on_commit to ensure email is only sent if the DB sae succeeds
            def queue_verification_email():
                send_verification_email_task.delay(
                    to_email= request.user.email,
                    username= request.user.profile.effective_display_name,
                    verification_url = verification_url,
                    idempotency_key=f"verify-email-change/{request.user.pk}/{timezone.now().timestamp()}",)
            transaction.on_commit(queue_verification_email)
        return JsonResponse({'ok': True, 'message': 'Email updated. Please check your inbox for verification.'})
    except Exception as e:
        print(f'Error in change_email: {e}')
        return JsonResponse({'ok': False, 'message': 'Internal Server Error'}, status=500)

@login_required
@require_POST
def change_password(request):
    try:
        #1. Parse the incoming Json
        data = json.loads(request.body)
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        #2. security check: verify current password
        if not request.user.check_password(current_password):
            return JsonResponse({'ok': False, 'message': 'Incorrect current password.'},
        status=400)
        
        # 3. Validation: Ensure new passwords match and are not the same as the old one
        if new_password != confirm_password:
            return JsonResponse({'ok': False, 'message': 'New passwords do not match.'},
            status=400)
        
        if new_password == current_password:
            return JsonResponse({'ok': False, 'message': 'New password cannot be the same as the old one.'}, status=400)
        
        # 4. Use Django's built-in password validation to ensure it's strong enough
        try:
            validate_password(new_password, request.user)
        except ValidationError as e:
            # The error messages from the validator are returned as a list
            return JsonResponse({'ok': False, 'message': e.messages[0]}, status=400)
        # 5. If all checks pass, set the new password
        request.user.set_password(new_password)
        request.user.save()

        # 6. Important: Update the user's session to prevent them from being logged out
        update_session_auth_hash(request, request.user)

        # 7. Return a success response
        return JsonResponse({'ok': True, 'message': 'Password changed successfully.'})
    except Exception as e:
        return JsonResponse({'ok': False, 'message': 'An unexpected error occurred.'}, status=500)
    
@login_required
@require_POST
def delete_account(request):
    try:
        data = json.loads(request.body)
        password = data.get('password', '')

        if not request.user.check_password(password):
            return JsonResponse({'ok': False, 'message': 'Incorrect password'}, status=403)

        request.user.delete()
        logout(request)

        return JsonResponse({'ok': True, 'message': 'Account deleted successfully.'})
    except json.JSONDecodeError:
        return JsonResponse({'ok': False, 'message': 'Invalid JSON data'}, status=400)
    except Exception as e:
        print(f"Error deleting account: {e}")
        return JsonResponse({'ok': False, 'message': 'Internal Server Error'}, status=500)


@login_required
@require_POST
def logout_view(request):
    """
    Logs out the current user and clears their session.
    """
    logout(request)
    return JsonResponse({"ok": True, "message": "Logged out successfully."})


@require_POST
@csrf_protect
def resend_device_code(request):
    """
    Resends a new 5-digit verification code email for an active device verification challenge.
    Enforces a 60-second cooldown.
    """
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "message": "Invalid request format."}, status=400)

    session_token = payload.get("session_token", "").strip()
    if not session_token:
        return JsonResponse({"ok": False, "message": "Invalid session token."}, status=400)

    challenge = DeviceVerificationCode.objects.filter(session_token=session_token).first()
    if not challenge or challenge.used_at:
        return JsonResponse({"ok": False, "message": "Session expired or invalid. Please log in again."}, status=400)

    now = timezone.now()
    time_since_creation = (now - challenge.created_at).total_seconds()
    if time_since_creation < 60:
        remaining = int(60 - time_since_creation)
        return JsonResponse({
            "ok": False,
            "message": f"Please wait {remaining}s before requesting a new code.",
            "cooldown_remaining": remaining
        }, status=400)

    # Generate new challenge for the user
    new_challenge = create_device_verification_challenge(
        user=challenge.user,
        request=request
    )

    # Send Celery task
    from .tasks import send_device_verification_code_task
    send_device_verification_code_task.delay(
        to_email=challenge.user.email,
        username=challenge.user.username,
        code=new_challenge["plain_code"]
    )

    return JsonResponse({
        "ok": True,
        "new_session_token": new_challenge["session_token"],
        "message": "A new 5-digit verification code has been sent to your email."
    })