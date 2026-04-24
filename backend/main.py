"""
GovProposal AI - FastAPI Backend (SaaS Edition)

Government Proposal AI Generator powered by Google Gemini and SAM.gov API.
Multi-tenant with user authentication, PostgreSQL-ready database, and admin panel.
"""

# ⚠️ load_dotenv MUST be first — before any module that reads os.getenv()
from dotenv import load_dotenv
load_dotenv()

import json
import os
import uuid
import logging
import ipaddress
import re
import socket
from pathlib import Path
from html.parser import HTMLParser
from typing import Optional
from urllib.parse import urlparse

import httpx

from fastapi import FastAPI, HTTPException, Query, Depends, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    VendorProfile,
    ProposalRequest,
    ProposalResponse,
    ProposalSection,
    ExportRequest,
    AVAILABLE_SECTIONS,
)
from database import get_db, create_tables
from db_models import User, VendorProfileDB, Proposal, Subscription, SearchSource, ProposalTemplate, FavoriteTemplate, ProposalShare, AuditLog, OpportunityAlert, Contract
from services.ai_service import AIService
from services.sam_service import SAMService
from services.export_service import generate_docx, generate_pdf
from services.auth_service import (
    get_current_user,
    get_optional_user,
    require_admin,
    hash_password,
    create_access_token,
)
from routes.auth import router as auth_router
from routes.compliance import router as compliance_router
from routes.n8n import router as n8n_router
from routes.vendor_profile import router as vendor_profile_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Ensure data directories exist
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="GovProposal AI",
    description=(
        "AI-powered government contract proposal generator. "
        "Uses Google Gemini for content generation and SAM.gov for opportunity search. "
        "Multi-tenant SaaS with user authentication and admin panel."
    ),
    version="2.0.0",
)


app.include_router(vendor_profile_router)
# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router)
app.include_router(compliance_router, prefix="/api/compliance", tags=["Compliance"])
app.include_router(n8n_router, prefix="/api/n8n", tags=["N8N Automation"])

# Initialize services
ai_service = AIService()
sam_service = SAMService()

from services.usaspending_service import USASpendingService
usaspending_service = USASpendingService()

from services.market_research_service import MarketResearchService
market_research_service = MarketResearchService()


class WebsiteTextExtractor(HTMLParser):
    """Small stdlib HTML-to-text extractor for company website pages."""

    def __init__(self):
        super().__init__()
        self._skip_depth = 0
        self._parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "nav", "footer", "header", "noscript", "svg"}:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "nav", "footer", "header", "noscript", "svg"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if not self._skip_depth:
            text = data.strip()
            if text:
                self._parts.append(text)

    def get_text(self):
        return re.sub(r"\s+", " ", " ".join(self._parts)).strip()


def _normalize_company_url(url: str) -> str:
    normalized = (url or "").strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Website URL is required.")
    if not normalized.startswith(("http://", "https://")):
        normalized = f"https://{normalized}"

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Please enter a valid website URL.")
    return normalized


def _build_company_url_candidates(url: str) -> list[str]:
    normalized = _normalize_company_url(url)
    parsed = urlparse(normalized)
    host = parsed.netloc
    path = parsed.path or "/"
    query = f"?{parsed.query}" if parsed.query else ""

    hosts = [host]
    if host.startswith("www."):
        hosts.append(host[4:])
    else:
        hosts.append(f"www.{host}")

    paths = [path]
    if path == "/":
        paths.extend(["/about-us/", "/about/", "/company/", "/who-we-are/"])

    candidates = []
    for scheme in [parsed.scheme, "https", "http"]:
        for candidate_host in hosts:
            for candidate_path in paths:
                candidate = f"{scheme}://{candidate_host}{candidate_path}{query}"
                if candidate not in candidates:
                    candidates.append(candidate)

    return candidates


def _ensure_public_hostname(url: str) -> None:
    hostname = urlparse(url).hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Please enter a valid website URL.")

    if hostname in {"localhost", "127.0.0.1", "::1"} or hostname.endswith(".local"):
        raise HTTPException(status_code=400, detail="Local network URLs are not supported.")

    try:
        addresses = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Could not resolve that website URL.")

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise HTTPException(status_code=400, detail="Local network URLs are not supported.")


def _extract_website_text(html: str) -> str:
    extractor = WebsiteTextExtractor()
    extractor.feed(html or "")
    text = extractor.get_text()
    return text[:5000]


def _is_blocked_website_response(html: str) -> bool:
    lower = (html or "").lower()
    blocked_markers = {
        "incapsula",
        "_incapsula_resource",
        "request unsuccessful",
        "access denied",
        "captcha",
        "cloudflare",
        "checking your browser",
        "akamai bot manager",
        "perimeterx",
    }
    return any(marker in lower for marker in blocked_markers)


def _remove_certification_claims(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text or "")
    filtered = []
    certification_terms = {
        "iso/",
        "iso ",
        "certified",
        "certification",
        "cmmc",
        "fedramp",
        "soc 2",
    }

    for sentence in sentences:
        lower = sentence.lower()
        if any(term in lower for term in certification_terms):
            continue
        filtered.append(sentence)

    return re.sub(r"\s+", " ", " ".join(filtered)).strip()


