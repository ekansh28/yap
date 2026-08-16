from django.urls import path
from . import views

urlpatterns = [
    # Landing page that reads the fragment token in browser
    path('verify/', views.verify_email_page, name='verify_email_page'),
    path('verify/success/', views.verify_email_success_page, name='verify_email_success_page'),
    path('api/register/', views.register_user, name='register_user'),
    path('api/login/', views.login_view, name='login_view'),
    # API endpoint that consumes the token
    path('api/verify-email/', views.verify_email_token, name='verify_email_token'),
    # Development-only endpoint to preview the verification email template
    path('api/profile/update/', views.update_profile, name='update_profile'),
    path('api/profile/change_username/', views.change_username, name='change_username'),
    path('api/profile/change_email/', views.change_email, name='change_email'),
    path('api/profile/change_password/', views.change_password, name='change_password'),
    path('api/profile/delete_account/', views.delete_account, name='delete_account'),
    path('api/profile/resend_verification/', views.resend_verification, name='resend_verification'),
    path('api/profile/decorations/', views.get_decorations, name='get_decorations'),
    path("api/verify-device-code/", views.verify_device_code, name="verify_device_code"),
    path("api/resend-device-code/", views.resend_device_code, name="resend_device_code"),
    path("api/logout/", views.logout_view, name="logout_view"),
]
