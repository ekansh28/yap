# Creates the secret and stored hash

# hashlib and hmac are used to create a secure hash of the token
import hashlib
import hmac
# secrets is used to generate a secure random token
import secrets
# timedelta is used to set the expiration time for the token
from datetime import timedelta
from time import perf_counter

from django.conf import settings
# transaction is used to ensure that the creation of the token and the sending of the email are atomic operations
from django.db import transaction
from django.utils import timezone

from accounts.models import EmailVerificationToken

def generate_raw_token():
    # Creates a cryptographicaly secure random token
    # 32 bytes of randomness is a good balance between security and token length (resulting in a 43-character URL-safe string)
    return secrets.token_urlsafe(32)

def hash_token(raw_token):
    # Convert the raw token into a secure hash using hmac with a secret key from Django settings
    # This ensures that even if the database is compromised, the raw tokens cannot be easily reverse-engineered
    return hmac.new(
        key=settings.SECRET_KEY.encode('utf-8'), 
        msg=raw_token.encode('utf-8'), 
        digestmod=hashlib.sha256
    ).hexdigest()

# This function creates a new email verification token for a user and sends the verification email
@transaction.atomic
def create_email_verification_token(user):
    # TEMP DEBUG: email verification token timing instrumentation. Remove after profiling.
    token_started_at = perf_counter()
    print("[token] start: 0.000s")

    # Generate the raw secret only in memory
    step_started_at = perf_counter()
    raw_token = generate_raw_token()
    print(f"[token] generate_raw_token: {perf_counter() - step_started_at:.3f}s")

    # Hash the raw token before writing anything to the database
    step_started_at = perf_counter()
    token_hash = hash_token(raw_token)
    print(f"[token] hash_token: {perf_counter() - step_started_at:.3f}s")

    # invalidate any previous active token for this user/email 
    # Keeps only one valid verification token active at a time
    step_started_at = perf_counter()
    EmailVerificationToken.objects.filter(
        user=user, 
        email=user.email, 
        used_at__isnull=True, 
    ).update(used_at=timezone.now())
    print(f"[token] invalidate_previous_tokens: {perf_counter() - step_started_at:.3f}s")

    # Create a new active verification row

    # token_row is the database record that stores the hashed token and its metadata, while raw_token is the actual token string that will be sent to the user via email. 
    # The raw token is never stored in the database for security reasons, and only the hash of the token is saved.
    step_started_at = perf_counter()
    token_row = EmailVerificationToken.objects.create(
        user=user,
        email=user.email,
        token_hash=token_hash,
        expires_at=timezone.now() + timedelta(minutes=15),  # Token expires in 15 minutes
    )
    print(f"[token] create_row: {perf_counter() - step_started_at:.3f}s")

    # Return both token row and raw_token
    print(f"[token] total: {perf_counter() - token_started_at:.3f}s")
    return token_row, raw_token

@transaction.atomic
def consume_email_verification_token(raw_token):
    # convert the user-provided raw token into the stored lookup value (stored lookup value is the hash of the raw token)
    token_hash = hash_token(raw_token)
    # Lock the row so two requests can't consume the same token at the same time (pre
    token_row = (
        EmailVerificationToken.objects
        .select_for_update()
        .select_related('user')
        #.filter to find the token row that matches the hashed token, is not expired, and has not been used yet. This ensures that only valid tokens can be consumed.
        .filter(token_hash=token_hash)
        #.first() is used to retrieve the first matching token row, or None if no such row exists. This allows the function to handle cases where the token is invalid or has already been consumed gracefully.
        .first()
    )

    if token_row is None:
        return False, "Invalid or expired token."
    if token_row.used_at is not None:
        return False, "This token has already been used."
    if timezone.now() >= token_row.expires_at:
        return False, "This token has expired."
    
    # means the token is valid, we can mark it as used and return the associated user
    user = token_row.user
    if user.email_verified:
        # if user is already verified, do not fail hard (e.g., if they click an old token after already verifying, just ignore it and treat it as a no-op)
        token_row.used_at = timezone.now()
        # we update the used_at and updated_at fields to reflect that this token has been consumed, even if the user's email was already verified. 
        # This helps maintain an accurate record of token usage and prevents any potential confusion from having unused tokens lingering in the database.
        token_row.save(update_fields=['used_at', "updated_at"])
        return True, "Email is already verified."
    
    # Mark the user as verified
    user.email_verified = True
    user.save(update_fields=['email_verified', "updated_at"])

    # Mark the token as used
    token_row.used_at = timezone.now()
    token_row.save(update_fields=['used_at', "updated_at"])
    return True, "Email verified successfully."
