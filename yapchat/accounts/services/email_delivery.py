from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from premailer import transform


def send_verification_email(
    *,
    to_email: str,
    username: str,
    verification_url: str,
    idempotency_key: str = "",
) -> None:
    subject = "Verify your YapChat email"


    html = render_to_string(
        "emails/verify_email.html",
        {
            "username": username,
            "verification_url": verification_url,
        },
    )

    html = transform(html)

  
   
    message = EmailMessage(
        subject=subject,
        body=html,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
        headers=(
            {"Resend-Idempotency-Key": idempotency_key}
            if idempotency_key
            else None
        ),
    )
    message.content_subtype = "html"
    message.send(fail_silently=False)

def send_device_verification_code_email(
        *,
        to_email: str,
        username: str,
        code: str,
        idempotency_key: str = "",
) -> None:
    
    """                                                                         
    Renders the Win98 device verification HTML email template,                  
    inlines the CSS for email client compatibility using premailer, and         
    dispatches the email.                                                             
    """
    subject = f"[{code}] Unverified Device Security Code - YapChat "

    # Convert code string '99999' into list ['9','9','9','9','9'] for template looping
    code_digits = list(code)

    # render template with variables
    html = render_to_string(
        "emails/device_verification_code.html",
        {
            "username" : username,
            "code_digits" : code_digits,
        },
    )
    # Convert external css rules into inline style attributes for email clients (gmail/outlook)
    html = transform(html)

    # Construct the Django EmailMessage object
    message = EmailMessage(
        subject=subject,
        body=html,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
        headers=(
            {"Resend-Idempotency-Key": idempotency_key}
            if idempotency_key
            else None
        ),
    )
    
    message.content_subtype = "html"

    # Send email synchronously inside celery worker
    message.send(fail_silently=False)
