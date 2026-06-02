# accounts/models.py

# django imports abstract user to create custom user model 
# Docs : https://docs.djangoproject.com/en/6.0/topics/auth/customizing/#using-a-custom-user-model-when-starting-a-project
from django.contrib.auth.models import AbstractUser
from django.db import models

# Import settings to access AUTH_USER_MODEL 
# Important because if we change the user model in the future, we want to avoid hardcoding 'accounts.User' in our models and instead use settings.AUTH_USER_MODEL which will always point to the correct user model
from django.conf import settings

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

    # User bio or description
    bio = models.TextField(max_length=200, blank=True)

    # Profile picture (optional)
    avatar_key = models.CharField(max_length=500, blank=True, default="")
    
    # Banner image (optional)
    banner_key = models.CharField(max_length=500, blank=True, default="")
    
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
    
    #Helper method to get avatar URL 
    @property
    def avatar_url(self):
        if not self.avatar_key:
            return "/static/images/default-avatar.png"
        return f"https://cdn.yap.chat/{self.avatar_key}"
    @property
    def banner_url(self):
        if not self.banner_key:
            return "/static/images/default-banner.png"
        return f"https://cdn.yap.chat/{self.banner_key}"

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
    