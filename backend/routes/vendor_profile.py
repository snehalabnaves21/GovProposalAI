"""
Vendor Profile router.
- Profiles are saved per-user (keyed by user_id from JWT).
- /fetch-company-about scrapes a URL for company description.
"""

import json
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import requests
from bs4 import BeautifulSoup

# Import your auth dependency — adjust path if different
from services.auth_service import get_current_user
from db_models import User

router = APIRouter(prefix="/api/vendor-profile", tags=["Vendor Profile"])

# ──────────────────────────────────────────────
# Storage helpers  (files in data/vendor_profiles/<user_id>.json)
# ──────────────────────────────────────────────

PROFILES_DIR = Path("data/vendor_profiles")
PROFILES_DIR.mkdir(parents=True, exist_ok=True)


def _profile_path(user_id: str) -> Path:
    return PROFILES_DIR / f"{user_id}.json"


def _load_profile(user_id: str) -> dict:
    path = _profile_path(user_id)
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return {}
    return {}


def _save_profile(user_id: str, data: dict) -> None:
    _profile_path(user_id).write_text(json.dumps(data, indent=2))


# ──────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────

class VendorProfileData(BaseModel):
    company_name: Optional[str] = None
    cage_code: Optional[str] = None
    duns_number: Optional[str] = None
    uei_number: Optional[str] = None
    naics_codes: Optional[list] = None
    business_type: Optional[str] = None
    business_status: Optional[str] = None
    years_in_business: Optional[int] = None
    clearance_level: Optional[str] = None
    about_company: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    capabilities: Optional[list] = None
    past_performance: Optional[list] = None
    certifications: Optional[list] = None


# ──────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────

@router.get("/")
async def get_vendor_profile(current_user: User = Depends(get_current_user)):
    """Return the vendor profile for the currently logged-in user."""
    profile = _load_profile(str(current_user.id))
    return {"profile": profile, "user_id": str(current_user.id)}


@router.post("/")
async def save_vendor_profile(
    data: VendorProfileData,
    current_user: User = Depends(get_current_user),
):
    """Save / overwrite the vendor profile for the currently logged-in user."""
    profile_dict = data.model_dump(exclude_none=True)
    _save_profile(str(current_user.id), profile_dict)
    return {"message": "Profile saved successfully", "profile": profile_dict}


@router.patch("/")
async def update_vendor_profile(
    data: VendorProfileData,
    current_user: User = Depends(get_current_user),
):
    """Merge partial updates into the existing profile."""
    existing = _load_profile(str(current_user.id))
    updates = data.model_dump(exclude_none=True)
    existing.update(updates)
    _save_profile(str(current_user.id), existing)
    return {"message": "Profile updated successfully", "profile": existing}


@router.delete("/")
async def delete_vendor_profile(current_user: User = Depends(get_current_user)):
    """Delete the vendor profile for the currently logged-in user."""
    path = _profile_path(str(current_user.id))
    if path.exists():
        path.unlink()
    return {"message": "Profile deleted"}


# ──────────────────────────────────────────────
# Scrape company about text from a URL
# ──────────────────────────────────────────────

@router.post("/fetch-company-about")
async def fetch_company_about(
    data: dict,
    current_user: User = Depends(get_current_user),  # ✅ requires auth
):
    url = data.get("url")

    if not url:
        return {"about_company": "", "error": "No URL provided"}

    # Block bad sources
    if any(x in url for x in ["youtube.com", "instagram.com", "facebook.com"]):
        return {"about_company": "", "error": "Invalid website"}

    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        base = url.rstrip("/")
        candidates = [
            base + "/about",
            base + "/about-us",
            base + "/company",
            base,
        ]

        best_text = ""

        for link in candidates:
            try:
                res = requests.get(link, timeout=10, headers=headers)
                soup = BeautifulSoup(res.text, "html.parser")

                texts = [
                    tag.get_text(strip=True)
                    for tag in soup.find_all(["p", "li", "h1", "h2", "h3"])
                    if len(tag.get_text(strip=True)) > 40
                ]
                combined = " ".join(texts)

                # Prefer about page
                if "about" in link and len(combined) > 200:
                    return {"about_company": combined[:1200]}

                if len(combined) > len(best_text):
                    best_text = combined

            except Exception:
                continue

        if best_text:
            return {"about_company": best_text[:1200]}

        return {"about_company": "", "error": "No content found"}

    except Exception as e:
        return {"about_company": "", "error": str(e)}