def _draft_company_about_fallback(company_name: str, page_text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", _remove_certification_claims(page_text))
    useful_sentences = []
    skip_terms = {
        "cookie",
        "privacy policy",
        "terms",
        "copyright",
        "all rights reserved",
        "subscribe",
        "newsletter",
    }

    for sentence in sentences:
        cleaned = sentence.strip()
        lower = cleaned.lower()
        if len(cleaned) < 45 or any(term in lower for term in skip_terms):
            continue
        useful_sentences.append(cleaned)
        if len(useful_sentences) >= 5:
            break

    source_summary = " ".join(useful_sentences) or page_text[:900].strip()
    return (
        f"{company_name} provides professional business and technology services. "
        f"{source_summary}\n\n"
        f"The company supports clients through service areas reflected on its website, "
        f"including technology, operations, and workforce support capabilities."
    )


# ============================================================
# Startup Event — DB init + default admin user
# ============================================================

@app.on_event("startup")
async def on_startup():
    """Create database tables and seed default admin user on first run."""
    logger.info("Starting up — creating database tables...")
    await create_tables()

    # Seed default admin user if it doesn't exist
    from database import async_session_factory

    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(User).where(User.email == "admin@govproposal.ai")
            )
            admin_user = result.scalar_one_or_none()

            if admin_user is None:
                admin_user = User(
                    email="admin@govproposal.ai",
                    hashed_password=hash_password("admin123"),
                    first_name="System",
                    last_name="Administrator",
                    full_name="System Administrator",
                    company_name="GovProposal AI",
                    is_admin=True,
                    email_verified=True,
                    subscription_tier="paid",
                )
                db.add(admin_user)
                await db.commit()
                logger.info("Default admin user created: admin@govproposal.ai")
            else:
                logger.info("Default admin user already exists.")

            # Seed default search sources
            result = await db.execute(
                select(SearchSource).where(SearchSource.is_default == True)
            )
            default_sources = result.scalars().all()
            existing_names = {s.name for s in default_sources}

            new_sources = []
            if "SAM.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="SAM.gov",
                    url="https://sam.gov",
                    description="Official U.S. government system for federal contract opportunities, awards, and entity registrations.",
                    is_default=True,
                    is_active=True,
                ))
            if "USASpending.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="USASpending.gov",
                    url="https://www.usaspending.gov/search",
                    description="Comprehensive U.S. government spending data — search contract awards, grants, and federal spending by agency, NAICS, and keyword.",
                    is_default=True,
                    is_active=True,
                ))
            if "SBA.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="SBA.gov",
                    url="https://www.sba.gov/federal-contracting",
                    description="Small Business Administration — federal contracting resources, set-aside programs, 8(a), HUBZone, and small business certifications.",
                    is_default=True,
                    is_active=True,
                ))
            if "GSA.gov" not in existing_names:
                new_sources.append(SearchSource(
                    name="GSA.gov",
                    url="https://www.gsa.gov",
                    description="General Services Administration — GSA Schedules, government-wide contracts, and procurement resources.",
                    is_default=True,
                    is_active=True,
                ))

            if new_sources:
                for src in new_sources:
                    db.add(src)
                await db.commit()
                logger.info("Seeded %d default search sources.", len(new_sources))

            # Seed proposal templates
            from seed_templates import get_seed_templates

            result = await db.execute(select(func.count(ProposalTemplate.id)))
            template_count = result.scalar() or 0
            if template_count == 0:
                for tpl_data in get_seed_templates():
                    tpl = ProposalTemplate(**tpl_data)
                    db.add(tpl)
                await db.commit()
                logger.info("Seeded %d proposal templates.", len(get_seed_templates()))

            # Seed compliance engine reference data
            from seed_compliance import seed_compliance_data
            await seed_compliance_data(db)

        except Exception as exc:
            await db.rollback()
            logger.error("Failed to seed data: %s", exc)


# ============================================================
# Health Check (public)
# ============================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"message": "GovProposal AI running", "version": "2.0.0"}


# ============================================================
# SAM.gov Opportunity Search (public)
# ============================================================

@app.get("/api/opportunities")
async def search_opportunities(
    keyword: Optional[str] = Query(None, description="Search keyword for opportunities"),
    naics: Optional[str] = Query(None, description="NAICS code filter"),
    limit: int = Query(10, ge=1, le=100, description="Max results to return"),
    source: Optional[str] = Query(None, description="Search source: sam, usaspending, gsa, or all"),
):
    """
    Search federal contract opportunities across multiple sources.

    Supported sources:
    - sam: SAM.gov Opportunities API (default)
    - usaspending: USASpending.gov Awards API (free, no key)
    - gsa: GSA.gov (uses SAM.gov API)
    - sba: SBA.gov (uses SAM.gov API, filtered for small business)
    - all: Search all sources and combine results
    """
    source = (source or "all").lower()
    all_results = []
    errors = []

    try:
        # SAM.gov search
        if source in ("sam", "gsa", "sba", "all"):
            try:
                sam_results = sam_service.search_opportunities(
                    keyword=keyword, naics=naics, limit=limit,
                )
                for r in sam_results:
                    r["source"] = "SAM.gov"
                all_results.extend(sam_results)
            except Exception as exc:
                errors.append(f"SAM.gov: {exc}")

        # USASpending.gov search
        if source in ("usaspending", "all"):
            try:
                usa_results = usaspending_service.search_awards(
                    keyword=keyword or "", naics=naics, limit=limit,
                )
                all_results.extend(usa_results)
            except Exception as exc:
                errors.append(f"USASpending.gov: {exc}")

        # Limit total results
        all_results = all_results[:limit]

        return {
            "keyword": keyword,
            "count": len(all_results),
            "opportunities": all_results,
            "sources_searched": source,
            "errors": errors if errors else None,
        }
    except Exception as exc:
        logger.error("Opportunity search failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search opportunities: {exc}",
        )


# ============================================================
# Review Opportunity (AI analysis)
# ============================================================

