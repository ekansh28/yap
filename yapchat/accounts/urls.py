from django.urls import path
from . import views

urlpatterns = [
    # Landing page that reads the fragment token in browser
    path('verify/', views.verify_email_page, name='verify_email_page'),
    path('verify/success/', views.verify_email_success_page, name='verify_email_success_page'),
    # API endpoint that consumes the token
    path('api/verify-email/', views.verify_email_token, name='verify_email_token'),
]
