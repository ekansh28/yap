# accounts/models.py

# django imports abstract user to create custom user model 
# Docs : https://docs.djangoproject.com/en/6.0/topics/auth/customizing/#using-a-custom-user-model-when-starting-a-project
from django.contrib.auth.models import AbstractUser
from django.db import models

# Import settings to access AUTH_USER_MODEL 
# Important because if we change the user model in the future, we want to avoid hardcoding 'accounts.User' in our models and instead use settings.AUTH_USER_MODEL which will always point to the correct user model
from django.conf import settings
import hashlib # for device verification

# Create your models here.
class User(AbstractUser):
    # Email (Should be unique for authentication purposes)
    email = models.EmailField(unique=True)
    # Email verification status
    email_verified = models.BooleanField(default=False)

    # Date of Birth 
    date_of_birth = models.DateField(
        null=True,
        blank=True
    )
    # Account Creation Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Last Profile Update Timestamp
    updated_at = models.DateTimeField(auto_now=True)

    # String representation of the user (for admin and debugging)  
    # In Simple : When you print a User object, it will show the username instead of something like <User object at 0x...> 
    def __str__(self):
        return self.username
    
# Profile
# models.Model is the base class for all Django models.
# It provides the core functionality for defining database models, including fields, methods, and metadata. 
# By inheriting from models.Model, the Profile class becomes a Django model (Whereas ) that can be used to create database tables and interact with the database using Django's ORM (Object-Relational Mapping) system.
class Profile(models.Model):
    # Class to define user status preferences using Django's TextChoices for better readability and maintainability.
    class StatusPreference(models.TextChoices):
        ONLINE = 'online', 'Online'
        IDLE = 'idle', 'Idle'
        DND = 'dnd', 'Do Not Disturb'
        OFFLINE = 'offline', 'Offline'

    # One profile belongs to one user, and one user has one profile (OneToOne relationship)
    # related_name='profile' allows us to access the profile from the user object using user.profile instead of user.profile_set (which is the default for reverse relationships in Django)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, 
                                on_delete=models.CASCADE, 
                                related_name='profile')
    
    # Display name for the user (can be different from username)
    display_name = models.CharField(max_length=32, blank=True)

    # Pronouns (e.g. they/them, she/her, he/him)
    pronouns = models.CharField(max_length=32, blank=True, default="")

    # Custom display name color
    display_name_color = models.CharField(
        max_length=7,
        default="#ffffff"
    )

    # Optional animated effect
    display_name_effect = models.CharField(
        max_length=32,
        blank=True,
        default="none"
    )

    # User bio or description
    bio = models.TextField(max_length=200, blank=True)
    
    # Frame image (optional) - this could be a decorative border around the avatar, stored as a reference to an image in our CDN. We use a CharField to store the key or URL of the frame image, and it's optional (blank=True) because not all users will have a frame. The default is an empty string, which indicates no frame.
    frame_key = models.CharField(
    max_length=500,
    blank=True,
    default=""
    )
    # Profile picture (optional)
    avatar_key = models.CharField(max_length=500, blank=True, default="")
    
    # Banner image (optional)
    banner_key = models.CharField(max_length=500, blank=True, default="")
    
    # Banner background color (default solid black)
    banner_color = models.CharField(max_length=7, default="#000000", blank=True)
    
    # Class to define avatar shape preference
    class AvatarShape(models.TextChoices):
        SQUARE = 'square', 'Square'
        ROUND = 'round', 'Round'

    avatar_shape = models.CharField(
        max_length=10,
        choices=AvatarShape.choices,
        default=AvatarShape.SQUARE
    )

    # Status badge display toggle
    show_status_badge = models.BooleanField(default=True)

    # Presence status preference (e.g., online, offline, away)
    # we use duplicate choices (online, Online) 
    # because the first value is what gets stored in the database (e.g., 'online') and the second value is what gets displayed in forms and admin interfaces (e.g., 'Online')
    status_preference = models.CharField(max_length=20, 
                              choices=StatusPreference.choices, 
                              default=StatusPreference.OFFLINE)
    
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.effective_display_name}'s Profile"
   
    @property
    def effective_display_name(self):
        return self.display_name or self.user.username
    
    @property
    def status_icon_url(self):
        pref = (self.status_preference or "online").lower()
        if pref in ("online", "idle", "offline", "dnd"):
            return f"https://cdn.lesbianhangout.online/icons/{pref}.png"
        return "https://cdn.lesbianhangout.online/icons/online.png"

    @property
    def frame_url(self):
        if not self.frame_key:
            return ""
        if self.frame_key.startswith("http://") or self.frame_key.startswith("https://") or self.frame_key.startswith("/"):
            return self.frame_key
        cdn_domain = getattr(settings, "R2_CUSTOM_DOMAIN", "https://cdn.lesbianhangout.online").rstrip("/")
        return f"{cdn_domain}/{self.frame_key}"

    @property
    def avatar_url(self):
        if not self.avatar_key:
            return "/static/image/default-avatar.png"
        if self.avatar_key.startswith("http://") or self.avatar_key.startswith("https://") or self.avatar_key.startswith("/"):
            return self.avatar_key
        cdn_domain = getattr(settings, "R2_CUSTOM_DOMAIN", "https://cdn.lesbianhangout.online").rstrip("/")
        return f"{cdn_domain}/{self.avatar_key}"

    def get_avatar_url(self, size="64"):
        # Returns URL for a specific avatar size variant (32, 64, 128, 256)
        if not self.avatar_key:
            return "/static/image/default-avatar.png"

        base_path = self.avatar_key[:-5] if self.avatar_key.endswith(".webp") else self.avatar_key
        variant_path = f"{base_path}_{size}.webp"

        if self.avatar_key.startswith("http://") or self.avatar_key.startswith("https://") or self.avatar_key.startswith("/"):
            return variant_path

        cdn_domain = getattr(settings, "R2_CUSTOM_DOMAIN", "https://cdn.yap.chat").rstrip("/")
        return f"{cdn_domain}/{variant_path}"

    @property
    def banner_url(self):
        if not self.banner_key:
            return ""
        if self.banner_key.startswith("http://") or self.banner_key.startswith("https://") or self.banner_key.startswith("/"):
            return self.banner_key
        cdn_domain = getattr(settings, "R2_CUSTOM_DOMAIN", "https://cdn.yap.chat").rstrip("/")
        return f"{cdn_domain}/{self.banner_key}"

    def get_banner_url(self, size="md"):
        # Returns URL for a specific banner size variant (sm, md, lg)
        if not self.banner_key:
            return ""

        base_path = self.banner_key[:-5] if self.banner_key.endswith(".webp") else self.banner_key
        variant_path = f"{base_path}_{size}.webp"

        if self.banner_key.startswith("http://") or self.banner_key.startswith("https://") or self.banner_key.startswith("/"):
            return variant_path

        cdn_domain = getattr(settings, "R2_CUSTOM_DOMAIN", "https://cdn.yap.chat").rstrip("/")
        return f"{cdn_domain}/{variant_path}"

    @property
    def avatar_url_32(self):
        return self.get_avatar_url("32")
    @property
    def avatar_url_64(self):
        return self.get_avatar_url("64")
    @property
    def avatar_url_128(self):
        return self.get_avatar_url("128")
    @property 
    def avatar_url_256(self):
        return self.get_avatar_url("256")
    @property
    def banner_url_sm(self):
        return self.get_banner_url("sm")
    @property
    def banner_url_md(self):
        return self.get_banner_url("md")
    @property
    def banner_url_lg(self):
        return self.get_banner_url("lg")

    class AvatarShape(models.TextChoices):
        SQUARE = "square", "Square"
        ROUND = "round", "Round"

    avatar_shape = models.CharField(
        max_length=10,
        choices=AvatarShape.choices,
        default=AvatarShape.SQUARE
    )

    show_status_badge = models.BooleanField(default=True)
    