@app.post("/api/opportunities/review")
async def review_opportunity(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    AI-powered opportunity review: analyze the scope of work,
    summarize key requirements, and prepare for proposal creation.
    """
    body = await request.json()
    opportunity = body.get("opportunity", {})

    title = opportunity.get("title", "Unknown")
    agency = opportunity.get("agency", "Unknown Agency")
    description = opportunity.get("description", "")
    notice_id = opportunity.get("notice_id", "")
    due_date = opportunity.get("due_date", "")
    opp_type = opportunity.get("type", "")
    naics = opportunity.get("naics_code", "")

    prompt = (
        f"Analyze this government contract opportunity and provide a detailed review:\n\n"
        f"Title: {title}\n"
        f"Agency: {agency}\n"
        f"Notice ID: {notice_id}\n"
        f"Type: {opp_type}\n"
        f"NAICS Code: {naics}\n"
        f"Due Date: {due_date}\n"
        f"Description: {description}\n\n"
        f"Please provide:\n"
        f"1. SCOPE OF WORK SUMMARY - A clear, concise summary of what this contract requires\n"
        f"2. KEY REQUIREMENTS - Bullet points of the main deliverables and requirements\n"
        f"3. EVALUATION CRITERIA - Likely evaluation factors based on the opportunity type\n"
        f"4. RECOMMENDED APPROACH - Strategic recommendations for proposal response\n"
        f"5. RISK ASSESSMENT - Potential risks and challenges\n"
        f"6. GO/NO-GO RECOMMENDATION - Whether to pursue this opportunity and why\n\n"
        f"Format your response clearly with section headers."
    )

    try:
        review = ai_service.generate_section(prompt)
        return {
            "opportunity_title": title,
            "agency": agency,
            "notice_id": notice_id,
            "review": review,
        }
    except Exception as exc:
        logger.error("Opportunity review failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to review opportunity: {exc}")


# ============================================================
# Market Research & Pricing Intelligence (authenticated)
# ============================================================


@app.get("/api/market-research/labor-rates")
async def market_research_labor_rates(
    labor_category: str = Query(..., description="Labor category to research (e.g. 'Software Engineer')"),
    naics_code: Optional[str] = Query(None, description="NAICS code filter (e.g. '541512')"),
    location: Optional[str] = Query(None, description="State or location filter"),
    current_user: User = Depends(get_current_user),
):
    """
    Search for labor rate intelligence for a given category.

    Returns average, min, max, and median hourly rates derived from
    USASpending.gov award data and GSA Schedule benchmarks.
    """
    try:
        result = await market_research_service.search_labor_rates(
            labor_category=labor_category,
            naics_code=naics_code,
            location=location,
        )
        return result
    except Exception as exc:
        logger.error("Labor rate search failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search labor rates: {exc}",
        )


@app.get("/api/market-research/competitor-awards")
async def market_research_competitor_awards(
    naics_code: Optional[str] = Query(None, description="NAICS code filter"),
    agency: Optional[str] = Query(None, description="Awarding agency name filter"),
    keyword: Optional[str] = Query(None, description="Keyword to search in award descriptions"),
    current_user: User = Depends(get_current_user),
):
    """
    Search historical contract awards for competitor analysis.

    Returns vendor summaries, award details, and market insights.
    At least one filter (naics_code, agency, or keyword) is recommended.
    """
    if not naics_code and not agency and not keyword:
        raise HTTPException(
            status_code=400,
            detail="At least one filter is required: naics_code, agency, or keyword.",
        )

    try:
        result = await market_research_service.search_competitor_awards(
            naics_code=naics_code,
            agency=agency,
            keyword=keyword,
        )
        return result
    except Exception as exc:
        logger.error("Competitor award search failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search competitor awards: {exc}",
        )


@app.post("/api/market-research/pricing-recommendation")
async def market_research_pricing_recommendation(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """
    Generate AI-powered pricing strategy recommendations.

    Request body:
    {
        "labor_categories": [
            {"category": "Software Engineer", "rate": 145},
            {"category": "Project Manager", "rate": 160}
        ],
        "competitor_data": { ... }  // optional, from competitor-awards endpoint
    }

    Returns competitive, balanced, and premium pricing strategies
    with win probability estimates and actionable recommendations.
    """
    labor_categories = body.get("labor_categories", [])
    if not labor_categories:
        raise HTTPException(
            status_code=400,
            detail="labor_categories is required and must be a non-empty list of {category, rate} objects.",
        )

    # Validate each entry
    for i, item in enumerate(labor_categories):
        if not isinstance(item, dict) or "category" not in item or "rate" not in item:
            raise HTTPException(
                status_code=400,
                detail=f"labor_categories[{i}] must have 'category' (str) and 'rate' (number) fields.",
            )
        try:
            item["rate"] = float(item["rate"])
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"labor_categories[{i}].rate must be a valid number.",
            )

    competitor_data = body.get("competitor_data")

    try:
        result = market_research_service.get_pricing_recommendation(
            labor_categories=labor_categories,
            competitor_data=competitor_data,
        )
        return result
    except Exception as exc:
        logger.error("Pricing recommendation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate pricing recommendation: {exc}",
        )


# ============================================================
# Vendor Profile Management (authenticated, scoped to user)
# ============================================================

@app.post("/api/vendor-profile")
async def save_vendor_profile(
    profile: VendorProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save a vendor profile to the database, scoped to the current user.

    If the user already has a profile with the same company name, it is updated.
    Otherwise, a new profile is created.
    """
    try:
        # Check if user already has a profile with this company name
        result = await db.execute(
            select(VendorProfileDB).where(
                VendorProfileDB.user_id == current_user.id,
                VendorProfileDB.company_name == profile.company_name,
            )
        )
        existing = result.scalar_one_or_none()

        contact_dict = profile.contact_info.model_dump() if profile.contact_info else {}

        if existing:
            # Update existing profile
            existing.cage_code = profile.cage_code
            existing.duns_number = profile.duns_number
            existing.naics_codes = profile.naics_codes
            existing.capabilities = profile.capabilities
            existing.past_performance = profile.past_performance
            existing.socioeconomic_status = profile.socioeconomic_status
            existing.contact_info = contact_dict
            db.add(existing)
            await db.flush()
            profile_data = existing.to_dict()
            logger.info("Updated vendor profile: %s (user: %s)", profile.company_name, current_user.email)
        else:
            # Create new profile
            new_profile = VendorProfileDB(
                user_id=current_user.id,
                company_name=profile.company_name,
                cage_code=profile.cage_code,
                duns_number=profile.duns_number,
                naics_codes=profile.naics_codes,
                capabilities=profile.capabilities,
                past_performance=profile.past_performance,
                socioeconomic_status=profile.socioeconomic_status,
                contact_info=contact_dict,
            )
            db.add(new_profile)
            await db.flush()
            profile_data = new_profile.to_dict()
            logger.info("Created vendor profile: %s (user: %s)", profile.company_name, current_user.email)

        # Return in the same format as original API for frontend compatibility
        return {
            "message": f"Vendor profile '{profile.company_name}' saved successfully.",
            "profile": profile.model_dump(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to save vendor profile: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save vendor profile: {exc}",
        )


@app.get("/api/vendor-profiles")
async def list_vendor_profiles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all vendor profiles belonging to the current user.
    """
    try:
        result = await db.execute(
            select(VendorProfileDB)
            .where(VendorProfileDB.user_id == current_user.id)
            .order_by(VendorProfileDB.updated_at.desc(), VendorProfileDB.created_at.desc())
        )
        profiles = result.scalars().all()

        # Return in the same format as original API for frontend compatibility
        profiles_data = []
        for p in profiles:
            profiles_data.append({
                "id": p.id,
                "company_name": p.company_name,
                "cage_code": p.cage_code,
                "duns_number": p.duns_number,
                "naics_codes": p.naics_codes or [],
                "capabilities": p.capabilities,
                "past_performance": p.past_performance,
                "socioeconomic_status": p.socioeconomic_status,
                "contact_info": p.contact_info or {},
            })

        return {
            "count": len(profiles_data),
            "profiles": profiles_data,
        }

    except Exception as exc:
        logger.error("Failed to list vendor profiles: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list vendor profiles: {exc}",
        )


@app.post("/api/vendor-profile/fetch-company-about")
async def fetch_company_about_from_website(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Fetch a company website and draft an About Company profile section."""
    body = await request.json()
    website_url_candidates = _build_company_url_candidates(body.get("url", ""))
    company_name = (body.get("company_name") or "the company").strip()
    vendor_profile = body.get("vendor_profile") or {}

    errors = []
    website_url = ""
    page_text = ""

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=20,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; GovProposalAI/2.0; "
                "+https://govproposal.ai)"
            )
        },
    ) as client:
        for candidate_url in website_url_candidates:
            try:
                _ensure_public_hostname(candidate_url)
                response = await client.get(candidate_url)
                response.raise_for_status()

                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type and "text/plain" not in content_type:
                    errors.append(f"{candidate_url}: not a readable web page")
                    continue

                if _is_blocked_website_response(response.text):
                    errors.append(f"{candidate_url}: blocked by website security")
                    continue

                candidate_text = _extract_website_text(response.text)
                if len(candidate_text) < 30:
                    errors.append(f"{candidate_url}: not enough readable text")
                    continue

                website_url = str(response.url)
                page_text = candidate_text
                break
            except HTTPException as exc:
                errors.append(f"{candidate_url}: {exc.detail}")
            except httpx.HTTPStatusError as exc:
                errors.append(f"{candidate_url}: HTTP {exc.response.status_code}")
            except httpx.RequestError as exc:
                errors.append(f"{candidate_url}: {exc.__class__.__name__}")

    if not page_text:
        logger.warning("Website fetch failed for candidates %s: %s", website_url_candidates, errors)
        raise HTTPException(
            status_code=502,
            detail=(
                "Could not read that company website. It may block automated requests. "
                "Try the company's About page URL, or paste the About page text manually."
            ),
        )

    page_text_for_about = _remove_certification_claims(page_text)

    prompt = f"""Based on the following content from the company website ({website_url}), write a professional "About Company" section suitable for federal government contract proposals.

Company name: {company_name}

Instructions:
- Use only facts supported by the website content and the provided vendor profile.
- Mention mission, services, expertise, industries, and differentiators when the source supports them.
- Keep it 2-3 polished paragraphs in a professional proposal tone.
- Do not mention that the content came from a website.
- Do not mention certifications, ISO standards, contract vehicles, clearances, or government experience unless the vendor profile explicitly confirms them.

Vendor profile context:
{json.dumps(vendor_profile, ensure_ascii=False)[:3000]}

Website content:
{page_text_for_about}
"""

    try:
        about_company = ai_service.generate_section(prompt)
    except Exception as exc:
        logger.error("Company website summary generation failed: %s", exc)
        about_company = _draft_company_about_fallback(company_name, page_text)
        return {
            "about_company": re.sub(r"<[^>]+>", "", about_company or "").strip(),
            "source_url": website_url,
            "extracted_text_chars": len(page_text),
            "used_fallback": True,
            "warning": "AI generation is currently unavailable, so a website-text draft was used.",
        }

    return {
        "about_company": re.sub(r"<[^>]+>", "", about_company or "").strip(),
        "source_url": website_url,
        "extracted_text_chars": len(page_text),
        "used_fallback": False,
    }


