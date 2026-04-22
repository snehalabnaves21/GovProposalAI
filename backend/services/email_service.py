"""
Email service for GovProposal AI.
Uses Resend API for sending verification and password reset emails.
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
APP_URL = os.getenv("APP_URL", "https://govproposal.vercel.app")  # your frontend Vercel URL

# Legacy SMTP vars (kept so auth.py import doesn't break — both are empty now)
SMTP_HOST = ""
SMTP_USER = ""


async def _send_email(to: str, subject: str, html: str) -> bool:
    """Send email via Resend API."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — email not sent to %s", to)
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": FROM_EMAIL,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
                timeout=10,
            )
            if response.status_code in (200, 201):
                logger.info("Email sent to %s: %s", to, subject)
                return True
            else:
                logger.error("Resend error %s: %s", response.status_code, response.text)
                return False
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
        return False


async def send_verification_email(email: str, token: str, name: str = "") -> bool:
    verify_url = f"{APP_URL}/verify-email?token={token}"
    greeting = f"Hi {name}," if name else "Hi,"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Welcome to GovProposal AI</h2>
        <p>{greeting}</p>
        <p>Please verify your email address to activate your account.</p>
        <a href="{verify_url}"
           style="display: inline-block; padding: 12px 24px; background: #2563eb;
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Verify Email Address
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #666; font-size: 12px;">If you didn't create this account, ignore this email.</p>
    </div>
    """
    return await _send_email(email, "Verify your GovProposal AI account", html)


async def send_password_reset_email(email: str, token: str, name: str = "") -> bool:
    reset_url = f"{APP_URL}/reset-password?token={token}"
    greeting = f"Hi {name}," if name else "Hi,"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Reset Your Password</h2>
        <p>{greeting}</p>
        <p>We received a request to reset your GovProposal AI password.</p>
        <a href="{reset_url}"
           style="display: inline-block; padding: 12px 24px; background: #2563eb;
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, ignore this email.</p>
    </div>
    """
    return await _send_email(email, "Reset your GovProposal AI password", html)