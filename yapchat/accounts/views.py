import json
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.csrf import ensure_csrf_cookie

from accounts.services.email_verification import consume_email_verification_token
# Create your views here.

@require_http_methods(["GET"])
@ensure_csrf_cookie
def verify_email_page(request):
    # This page is opened when the user clicks the email link
    # The fragment token is read by frontend JavaScript and not django
    return render(request, 'accounts/email_verification.html')

@require_http_methods(["GET"])
def verify_email_success_page(request):
    return render(request, "accounts/verify_email_success.html")

@require_http_methods(["POST"])
@csrf_protect
def verify_email_token(request):
    # Parse JSON sent by the frontend
    try:
        # payload contains the data sent by the frontend
        payload = json.loads(request.body.decode('utf-8'))
    except json.JSONDecodeError:
        return JsonResponse({
                            "ok": False, 
                            "message": "Invalid Request."
                            },status=400)
    
    # Extract the token from the JSON payload
    # payload.get("token", "") tries to get the value associated with the key "token" from the payload dictionary
    raw_token = payload.get("token", "").strip()
    if not raw_token:
        return JsonResponse({
                            "ok": False, 
                            "message": "Verification Token is required."
                            },status=400)
    
    # Delegate (means to pass on) the actual security logic to the service layer
    success, message = consume_email_verification_token(raw_token)
    if not success:
        return JsonResponse({
                            "ok": False, 
                            "message": message
                            },status=400)
    return JsonResponse({
                        "ok": True,
                        "message": message,
                        "redirect_url": "/verify/success/"
                        },status=200)