# ============================================================
# Proposal Generation (authenticated)
# ============================================================

@app.post("/api/generate-proposal", response_model=ProposalResponse)
async def generate_proposal(
    request: ProposalRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        # Validate sections
        valid_sections = [
            section for section in request.sections if section in AVAILABLE_SECTIONS
        ]

        if not valid_sections:
            raise HTTPException(
                status_code=400,
                detail=f"No valid sections requested. Available sections: {AVAILABLE_SECTIONS}",
            )

        logger.info(
            "Generating proposal for '%s' targeting '%s' (%d sections)",
            request.vendor.get("company_name", "Unknown"),
            request.opportunity.get("title", "Unknown"),
            len(valid_sections),
        )

        # 🔥 FIXED: Generate each section individually
        generated_sections = {}

        for section in valid_sections:
            try:
                prompt = f"""
You are a professional government proposal writer.

Write a detailed, high-quality section for:

{section}

Vendor:
{request.vendor.get("company_name", "")}

Opportunity:
{request.opportunity.get("title", "")}

Description:
{request.opportunity.get("description", "")}

Make it formal, structured, and proposal-ready.
"""

                content = ai_service.generate_section(prompt)

                generated_sections[section] = {
                    "title": section,
                    "content": content.strip() if content else "Content could not be generated.",
                }

            except Exception as e:
                logger.error(f"Error generating section {section}: {e}")
                generated_sections[section] = {
                    "title": section,
                    "content": f"Error generating content for {section}",
                }

        # Create response sections
        proposal_id = str(uuid.uuid4())

        sections_response = {
            key: ProposalSection(
                title=val["title"],
                content=val["content"]
            )
            for key, val in generated_sections.items()
        }

        # Metadata
        opp_title = request.opportunity.get("title", "Untitled Opportunity")
        opp_agency = request.opportunity.get("agency", "")
        opp_desc = request.opportunity.get("description", "")

        vendor_data = request.vendor or {}
        opp_data = request.opportunity or {}

        proposal_metadata = {
            "proposal_type": opp_data.get("proposal_type", "Government Contract Proposal"),
            "agency": opp_agency,
            "contracting_office": opp_data.get("contracting_office", ""),
            "solicitation_number": opp_data.get("solicitation_number", ""),
            "submission_date": opp_data.get("submission_date", ""),
            "cage_code": vendor_data.get("cage_code", ""),
            "duns_number": vendor_data.get("duns_number", ""),
            "naics_codes": vendor_data.get("naics_codes", []),
            "poc_name": opp_data.get("poc_name", ""),
            "poc_title": opp_data.get("poc_title", ""),
            "poc_email": opp_data.get("poc_email", ""),
            "poc_phone": opp_data.get("poc_phone", ""),
            "vendor_name": vendor_data.get("company_name", ""),
        }

        # Save to DB
        db_proposal = Proposal(
            id=proposal_id,
            user_id=current_user.id,
            title=f"Proposal for {opp_title}",
            opportunity_title=opp_title,
            opportunity_agency=opp_agency,
            opportunity_description=opp_desc,
            sections={
                key: {
                    "title": val["title"],
                    "content": val["content"]
                }
                for key, val in generated_sections.items()
            },
            proposal_metadata=proposal_metadata,
            status="completed",
        )

        db.add(db_proposal)
        await db.flush()

        # Audit log
        await log_audit(
            db,
            user_id=current_user.id,
            action="created_proposal",
            proposal_id=proposal_id,
            details=json.dumps({
                "title": opp_title,
                "sections": len(valid_sections)
            }),
            ip_address=req.client.host if req.client else None,
        )

        return ProposalResponse(
            proposal_id=proposal_id,
            opportunity_title=opp_title,
            vendor_name=request.vendor.get("company_name", "Unknown Vendor"),
            sections=sections_response,
            metadata=proposal_metadata,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Proposal generation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate proposal: {exc}",
        )
# ============================================================
# AI Section Generation (authenticated)
# ============================================================

@app.post("/api/proposals/generate-section")
async def generate_section(request: Request):
    body = await request.json()
    prompt = body.get("prompt", "")

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    try:
        content = ai_service.generate_section(prompt)
        return {"content": content}

    except Exception as exc:
        logger.error("Section generation failed: %s", exc)

        import re

        # Only use the local fallback for prompts that explicitly provide source content.
        # Proposal-section prompts do not have a Content/Make it block; returning the
        # prompt itself would overwrite proposal sections with instructions.
        match = re.search(
            r'Content:\s*(.*?)\s*Make it:',
            prompt,
            re.DOTALL,
        )

        if not match:
            raise HTTPException(
                status_code=502,
                detail=(
                    "AI section generation failed. Please check the AI service/API quota "
                    "and try AI Rewrite again."
                ),
            )

        cleaned = match.group(1).strip()

        sentences = re.split(r'(?<=[.!?])\s+', cleaned)

        summary = []
        for s in sentences:
            if len(s) > 40:
                summary.append(s.strip())
            if len(summary) >= 5:
                break

        return {
            "content": " ".join(summary)
        }
@app.post("/api/ai/generate")
async def ai_generate(request: Request):
    body = await request.json()
    prompt = body.get("prompt", "")

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    try:
        content = ai_service.generate_section(prompt)

        return {
            "content": content
        }

    except Exception as exc:
        logger.error("AI generate failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {exc}"
        )
# ============================================================
# RFP Deconstructor (authenticated)
# ============================================================

@app.post("/api/rfp/deconstruct")
async def deconstruct_rfp(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    """Upload a solicitation PDF and AI-extract structured requirements."""
    import PyPDF2
    import io

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")

    # Extract text from PDF
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(contents))
        text_parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        pdf_text = "\n".join(text_parts)
    except Exception as exc:
        logger.error("PDF extraction failed: %s", exc)
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}")

    if not pdf_text.strip():
        raise HTTPException(status_code=400, detail="No text found in PDF. The document may be scanned/image-based.")

    # Truncate to ~30k chars to stay within AI context limits
    pdf_text = pdf_text[:30000]

    prompt = f"""You are an expert government contracting analyst. Analyze this solicitation/RFP document and extract a structured breakdown.

Return a JSON object (no markdown fences, raw JSON only) with these fields:
{{
  "title": "Solicitation title",
  "solicitation_number": "Number if found, or null",
  "agency": "Issuing agency name",
  "naics_code": "NAICS code if found, or null",
  "set_aside": "Set-aside type if any (e.g., Small Business, 8(a), SDVOSB), or null",
  "deadline": "Submission deadline if found, or null",
  "contract_type": "Contract type (FFP, T&M, CPFF, etc.) if found, or null",
  "estimated_value": "Estimated contract value if found, or null",
  "period_of_performance": "Performance period if found, or null",
  "place_of_performance": "Location if found, or null",
  "summary": "2-3 sentence summary of the requirement",
  "requirements": [
    {{
      "id": "REQ-001",
      "category": "Technical|Management|Staffing|Compliance|Reporting|Deliverable|Other",
      "requirement": "Clear requirement text",
      "priority": "Must Have|Should Have|Nice to Have",
      "far_clauses": ["FAR clause numbers if referenced"],
      "section_reference": "Section of the RFP where this was found"
    }}
  ],
  "evaluation_criteria": [
    {{
      "factor": "Evaluation factor name",
      "weight": "Weight or priority if stated",
      "description": "What the evaluator is looking for"
    }}
  ],
  "key_dates": [
    {{
      "event": "Event name",
      "date": "Date string"
    }}
  ],
  "compliance_items": [
    {{
      "clause": "FAR/DFARS clause number",
      "title": "Clause title",
      "action_required": "What the offeror must do"
    }}
  ]
}}

SOLICITATION TEXT:
{pdf_text}"""

    try:
        result = ai_service.generate_section(prompt)
        # Try to parse as JSON
        import json as json_mod
        # Clean up possible markdown fences
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed = json_mod.loads(cleaned)
        return {"status": "success", "data": parsed, "page_count": len(reader.pages)}
    except json_mod.JSONDecodeError:
        # Return raw text if JSON parsing fails
        return {"status": "partial", "raw_analysis": result, "page_count": len(reader.pages)}
    except Exception as exc:
        logger.error("RFP deconstruction failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {exc}")


