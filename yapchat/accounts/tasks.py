from celery import shared_task

from accounts.services.email_delivery import (
    send_verification_email, send_device_verification_code_email
)

@shared_task
def test_task():
    print("Celery is working!")

@shared_task
def send_verification_email_task(
    
    to_email,
    username,
    verification_url,
    idempotency_key="",
):
 
    send_verification_email(
        to_email=to_email,
        username=username,
        verification_url=verification_url,
        idempotency_key=idempotency_key,
    )

@shared_task(max_retries=3, default_retry_delay=5)
def send_device_verification_code_task(to_email, username, code, idempotency_key=""):
    send_device_verification_code_email(
        to_email=to_email,
        username=username,
        code=code,
        idempotency_key=idempotency_key
    )