from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    User,
    Profile,
    EmailVerificationToken,
)

# Custom User model
admin.site.register(User, UserAdmin)

# User profiles
admin.site.register(Profile)

# Email verification tokens
admin.site.register(EmailVerificationToken)