# ============================================================
# Compliance Analysis (authenticated)
# ============================================================

@app.post("/api/compliance/analyze")
async def analyze_compliance(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """AI-analyze RFP text to extract structured requirements."""
    body = await request.json()
    text = body.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    prompt = f"""Analyze this government RFP/solicitation text and extract ALL requirements.

For each requirement found (especially sentences containing "shall", "must", "required", "mandatory", "will be required"):

Return a JSON array with this exact structure:
{{
  "requirements": [
    {{
      "text": "The exact requirement text",
      "keywords": ["shall", "must"],
      "priority": "Critical",
      "category": "Technical",
      "section": "L.4.2"
    }}
  ]
}}

Priority levels: Critical (shall/must/mandatory), High (should/expected), Medium (may/desired), Low (optional)
Categories: Technical, Management, Staffing, Compliance, Past Performance, Pricing, Security, Other

Text to analyze:
{text[:8000]}

Return ONLY valid JSON, no markdown or extra text."""

    try:
        content = ai_service.generate_section(prompt)
        cleaned = content.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)
        return parsed
    except Exception:
        # Fallback: simple keyword extraction
        import re
        sentences = re.split(r'(?<=[.;])\s+|\n', text)
        reqs = []
        for s in sentences:
            s = s.strip()
            if len(s) > 20 and re.search(r'\b(shall|must|required|mandatory)\b', s, re.I):
                keywords = re.findall(r'\b(shall|must|required|mandatory)\b', s, re.I)
                reqs.append({
                    "text": s,
                    "keywords": list(set(k.lower() for k in keywords)),
                    "priority": "Critical" if any(k.lower() in ('shall', 'must', 'mandatory') for k in keywords) else "High",
                    "category": "Other",
                    "section": "",
                })
        return {"requirements": reqs}


# ============================================================
# Contract Management CRUD (authenticated)
# ============================================================

@app.get("/api/contracts")
async def list_contracts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all contracts for the current user."""
    from db_models import Contract
    result = await db.execute(
        select(Contract)
        .where(Contract.user_id == current_user.id)
        .order_by(Contract.created_at.desc())
    )
    contracts = result.scalars().all()
    return {
        "contracts": [
            {
                "id": c.id,
                "title": c.title,
                "contract_number": c.contract_number,
                "agency": c.agency,
                "status": c.status,
                "value": c.value,
                "start_date": c.start_date,
                "end_date": c.end_date,
                "deliverables": json.loads(c.deliverables) if c.deliverables else [],
                "notes": c.notes,
                "created_at": str(c.created_at),
                "updated_at": str(c.updated_at),
            }
            for c in contracts
        ]
    }


@app.post("/api/contracts")
async def create_contract(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new contract."""
    from db_models import Contract
    body = await request.json()
    contract = Contract(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=body.get("title", ""),
        contract_number=body.get("contract_number", ""),
        agency=body.get("agency", ""),
        status=body.get("status", "active"),
        value=body.get("value", 0),
        start_date=body.get("start_date"),
        end_date=body.get("end_date"),
        deliverables=json.dumps(body.get("deliverables", [])),
        notes=body.get("notes", ""),
    )
    db.add(contract)
    await db.commit()
    await db.refresh(contract)
    return {"message": "Contract created", "id": contract.id}


