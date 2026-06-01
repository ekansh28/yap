# accounts/signals.py
# This file contains signal handlers for the accounts app.

# post_save signal is sent at the end of the save() method of a model instance. 
# We will use it to create a Profile object whenever a new User is created.
from django.db.models.signals import post_save

# receiver is a decorator that allows us to connect a signal to a function.
# A decorator is a function that takes another function and extends its behavior without explicitly modifying it.
from django.dispatch import receiver

# Import the User model and the Profile model.
from .models import User, Profile

# The @receiver decorator connects the post_save signal of the User model to the create_profile function.
# This means that whenever a User instance is saved, the create_profile function will be called.
# sender is the model class that sent the signal (in this case, User).
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(
            user=instance,
            display_name=instance.username
        )

# save_user_profile is another signal handler that ensures that the Profile is saved whenever the User is saved.
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Save profile whenever user is saved
    if hasattr(instance, "profile"):
        instance.profile.save()

