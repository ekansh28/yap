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
