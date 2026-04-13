"""
Email service for GovProposal AI.

Sends verification emails using SMTP.
Falls back to console logging if SMTP is not configured.
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# SMTP Configuration (from environment variables)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@govproposal.ai")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "GovProposal AI")

# Frontend URL for verification links
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://anirudhatalmale6-alt.github.io/govproposal-ai")


def _build_verification_html(name: str, token: str) -> str:
    """Build a professional HTML verification email."""
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    first_name = name.split()[0] if name else "there"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr>
              <td style="background-color:#1e3a5f;padding:32px 40px;text-align:center;">
                <h1 style="color:#ffffff;font-size:24px;margin:0;">GovProposal <span style="color:#10b981;">AI</span></h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:40px;">
                <h2 style="color:#1e3a5f;font-size:22px;margin:0 0 16px;">Verify Your Email</h2>
                <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Hi {first_name},<br><br>
                  Thank you for creating your GovProposal AI account. Please click the button below to verify your email address and activate your account.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center" style="padding:8px 0 32px;">
                    <a href="{verify_url}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
                      Verify Email Address
                    </a>
                  </td></tr>
                </table>
                <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px;">
                  This link expires in 24 hours. If you did not create an account, you can safely ignore this email.
                </p>
                <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #e2e8f0;padding-top:16px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="{verify_url}" style="color:#2563eb;word-break:break-all;">{verify_url}</a>
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color:#f1f5f9;padding:20px 40px;text-align:center;">
                <p style="color:#94a3b8;font-size:12px;margin:0;">
                  GovProposal AI - AI-Powered Government Proposal Generation
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def _build_verification_text(name: str, token: str) -> str:
    """Build a plain-text verification email."""
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    first_name = name.split()[0] if name else "there"

    return f"""Hi {first_name},

Thank you for creating your GovProposal AI account.

Please verify your email by visiting this link:
{verify_url}

This link expires in 24 hours.

If you did not create an account, you can safely ignore this email.

- GovProposal AI Team
"""


def _build_password_reset_html(name: str, token: str) -> str:
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    first_name = name.split()[0] if name else "there"

    return f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:40px 20px;">
        <tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <tr><td style="background-color:#1e3a5f;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;">GovProposal <span style="color:#10b981;">AI</span></h1>
            </td></tr>
            <tr><td style="padding:40px;">
              <h2 style="color:#1e3a5f;font-size:22px;margin:0 0 16px;">Reset Your Password</h2>
              <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Hi {first_name},<br><br>
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:8px 0 32px;">
                  <a href="{reset_url}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:8px;">
                    Reset Password
                  </a>
                </td></tr>
              </table>
              <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0 0 16px;">
                This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
              </p>
              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;border-top:1px solid #e2e8f0;padding-top:16px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{reset_url}" style="color:#2563eb;word-break:break-all;">{reset_url}</a>
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def _build_password_reset_text(name: str, token: str) -> str:
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    first_name = name.split()[0] if name else "there"

    return f"""Hi {first_name},

We received a request to reset your GovProposal AI password.

Create a new password by visiting this link:
{reset_url}

This link expires in 1 hour.

If you did not request this, you can safely ignore this email.

- GovProposal AI Team
"""


async def send_password_reset_email(to_email: str, token: str, name: str = "") -> bool:
    if not SMTP_HOST or not SMTP_USER:
        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        logger.info(
            "PASSWORD RESET (no SMTP configured)\n"
            "  To: %s\n"
            "  Reset URL: %s\n"
            "  Token: %s",
            to_email, reset_url, token
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your GovProposal AI password"
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        msg.attach(MIMEText(_build_password_reset_text(name, token), "plain"))
        msg.attach(MIMEText(_build_password_reset_html(name, token), "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())

        logger.info("Password reset email sent to: %s", to_email)
        return True

    except Exception as e:
        logger.error("Failed to send password reset email to %s: %s", to_email, e)
        raise


async def send_verification_email(to_email: str, token: str, name: str = "") -> bool:
    """
    Send a verification email.

    If SMTP is configured, sends via SMTP.
    Otherwise, logs the verification link to console (for development).

    Returns True if sent successfully.
    """
    if not SMTP_HOST or not SMTP_USER:
        # Development mode — log to console
        verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
        logger.info(
            "EMAIL VERIFICATION (no SMTP configured)\n"
            "  To: %s\n"
            "  Verify URL: %s\n"
            "  Token: %s",
            to_email, verify_url, token
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify your GovProposal AI account"
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Attach plain text and HTML versions
        msg.attach(MIMEText(_build_verification_text(name, token), "plain"))
        msg.attach(MIMEText(_build_verification_html(name, token), "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())

        logger.info("Verification email sent to: %s", to_email)
        return True

    except Exception as e:
        logger.error("Failed to send verification email to %s: %s", to_email, e)
        raise
