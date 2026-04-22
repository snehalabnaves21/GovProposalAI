"""
Authentication routes for GovProposal AI.
Endpoints: register, login, verify email, resend verification, forgot/reset password, profile.
"""

import logging
import re
import secrets
from typing import Optional
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import User
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from services.email_service import send_verification_email, send_password_reset_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ──────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────

def validate_password(password: str) -> str | None:
    if len(password) < 10:
        return "Password must be at least 10 characters long."
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter."
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter."
    if not re.search(r'[0-9]', password):
        return "Password must contain at least one digit."
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
        return "Password must contain at least one special character."
    return None


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=10)
    first_name: str = Field("")
    last_name: str = Field("")
    company_name: str = Field("")
    mobile_number: str = Field("")
    landline_number: str = Field("")


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    mobile_number: Optional[str] = None
    landline_number: Optional[str] = None
    email: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: dict
    email_verified: bool = True


class UserResponse(BaseModel):
    user: dict


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=10)


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    pwd_error = validate_password(request.password)
    if pwd_error:
        raise HTTPException(status_code=400, detail=pwd_error)

    result = await db.execute(
        select(User).where(User.email == request.email.lower().strip())
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User already exists")

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)

    user = User(
        email=request.email.lower().strip(),
        hashed_password=hash_password(request.password),
        first_name=request.first_name.strip(),
        last_name=request.last_name.strip(),
        full_name=f"{request.first_name} {request.last_name}".strip(),
        company_name=request.company_name.strip(),
        mobile_number=request.mobile_number.strip() or None,
        landline_number=request.landline_number.strip() or None,
        email_verified=False,
        verification_token=verification_token,
        verification_token_expires=datetime.now(timezone.utc) + timedelta(hours=24),
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email
    try:
        await send_verification_email(user.email, verification_token, user.full_name)
        logger.info("Verification email sent to %s", user.email)
    except Exception as e:
        logger.warning("Failed to send verification email: %s", e)

    return {
        "message": "Account created! Please check your email to verify your account.",
        "requires_verification": True,
        "user": {"email": user.email, "full_name": user.full_name},
    }


@router.post("/verify-email")
async def verify_email(
    request: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.verification_token == request.token)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=400, detail="Invalid verification token.")

    if user.verification_token_expires:
        expires = user.verification_token_expires
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="Verification token has expired. Please request a new one.",
            )

    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.add(user)
    await db.commit()

    token = create_access_token(data={"sub": user.id, "email": user.email})
    logger.info("Email verified: %s", user.email)

    return AuthResponse(token=token, user=user.to_dict(), email_verified=True)


@router.post("/resend-verification")
async def resend_verification(
    request: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == request.email.lower().strip())
    )
    user = result.scalar_one_or_none()

    if user is None or user.email_verified:
        return {"message": "If an account with this email exists and needs verification, a new email has been sent."}

    user.verification_token = secrets.token_urlsafe(32)
    user.verification_token_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.add(user)
    await db.commit()

    try:
        await send_verification_email(user.email, user.verification_token, user.full_name)
    except Exception as e:
        logger.warning("Failed to resend verification email: %s", e)

    return {"message": "If an account with this email exists and needs verification, a new email has been sent."}


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == request.email.lower().strip()))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox.",
        )

    # 45-day password expiry check
    PASSWORD_MAX_AGE_DAYS = 45
    password_set_date = user.password_changed_at or user.created_at
    if password_set_date:
        if password_set_date.tzinfo is None:
            password_set_date = password_set_date.replace(tzinfo=timezone.utc)
        days_since = (datetime.now(timezone.utc) - password_set_date).days
        if days_since >= PASSWORD_MAX_AGE_DAYS:
            reset_tok = secrets.token_urlsafe(32)
            user.reset_token = reset_tok
            user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
            db.add(user)
            await db.commit()
            raise HTTPException(
                status_code=403,
                detail=f"PASSWORD_EXPIRED|{reset_tok}",
            )

    token = create_access_token(data={"sub": user.id, "email": user.email})
    logger.info("User logged in: %s", user.email)

    return AuthResponse(token=token, user=user.to_dict(), email_verified=True)


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(user=current_user.to_dict())


@router.put("/me", response_model=UserResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if request.first_name is not None:
        current_user.first_name = request.first_name.strip()
    if request.last_name is not None:
        current_user.last_name = request.last_name.strip()
    if request.first_name is not None or request.last_name is not None:
        current_user.full_name = f"{current_user.first_name} {current_user.last_name}".strip()
    if request.full_name is not None:
        current_user.full_name = request.full_name.strip()
    if request.company_name is not None:
        current_user.company_name = request.company_name.strip()
    if request.mobile_number is not None:
        current_user.mobile_number = request.mobile_number.strip() or None
    if request.landline_number is not None:
        current_user.landline_number = request.landline_number.strip() or None
    if request.email is not None:
        new_email = request.email.lower().strip()
        if new_email != current_user.email:
            result = await db.execute(select(User).where(User.email == new_email))
            if result.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="A user with this email already exists.")
            current_user.email = new_email

    db.add(current_user)
    await db.commit()
    logger.info("User profile updated: %s", current_user.email)

    return UserResponse(user=current_user.to_dict())


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == request.email.lower().strip())
    )
    user = result.scalar_one_or_none()

    if user is None:
        return {"message": "If an account with this email exists, a password reset link has been sent."}

    reset_tok = secrets.token_urlsafe(32)
    user.reset_token = reset_tok
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.add(user)
    await db.commit()

    try:
        await send_password_reset_email(user.email, reset_tok, user.full_name)
        logger.info("Password reset email sent to %s", user.email)
    except Exception as e:
        logger.warning("Failed to send password reset email: %s", e)

    # Always return same message — never expose token in response anymore
    return {"message": "If an account with this email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.reset_token == request.token)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if user.reset_token_expires:
        expires = user.reset_token_expires
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    pwd_error = validate_password(request.new_password)
    if pwd_error:
        raise HTTPException(status_code=400, detail=pwd_error)

    user.hashed_password = hash_password(request.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    user.reset_token = None
    user.reset_token_expires = None
    db.add(user)
    await db.commit()

    logger.info("Password reset completed for %s", user.email)

    token = create_access_token(data={"sub": user.id, "email": user.email})

    return {
        "message": "Password has been reset successfully.",
        "token": token,
        "token_type": "bearer",
        "user": user.to_dict(),
    }