class EmailVerificationToken(models.Model):
    # The account that owns this verification challenge
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='email_verification_tokens'
    )
    # The email address this token is verifying
    # Store the exact email at the time the token was issued
    email = models.EmailField()

    # A hashed version of the raw token sent to the user
    # Never store the raw token in the database for security reasons
    token_hash = models.CharField(max_length=128,unique=True)

    # The point after which the token must be rejected
    expires_at = models.DateTimeField()

    # Set when the token has been consumed (used for verification)
    # Null if the token has not been used yet
    used_at = models.DateTimeField(null=True, blank=True)

    # When the verfication email was sent
    sent_at = models.DateTimeField(auto_now_add=True)

    # How many times the user has requested a new verification email (for rate limiting)
    resend_count = models.PositiveIntegerField(default=0)

    # How many failed verfication attempts have been made with this token (for security monitoring)
    attempt_count = models.PositiveIntegerField(default=0)

    # Created automatically when the token is created
    created_at = models.DateTimeField(auto_now_add=True)

    # Updated automatically on every save
    updated_at = models.DateTimeField(auto_now=True)

    # Meta class to define database indexes for efficient querying of tokens based on user/email and expiration time.
    class Meta:
        # Useful for faster lookups and cleaner debugging
        # Indexes on user and email for quickly finding tokens for a specific user/email combination, and on expires_at for efficiently querying valid tokens that haven't expired yet.
        indexes = [
            models.Index(fields=["user", "email"]),
            models.Index(fields=["expires_at"]),
        ]
    def is_expired(self):
        # Django timezone-aware datetime comparison to check if the token has expired
        from django.utils import timezone
        return timezone.now() >= self.expires_at
    def is_used(self):
        # Once used, the token must never be accepted again.
        return self.used_at is not None
    
class UserDevice(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete = models.CASCADE,
        related_name = "devices"
    )
    device_hash = models.CharField(max_length=64, db_index=True)
    device_name = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    verified_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "device_hash")

    def __str__(self):
        return f"{self.user.username}'s Device ({self.device_name})"

class DeviceVerificationCode(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="device_verification_codes"
    )
    session_token = models.CharField(max_length=64, unique=True, db_index=True)
    code_hash = models.CharField(max_length=64)
    device_hash = models.CharField(max_length=64)
    device_name = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True) 

    expires_at = models.DateTimeField()
    attempts = models.PositiveIntegerField(default=0)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        from django.utils import timezone
        return self.used_at is None and timezone.now() < self.expires_at and self.attempts < 5   

    def check_code(self, raw_code):
        hashed_input = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()
        return self.code_hash == hashed_input