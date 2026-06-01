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

