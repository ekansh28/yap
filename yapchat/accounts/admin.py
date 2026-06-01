from django.contrib import admin
# UserAdmin is imported to customize the admin interface for our custom User model
from django.contrib.auth.admin import UserAdmin
from .models import User

# register the User model with the admin site using the UserAdmin configuration
admin.site.register(User, UserAdmin)