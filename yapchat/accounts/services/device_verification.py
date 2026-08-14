import secrets
import hashlib
import uuid
from datetime import timedelta
from django.utils import timezone

# import model
from accounts.models import UserDevice, DeviceVerificationCode

def generate_device_hash(request):
    """
    Combines the browser's User-Agent string and IP address into a
    unique SHA-256 hash. Serves as a fingerprint for the user's device
    """
    user_agent = request.META.get("HTTP_USER_AGENT","")
    ip = request.META.get("REMOTE_ADDR", "")

    raw_fingerprint = f"{user_agent}:{ip}".encode("utf-8")

    # Compute a 64 Character SHA-256 hAH
    device_hash = hashlib.sha256(raw_fingerprint).hexdigest()

    return device_hash, ip, user_agent[:255]

def is_device_verified(user, request):
    """
    Checks the database to see if the current device fingerprint 
    has already been verified for this user in the past logins.
    """
    device_hash, _, _ = generate_device_hash(request)

    #returns True if a matching record exists in the UserDevice Table.
    return UserDevice.objects.filter(user=user, device_hash=device_hash).exists()

def create_device_verification_challenge(user,request):
   """                                                                         
    Generates a 5-digit verification code, hashes it for security,              
    saves it to the database, and returns the temporary session_token
    and raw code.                
  """
   device_hash, ip, user_agent = generate_device_hash(request)

   # 1. Generate a cryptographically secure 5-digit number (10000-99999)
   raw_code = f"{secrets.randbelow(90000) + 10000}"
   # 2. Hash the code using SHA-256 
   code_hash = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()
   # 3. Create a unique UUID session token sent to the frontend to track this login attempt
   session_token = str(uuid.uuid4())
   # 4. Set code expiration to 10 minutes from right now
   expires_at = timezone.now() + timedelta(minutes=10)
   # 5. Cancel any previous unused verification code for this user so only new code works
   DeviceVerificationCode.objects.filter(
       user=user,
       used_at__isnull=True
   ).update(used_at=timezone.now())
   # 6. Save the new challenge to the database
   DeviceVerificationCode.objects.create(
       user=user,
       session_token=session_token,
       code_hash=code_hash,
       device_hash=device_hash,
       device_name=user_agent,
       ip_address=ip if ip else None,
       expires_at=expires_at
   )
   # 7. Return session token (for the frontend response) and the raw 5-digit code (for the email task)
   return session_token, raw_code