@app.put("/api/contracts/{contract_id}")
async def update_contract(
    contract_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing contract."""
    from db_models import Contract
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    body = await request.json()
    for field in ["title", "contract_number", "agency", "status", "value", "start_date", "end_date", "notes"]:
        if field in body:
            setattr(contract, field, body[field])
    if "deliverables" in body:
        contract.deliverables = json.dumps(body["deliverables"])

    await db.commit()
    return {"message": "Contract updated"}


@app.delete("/api/contracts/{contract_id}")
async def delete_contract(
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a contract."""
    from db_models import Contract
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.user_id == current_user.id)
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found.")

    await db.delete(contract)
    await db.commit()
    return {"message": "Contract deleted"}


# ============================================================
# Proposal CRUD (authenticated, scoped to user)
# ============================================================

@app.get("/api/proposals")
async def list_proposals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all proposals belonging to the current user.
    """
    result = await db.execute(
        select(Proposal)
        .where(Proposal.user_id == current_user.id)
        .order_by(Proposal.created_at.desc())
    )
    proposals = result.scalars().all()

    return {
        "count": len(proposals),
        "proposals": [p.to_dict() for p in proposals],
    }


@app.get("/api/proposals/{proposal_id}")
async def get_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific proposal by ID (must belong to the current user).
    """
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()

    if proposal is None:
        raise HTTPException(
            status_code=404,
            detail="Proposal not found.",
        )

    return {"proposal": proposal.to_dict()}


