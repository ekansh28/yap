# accounts/signals.py
# This file contains signal handlers for the accounts app.

from time import perf_counter

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
    # TEMP DEBUG: profile signal timing instrumentation. Remove after profiling.
    step_started_at = perf_counter()
    if created:
        Profile.objects.create(
            user=instance,
            display_name=instance.username
        )
    print(f"[signal] create_profile: {perf_counter() - step_started_at:.3f}s")