@app.delete("/api/proposals/{proposal_id}")
async def delete_proposal(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a specific proposal by ID (must belong to the current user).
    """
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()

    if proposal is None:
        raise HTTPException(
            status_code=404,
            detail="Proposal not found.",
        )

    await db.delete(proposal)
    await db.flush()

    logger.info("Proposal deleted: %s (user: %s)", proposal_id, current_user.email)

    return {"message": "Proposal deleted successfully."}


# ============================================================
# Search Sources (authenticated — master list of opportunity websites)
# ============================================================

@app.get("/api/search-sources")
async def list_search_sources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active search sources (master list)."""
    result = await db.execute(
        select(SearchSource)
        .where(SearchSource.is_active == True)
        .order_by(SearchSource.is_default.desc(), SearchSource.created_at.asc())
    )
    sources = result.scalars().all()
    return {
        "count": len(sources),
        "sources": [s.to_dict() for s in sources],
    }


@app.post("/api/search-sources")
async def add_search_source(
    source: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new opportunity website to the master search list."""
    name = source.get("name", "").strip()
    url = source.get("url", "").strip()
    description = source.get("description", "").strip()

    if not name or not url:
        raise HTTPException(status_code=400, detail="Name and URL are required.")

    # Check if URL already exists
    result = await db.execute(
        select(SearchSource).where(SearchSource.url == url)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="This URL is already in the search source list.")

    new_source = SearchSource(
        name=name,
        url=url,
        description=description,
        is_default=False,
        is_active=True,
        added_by=current_user.id,
    )
    db.add(new_source)
    await db.flush()

    logger.info("Search source added: %s (%s) by %s", name, url, current_user.email)

    return {"message": f"Source '{name}' added to master search list.", "source": new_source.to_dict()}


@app.delete("/api/search-sources/{source_id}")
async def delete_search_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a search source from the master list. Default sources (SAM.gov) cannot be removed."""
    result = await db.execute(
        select(SearchSource).where(SearchSource.id == source_id)
    )
    source = result.scalar_one_or_none()

    if source is None:
        raise HTTPException(status_code=404, detail="Search source not found.")

    if source.is_default:
        raise HTTPException(status_code=400, detail="Default sources cannot be removed.")

    await db.delete(source)
    await db.flush()

    logger.info("Search source removed: %s (by %s)", source.name, current_user.email)

    return {"message": f"Source '{source.name}' removed from master search list."}


# ============================================================
# Proposal Templates (authenticated)
# ============================================================

@app.get("/api/templates")
async def list_templates(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all proposal templates, optionally filtered by category."""
    query = select(ProposalTemplate)
    if category:
        query = query.where(ProposalTemplate.category == category)
    query = query.order_by(ProposalTemplate.category, ProposalTemplate.name)

    result = await db.execute(query)
    templates = result.scalars().all()

    # Get user's favorites
    fav_result = await db.execute(
        select(FavoriteTemplate.template_id).where(FavoriteTemplate.user_id == current_user.id)
    )
    fav_ids = set(row[0] for row in fav_result.all())

    # Get unique categories
    cat_result = await db.execute(
        select(ProposalTemplate.category).distinct()
    )
    categories = sorted([row[0] for row in cat_result.all()])

    templates_data = []
    for t in templates:
        d = t.to_dict()
        d["is_favorite"] = t.id in fav_ids
        # Don't include full sections in list view (too large)
        d.pop("sections", None)
        templates_data.append(d)

    return {
        "count": len(templates_data),
        "categories": categories,
        "templates": templates_data,
    }


@app.get("/api/templates/{template_id}")
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific template with full sections content."""
    result = await db.execute(
        select(ProposalTemplate).where(ProposalTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found.")

    # Check if favorited
    fav_result = await db.execute(
        select(FavoriteTemplate).where(
            FavoriteTemplate.user_id == current_user.id,
            FavoriteTemplate.template_id == template_id,
        )
    )
    is_fav = fav_result.scalar_one_or_none() is not None

    data = template.to_dict()
    data["is_favorite"] = is_fav
    return {"template": data}


@app.post("/api/templates/{template_id}/use")
async def use_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a template as used (increment use count) and return its full data."""
    result = await db.execute(
        select(ProposalTemplate).where(ProposalTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if template is None:
        raise HTTPException(status_code=404, detail="Template not found.")

    template.use_count = (template.use_count or 0) + 1
    db.add(template)
    await db.flush()

    return {"template": template.to_dict()}


@app.post("/api/templates/{template_id}/favorite")
async def toggle_favorite(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle favorite status of a template for the current user."""
    # Check template exists
    result = await db.execute(
        select(ProposalTemplate).where(ProposalTemplate.id == template_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Template not found.")

    # Check existing favorite
    result = await db.execute(
        select(FavoriteTemplate).where(
            FavoriteTemplate.user_id == current_user.id,
            FavoriteTemplate.template_id == template_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.flush()
        return {"favorited": False, "message": "Template removed from favorites."}
    else:
        fav = FavoriteTemplate(user_id=current_user.id, template_id=template_id)
        db.add(fav)
        await db.flush()
        return {"favorited": True, "message": "Template added to favorites."}


# ============================================================
# Export Endpoints (authenticated)
# ============================================================

@app.post("/api/export/docx")
async def export_docx(
    request: ExportRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export proposal sections as a formatted Word document (.docx).

    Returns the document as a downloadable file.
    """
    try:
        proposal_data = {
            "proposal_title": request.proposal_title,
            "vendor_name": request.vendor_name,
            "sections": {
                key: {"title": section.title, "content": section.content}
                for key, section in request.sections.items()
            },
            "metadata": request.metadata or {},
            "company_logo": request.company_logo or "",
            "template": request.template or {},
            "floating_images": request.floating_images or [],
            "volume_assignments": request.volume_assignments or {},
        }

        buffer = generate_docx(proposal_data)

        # Audit log
        await log_audit(
            db,
            user_id=current_user.id,
            action="exported_docx",
            details=json.dumps({"title": request.proposal_title}),
            ip_address=req.client.host if req.client else None,
        )

        # Generate filename
        safe_title = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in request.proposal_title
        ).strip()[:50]
        filename = f"{safe_title or 'Proposal'}.docx"

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error("DOCX export failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export DOCX: {exc}",
        )


@app.post("/api/export/pdf")
async def export_pdf(
    request: ExportRequest,
    req: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export proposal sections as a formatted PDF document.

    Returns the document as a downloadable file.
    """
    try:
        proposal_data = {
            "proposal_title": request.proposal_title,
            "vendor_name": request.vendor_name,
            "sections": {
                key: {"title": section.title, "content": section.content}
                for key, section in request.sections.items()
            },
            "metadata": request.metadata or {},
            "company_logo": request.company_logo or "",
            "template": request.template or {},
            "floating_images": request.floating_images or [],
            "volume_assignments": request.volume_assignments or {},
        }

        buffer = generate_pdf(proposal_data)

        # Audit log
        await log_audit(
            db,
            user_id=current_user.id,
            action="exported_pdf",
            details=json.dumps({"title": request.proposal_title}),
            ip_address=req.client.host if req.client else None,
        )

        # Generate filename
        safe_title = "".join(
            c if c.isalnum() or c in (" ", "-", "_") else "_"
            for c in request.proposal_title
        ).strip()[:50]
        filename = f"{safe_title or 'Proposal'}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error("PDF export failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export PDF: {exc}",
        )


# ============================================================
# Admin Endpoints (admin only)
# ============================================================

@app.get("/api/admin/users")
async def admin_list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    List all users in the system (admin only).
    """
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()

    return {
        "count": len(users),
        "users": [u.to_dict() for u in users],
    }


@app.get("/api/admin/stats")
async def admin_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get platform-wide statistics (admin only).

    Returns total users, total proposals, and active subscription count.
    """
    # Total users
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar() or 0

    # Total proposals
    result = await db.execute(select(func.count(Proposal.id)))
    total_proposals = result.scalar() or 0

    # Active subscriptions
    result = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    )
    active_subscriptions = result.scalar() or 0

    # Users by tier
    result = await db.execute(
        select(User.subscription_tier, func.count(User.id)).group_by(User.subscription_tier)
    )
    tier_counts = {row[0]: row[1] for row in result.all()}

    return {
        "total_users": total_users,
        "total_proposals": total_proposals,
        "active_subscriptions": active_subscriptions,
        "users_by_tier": tier_counts,
    }


@app.put("/api/admin/users/{user_id}")
async def admin_update_user(
    user_id: str,
    update: dict,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's admin status or subscription tier (admin only).

    Accepted fields in body: is_admin (bool), subscription_tier (str: "free" or "paid").
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    if "is_admin" in update:
        user.is_admin = bool(update["is_admin"])
    if "subscription_tier" in update:
        tier = update["subscription_tier"]
        if tier not in ("free", "paid"):
            raise HTTPException(
                status_code=400,
                detail="subscription_tier must be 'free' or 'paid'.",
            )
        user.subscription_tier = tier
    if "full_name" in update:
        user.full_name = update["full_name"]
    if "company_name" in update:
        user.company_name = update["company_name"]

    db.add(user)
    await db.flush()

    logger.info("Admin updated user %s: %s", user_id, update)

    return {"message": "User updated.", "user": user.to_dict()}


# ============================================================
# Payment / Subscription Endpoints
# ============================================================

from services.payment_service import stripe_service, razorpay_service, PLANS

@app.get("/api/plans")
async def get_plans():
    """Get available subscription plans."""
    return {"plans": PLANS}


@app.post("/api/payments/stripe/checkout")
async def stripe_checkout(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe checkout session."""
    plan = body.get("plan", "professional")
    base_url = body.get("base_url", "http://localhost:8000")

    result = stripe_service.create_checkout_session(
        plan=plan,
        user_email=current_user.email,
        user_id=current_user.id,
        success_url=f"{base_url}/dashboard?payment=success&plan={plan}",
        cancel_url=f"{base_url}/billing?payment=cancelled",
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/payments/stripe/webhook")
async def stripe_webhook(request_obj=None):
    """Handle Stripe webhook events."""
    from starlette.requests import Request
    from fastapi import Request as FR

    # Get the raw request
    import starlette
    # This endpoint uses raw body
    return {"received": True}


@app.post("/api/payments/razorpay/order")
async def razorpay_create_order(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Create a Razorpay order."""
    plan = body.get("plan", "professional")
    result = razorpay_service.create_order(plan=plan, user_id=current_user.id)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/payments/razorpay/verify")
async def razorpay_verify_payment(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment and activate subscription."""
    order_id = body.get("order_id", "")
    payment_id = body.get("payment_id", "")
    signature = body.get("signature", "")
    plan = body.get("plan", "professional")

    is_valid = razorpay_service.verify_payment(order_id, payment_id, signature)

    if is_valid:
        # Update user's subscription tier
        result = await db.execute(select(User).where(User.id == current_user.id))
        user = result.scalar_one_or_none()
        if user:
            user.subscription_tier = "paid" if plan in ("professional", "enterprise") else "free"
            db.add(user)
            await db.flush()
        return {"verified": True, "plan": plan}
    else:
        raise HTTPException(status_code=400, detail="Payment verification failed")


@app.get("/api/payments/config")
async def payment_config():
    """Get payment gateway configuration (public keys only)."""
    return {
        "stripe": {
            "configured": stripe_service.is_configured,
            "publishable_key": stripe_service.publishable_key if stripe_service.is_configured else None,
        },
        "razorpay": {
            "configured": razorpay_service.is_configured,
            "key_id": razorpay_service.key_id if razorpay_service.is_configured else None,
        },
    }


# ============================================================
# Image Upload for Proposals
# ============================================================

UPLOADS_DIR = DATA_DIR / "uploads"
from fastapi.staticfiles import StaticFiles

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

from fastapi import UploadFile, File

@app.post("/api/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload an image for use in proposal sections (logo, photos, etc.)."""
    # Validate file type
    allowed_types = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed. Use PNG, JPEG, GIF, WebP, or SVG.")

    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    # Save to user-specific directory
    user_dir = UPLOADS_DIR / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    file_path = user_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/uploads/{current_user.id}/{unique_name}"
    logger.info("Image uploaded by user %s: %s", current_user.id, unique_name)

    return {"url": image_url, "filename": unique_name, "size": len(contents)}


#@app.get("/api/uploads/{user_id}/{filename}")
#async def serve_upload(user_id: int, filename: str):
 ##  from fastapi.responses import FileResponse as FR
   # file_path = UPLOADS_DIR / str(user_id) / filename
    ##   raise HTTPException(status_code=404, detail="Image not found")
    #return FR(str(file_path))


@app.delete("/api/upload-image/{filename}")
async def delete_image(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an uploaded image."""
    file_path = UPLOADS_DIR / str(current_user.id) / filename
    if file_path.exists():
        file_path.unlink()
        return {"message": "Image deleted."}
    raise HTTPException(status_code=404, detail="Image not found")


# ============================================================
# Audit Log Helper
# ============================================================

async def log_audit(
    db: AsyncSession,
    user_id: str,
    action: str,
    proposal_id: str = None,
    details: str = None,
    ip_address: str = None,
):
    """Create an audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        proposal_id=proposal_id,
        action=action,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
    logger.info("Audit log: user=%s action=%s proposal=%s", user_id, action, proposal_id)


# ============================================================
# Proposal Share Endpoints (authenticated + one public)
# ============================================================

@app.post("/api/proposals/{proposal_id}/share")
async def create_share_link(
    proposal_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a shareable link for a proposal draft."""
    # Verify proposal belongs to user
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    share = ProposalShare(
        proposal_id=proposal_id,
        created_by=current_user.id,
    )
    db.add(share)
    await db.flush()

    # Audit log
    await log_audit(
        db,
        user_id=current_user.id,
        action="shared_proposal",
        proposal_id=proposal_id,
        details=json.dumps({"share_token": share.share_token}),
        ip_address=request.client.host if request.client else None,
    )

    logger.info("Share link created for proposal %s by %s", proposal_id, current_user.email)

    return {
        "share": share.to_dict(),
        "share_url": f"/shared/{share.share_token}",
    }


@app.get("/api/proposals/{proposal_id}/shares")
async def list_share_links(
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List active share links for a proposal."""
    # Verify proposal belongs to user
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    result = await db.execute(
        select(ProposalShare).where(
            ProposalShare.proposal_id == proposal_id,
            ProposalShare.is_active == True,
        ).order_by(ProposalShare.created_at.desc())
    )
    shares = result.scalars().all()

    return {
        "count": len(shares),
        "shares": [s.to_dict() for s in shares],
    }


@app.delete("/api/proposals/{proposal_id}/share/{share_id}")
async def deactivate_share_link(
    proposal_id: str,
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a share link."""
    # Verify proposal belongs to user
    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.user_id == current_user.id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Proposal not found.")

    result = await db.execute(
        select(ProposalShare).where(
            ProposalShare.id == share_id,
            ProposalShare.proposal_id == proposal_id,
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=404, detail="Share link not found.")

    share.is_active = False
    db.add(share)
    await db.flush()

    logger.info("Share link deactivated: %s (user: %s)", share_id, current_user.email)

    return {"message": "Share link deactivated."}


@app.get("/api/shared/{share_token}")
async def get_shared_proposal(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — view a shared proposal draft (no auth required).
    Checks that the share link is active and not expired.
    """
    from datetime import datetime, timezone

    result = await db.execute(
        select(ProposalShare).where(ProposalShare.share_token == share_token)
    )
    share = result.scalar_one_or_none()

    if share is None or not share.is_active:
        raise HTTPException(status_code=404, detail="Share link not found or has been deactivated.")

    # Check expiry
    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This share link has expired.")

    # Get proposal
    result = await db.execute(
        select(Proposal).where(Proposal.id == share.proposal_id)
    )
    proposal = result.scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal no longer exists.")

    # Get creator info
    result = await db.execute(
        select(User).where(User.id == share.created_by)
    )
    creator = result.scalar_one_or_none()

    return {
        "proposal": proposal.to_dict(),
        "shared_by": creator.full_name if creator else "Unknown",
        "shared_on": share.created_at.isoformat() if share.created_at else None,
    }


# ============================================================
# Audit Log Endpoint (authenticated)
# ============================================================

@app.get("/api/audit-log")
async def get_audit_log(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit log entries for the current user.
    Supports pagination with limit/offset.
    """
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    entries = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "entries": [e.to_dict() for e in entries],
    }


# ============================================================
# Serve React Frontend (static files)
# ============================================================

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.responses import FileResponse

    # Mount static assets (both paths for base-path and direct access)
    app.mount("/govproposal-ai/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets_base")
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    # Catch-all route for SPA - must be after all API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for any non-API route."""
        # Don't intercept API routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        # Strip base path prefix for file lookup
        clean_path = full_path
        if clean_path.startswith("govproposal-ai/"):
            clean_path = clean_path[len("govproposal-ai/"):]
        # Try to serve the specific file first
        file_path = FRONTEND_DIST / clean_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Otherwise serve index.html for SPA routing
        return FileResponse(str(FRONTEND_DIST / "index.html"))


# ============================================================
# Opportunity Alerts (auto-search every N hours)
# ============================================================

@app.get("/api/opportunity-alerts")
async def get_opportunity_alert(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's opportunity alert settings."""
    result = await db.execute(
        select(OpportunityAlert).where(OpportunityAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        return {"alert": None}
    return {"alert": alert.to_dict()}


@app.post("/api/opportunity-alerts")
async def create_or_update_alert(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update auto-search alert settings."""
    body = await request.json()
    naics_codes = body.get("naics_codes", "")
    keywords = body.get("keywords", "")
    is_active = body.get("is_active", True)
    frequency_hours = body.get("frequency_hours", 4)

    result = await db.execute(
        select(OpportunityAlert).where(OpportunityAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()

    if alert:
        alert.naics_codes = naics_codes
        alert.keywords = keywords
        alert.is_active = is_active
        alert.frequency_hours = frequency_hours
    else:
        alert = OpportunityAlert(
            user_id=current_user.id,
            naics_codes=naics_codes,
            keywords=keywords,
            is_active=is_active,
            frequency_hours=frequency_hours,
        )
        db.add(alert)

    await db.commit()
    await db.refresh(alert)
    return {"alert": alert.to_dict(), "message": "Alert settings saved successfully."}


@app.delete("/api/opportunity-alerts")
async def delete_alert(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete the user's opportunity alert."""
    result = await db.execute(
        select(OpportunityAlert).where(OpportunityAlert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if alert:
        await db.delete(alert)
        await db.commit()
    return {"message": "Alert deleted."}


# ============================================================
# Run with uvicorn
# ============================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )