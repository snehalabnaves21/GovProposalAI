"""
GovCon Compliance Engine API routes.

Endpoints for NAICS codes, compliance requirements, contract vehicles,
agencies, company compliance management, and AI recommendations.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import (
    User,
    VendorProfileDB,
    NAICSCode,
    ComplianceRequirement,
    NAICSComplianceMap,
    Agency,
    ContractVehicle,
    NAICSContractMap,
    ContractComplianceMap,
    Company,
    CompanyNAICS,
    CompanyCompliance,
    Opportunity,
    ProposalComplianceCheck,
    Proposal,
    AIRecommendation,
)
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Compliance"])


# ──────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str = Field(..., max_length=255)
    uei: Optional[str] = Field(None, max_length=50)
    sam_registered: bool = False
    business_type: Optional[str] = Field(None, max_length=100)


class CompanyNAICSAdd(BaseModel):
    naics_id: str
    is_primary: bool = False


class ComplianceStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Compliant|In Progress|Not Started)$")
    certification_date: Optional[str] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = None


class ContractVehicleCreate(BaseModel):
    name: str = Field(..., max_length=255)
    type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    agency_name: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    website_url: Optional[str] = None


# ──────────────────────────────────────────────
# Helper: get or create company for current user
# ──────────────────────────────────────────────

async def _get_company(db: AsyncSession, user_id: str) -> Company | None:
    result = await db.execute(select(Company).where(Company.user_id == user_id))
    return result.scalar_one_or_none()


# ──────────────────────────────────────────────
# NAICS Codes
# ──────────────────────────────────────────────

@router.get("/naics")
async def list_naics(
    industry_category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all NAICS codes, optionally filtered by industry category."""
    query = select(NAICSCode).where(NAICSCode.is_active == True)
    if industry_category:
        query = query.where(NAICSCode.industry_category == industry_category)
    query = query.order_by(NAICSCode.code)
    result = await db.execute(query)
    codes = result.scalars().all()
    return [
        {
            "id": c.id, "code": c.code, "title": c.title,
            "description": c.description, "industry_category": c.industry_category,
        }
        for c in codes
    ]


@router.get("/naics/{code}/suggest-compliance")
async def suggest_naics_compliance(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Based on a NAICS code from the business profile, suggest related compliance
    requirements and show which ones the user has already confirmed.
    """
    result = await db.execute(select(NAICSCode).where(NAICSCode.code == code))
    naics = result.scalar_one_or_none()
    if not naics:
        raise HTTPException(status_code=404, detail="NAICS code not found")

    comp_result = await db.execute(
        select(ComplianceRequirement, NAICSComplianceMap.priority_level)
        .join(NAICSComplianceMap, NAICSComplianceMap.compliance_id == ComplianceRequirement.id)
        .where(NAICSComplianceMap.naics_id == naics.id)
    )
    requirements = comp_result.all()

    company = await _get_company(db, current_user.id)
    user_statuses = {}
    if company:
        cc_result = await db.execute(
            select(CompanyCompliance).where(CompanyCompliance.company_id == company.id)
        )
        for cc in cc_result.scalars().all():
            user_statuses[cc.compliance_id] = cc.status

    suggested = []
    for req, priority in requirements:
        status = user_statuses.get(req.id, "not_started")
        suggested.append({
            "id": req.id,
            "name": req.name,
            "category": req.category,
            "description": req.description,
            "mandatory": req.mandatory,
            "priority_level": priority,
            "user_status": status,
            "confirmed": status == "compliant",
        })

    return {
        "naics_code": naics.code,
        "naics_title": naics.title,
        "suggested_compliance": suggested,
        "total": len(suggested),
        "confirmed_count": sum(1 for s in suggested if s["confirmed"]),
    }


@router.post("/naics/{code}/confirm-compliance/{requirement_id}")
async def confirm_naics_compliance(
    code: str,
    requirement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle compliance confirmation for a NAICS-linked requirement."""
    company = await _get_company(db, current_user.id)
    if not company:
        vp_result = await db.execute(
            select(VendorProfileDB)
            .where(VendorProfileDB.user_id == current_user.id)
            .order_by(VendorProfileDB.updated_at.desc())
        )
        vendor = vp_result.scalar_one_or_none()
        company = Company(
            user_id=current_user.id,
            name=vendor.company_name if vendor else "My Company",
        )
        db.add(company)
        await db.flush()

    req_result = await db.execute(
        select(ComplianceRequirement).where(ComplianceRequirement.id == requirement_id)
    )
    if not req_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Compliance requirement not found")

    result = await db.execute(
        select(CompanyCompliance).where(
            CompanyCompliance.company_id == company.id,
            CompanyCompliance.compliance_id == requirement_id,
        )
    )
    cc = result.scalar_one_or_none()

    if cc:
        cc.status = "not_started" if cc.status == "compliant" else "compliant"
        new_status = cc.status
    else:
        cc = CompanyCompliance(
            company_id=company.id,
            compliance_id=requirement_id,
            status="compliant",
        )
        db.add(cc)
        new_status = "compliant"

    await db.flush()
    return {"requirement_id": requirement_id, "status": new_status, "confirmed": new_status == "compliant"}


@router.get("/naics/{code}")
async def get_naics_detail(code: str, db: AsyncSession = Depends(get_db)):
    """Get NAICS code details with associated compliance requirements and contract vehicles."""
    result = await db.execute(select(NAICSCode).where(NAICSCode.code == code))
    naics = result.scalar_one_or_none()
    if not naics:
        raise HTTPException(status_code=404, detail="NAICS code not found")

    comp_result = await db.execute(
        select(ComplianceRequirement, NAICSComplianceMap.priority_level)
        .join(NAICSComplianceMap, NAICSComplianceMap.compliance_id == ComplianceRequirement.id)
        .where(NAICSComplianceMap.naics_id == naics.id)
    )
    requirements = [
        {
            "id": req.id, "name": req.name, "category": req.category,
            "description": req.description, "mandatory": req.mandatory,
            "priority_level": priority,
        }
        for req, priority in comp_result.all()
    ]

    veh_result = await db.execute(
        select(ContractVehicle, NAICSContractMap.relevance_score)
        .join(NAICSContractMap, NAICSContractMap.contract_vehicle_id == ContractVehicle.id)
        .where(NAICSContractMap.naics_id == naics.id)
        .order_by(NAICSContractMap.relevance_score.desc())
    )
    vehicles = [
        {
            "id": v.id, "name": v.name, "type": v.type,
            "description": v.description, "relevance_score": score,
        }
        for v, score in veh_result.all()
    ]

    return {
        "id": naics.id, "code": naics.code, "title": naics.title,
        "description": naics.description, "industry_category": naics.industry_category,
        "compliance_requirements": requirements,
        "contract_vehicles": vehicles,
    }


# ──────────────────────────────────────────────
# Compliance Requirements
# ──────────────────────────────────────────────

@router.get("/requirements")
async def list_requirements(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all compliance requirements, optionally filtered by category."""
    query = select(ComplianceRequirement)
    if category:
        query = query.where(ComplianceRequirement.category == category)
    query = query.order_by(ComplianceRequirement.category, ComplianceRequirement.name)
    result = await db.execute(query)
    reqs = result.scalars().all()
    return [
        {
            "id": r.id, "name": r.name, "category": r.category,
            "description": r.description, "mandatory": r.mandatory,
        }
        for r in reqs
    ]


@router.get("/requirements/{requirement_id}")
async def get_requirement_detail(requirement_id: str, db: AsyncSession = Depends(get_db)):
    """Get compliance requirement details."""
    result = await db.execute(
        select(ComplianceRequirement).where(ComplianceRequirement.id == requirement_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Compliance requirement not found")
    return {
        "id": req.id, "name": req.name, "category": req.category,
        "description": req.description, "mandatory": req.mandatory,
    }


# ──────────────────────────────────────────────
# Contract Vehicles
# ──────────────────────────────────────────────

@router.get("/vehicles")
async def list_vehicles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active contract vehicles (system + user-created)."""
    from sqlalchemy import or_
    result = await db.execute(
        select(ContractVehicle, Agency.name.label("agency_name"))
        .outerjoin(Agency, Agency.id == ContractVehicle.agency_id)
        .where(
            ContractVehicle.is_active == True,
            or_(
                ContractVehicle.user_id.is_(None),
                ContractVehicle.user_id == current_user.id,
            ),
        )
        .order_by(ContractVehicle.name)
    )
    rows = result.all()
    return [
        {
            "id": v.id, "name": v.name, "type": v.type,
            "agency_id": v.agency_id, "agency_name": ag_name,
            "description": v.description,
            "eligibility_criteria": v.eligibility_criteria,
            "website_url": v.website_url,
            "is_custom": v.user_id is not None,
        }
        for v, ag_name in rows
    ]


@router.post("/vehicles")
async def create_contract_vehicle(
    data: ContractVehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new contract vehicle (user-created)."""
    agency_id = None
    if data.agency_name:
        ag_result = await db.execute(
            select(Agency).where(Agency.name.ilike(f"%{data.agency_name}%"))
        )
        ag = ag_result.scalar_one_or_none()
        if ag:
            agency_id = ag.id

    vehicle = ContractVehicle(
        name=data.name,
        type=data.type,
        agency_id=agency_id,
        description=data.description,
        eligibility_criteria=data.eligibility_criteria,
        website_url=data.website_url,
        user_id=current_user.id,
        is_active=True,
    )
    db.add(vehicle)
    await db.flush()

    return {
        "id": vehicle.id,
        "name": vehicle.name,
        "type": vehicle.type,
        "description": vehicle.description,
        "agency_id": agency_id,
        "website_url": vehicle.website_url,
        "message": "Contract vehicle added",
    }


@router.get("/vehicles/{vehicle_id}")
async def get_vehicle_detail(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    """Get contract vehicle details with compliance requirements."""
    result = await db.execute(
        select(ContractVehicle).where(ContractVehicle.id == vehicle_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Contract vehicle not found")

    comp_result = await db.execute(
        select(ComplianceRequirement, ContractComplianceMap.mandatory)
        .join(ContractComplianceMap, ContractComplianceMap.compliance_id == ComplianceRequirement.id)
        .where(ContractComplianceMap.contract_vehicle_id == vehicle.id)
    )
    requirements = [
        {
            "id": req.id, "name": req.name, "category": req.category,
            "description": req.description, "mandatory": mand,
        }
        for req, mand in comp_result.all()
    ]

    agency_name = None
    if vehicle.agency_id:
        ag_result = await db.execute(select(Agency).where(Agency.id == vehicle.agency_id))
        ag = ag_result.scalar_one_or_none()
        if ag:
            agency_name = ag.name

    return {
        "id": vehicle.id, "name": vehicle.name, "type": vehicle.type,
        "agency_id": vehicle.agency_id, "agency_name": agency_name,
        "description": vehicle.description,
        "eligibility_criteria": vehicle.eligibility_criteria,
        "compliance_requirements": requirements,
    }


@router.delete("/vehicles/{vehicle_id}")
async def delete_contract_vehicle(
    vehicle_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a user-created contract vehicle."""
    result = await db.execute(
        select(ContractVehicle).where(
            ContractVehicle.id == vehicle_id,
            ContractVehicle.user_id == current_user.id,
        )
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found or not owned by you")

    await db.delete(vehicle)
    return {"detail": "Contract vehicle deleted"}


# ──────────────────────────────────────────────
# Agencies
# ──────────────────────────────────────────────

@router.get("/agencies")
async def list_agencies(db: AsyncSession = Depends(get_db)):
    """List all agencies."""
    result = await db.execute(select(Agency).order_by(Agency.name))
    agencies = result.scalars().all()
    return [
        {"id": a.id, "name": a.name, "department": a.department, "website": a.website}
        for a in agencies
    ]


# ──────────────────────────────────────────────
# Company Compliance
# NOTE: Specific sub-routes (/company/check, /company/recommendations, etc.)
# MUST be defined BEFORE the base /company GET route to avoid FastAPI
# treating "check" and "recommendations" as path parameters.
# ──────────────────────────────────────────────

@router.get("/company/check")
async def run_compliance_check(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run a compliance check for the user's company.
    Returns categorized results based on the company's NAICS codes:
    compliant, in_progress, missing.
    """
    company = await _get_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company profile found.")

    naics_result = await db.execute(
        select(CompanyNAICS.naics_id).where(CompanyNAICS.company_id == company.id)
    )
    naics_ids = [row[0] for row in naics_result.all()]

    if not naics_ids:
        return {"compliant": [], "in_progress": [], "missing": [], "summary": "No NAICS codes registered."}

    req_result = await db.execute(
        select(ComplianceRequirement, NAICSComplianceMap.priority_level)
        .join(NAICSComplianceMap, NAICSComplianceMap.compliance_id == ComplianceRequirement.id)
        .where(NAICSComplianceMap.naics_id.in_(naics_ids))
    )
    required = {}
    for req, priority in req_result.all():
        if req.id not in required or priority == "High":
            required[req.id] = {
                "id": req.id, "name": req.name, "category": req.category,
                "mandatory": req.mandatory, "priority_level": priority,
            }

    status_result = await db.execute(
        select(CompanyCompliance).where(CompanyCompliance.company_id == company.id)
    )
    statuses = {cc.compliance_id: cc.status for cc in status_result.scalars().all()}

    compliant = []
    in_progress = []
    missing = []

    for req_id, req_info in required.items():
        current_status = statuses.get(req_id, "Not Started")
        entry = {**req_info, "current_status": current_status}
        if current_status == "Compliant":
            compliant.append(entry)
        elif current_status == "In Progress":
            in_progress.append(entry)
        else:
            missing.append(entry)

    total = len(required)
    return {
        "compliant": compliant,
        "in_progress": in_progress,
        "missing": missing,
        "summary": {
            "total_requirements": total,
            "compliant_count": len(compliant),
            "in_progress_count": len(in_progress),
            "missing_count": len(missing),
            "compliance_percentage": round((len(compliant) / total * 100) if total > 0 else 0, 1),
        },
    }


@router.get("/company/recommendations")
async def get_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-powered contract vehicle recommendations based on company
    NAICS codes and compliance readiness.
    """
    company = await _get_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company profile found.")

    naics_result = await db.execute(
        select(CompanyNAICS.naics_id).where(CompanyNAICS.company_id == company.id)
    )
    naics_ids = [row[0] for row in naics_result.all()]

    if not naics_ids:
        return {"recommendations": [], "summary": "No NAICS codes registered."}

    veh_result = await db.execute(
        select(ContractVehicle, NAICSContractMap.relevance_score, NAICSContractMap.naics_id)
        .join(NAICSContractMap, NAICSContractMap.contract_vehicle_id == ContractVehicle.id)
        .where(NAICSContractMap.naics_id.in_(naics_ids))
        .order_by(NAICSContractMap.relevance_score.desc())
    )
    vehicle_rows = veh_result.all()

    status_result = await db.execute(
        select(CompanyCompliance).where(CompanyCompliance.company_id == company.id)
    )
    statuses = {cc.compliance_id: cc.status for cc in status_result.scalars().all()}

    seen_vehicles = {}
    for vehicle, relevance, naics_id in vehicle_rows:
        if vehicle.id in seen_vehicles:
            if relevance > seen_vehicles[vehicle.id]["relevance_score"]:
                seen_vehicles[vehicle.id]["relevance_score"] = relevance
            continue

        comp_result = await db.execute(
            select(ContractComplianceMap)
            .where(ContractComplianceMap.contract_vehicle_id == vehicle.id)
        )
        vehicle_reqs = comp_result.scalars().all()

        total_reqs = len(vehicle_reqs)
        met_reqs = 0
        missing_reqs = []
        for vr in vehicle_reqs:
            company_status = statuses.get(vr.compliance_id, "Not Started")
            if company_status == "Compliant":
                met_reqs += 1
            else:
                rn = await db.execute(
                    select(ComplianceRequirement.name)
                    .where(ComplianceRequirement.id == vr.compliance_id)
                )
                name = rn.scalar_one_or_none() or "Unknown"
                missing_reqs.append({"compliance_id": vr.compliance_id, "name": name, "mandatory": vr.mandatory})

        compliance_pct = round((met_reqs / total_reqs * 100) if total_reqs > 0 else 100, 1)
        combined_score = round(relevance * 0.6 + compliance_pct * 0.4)

        agency_name = None
        if vehicle.agency_id:
            ag_r = await db.execute(select(Agency.name).where(Agency.id == vehicle.agency_id))
            agency_name = ag_r.scalar_one_or_none()

        reason_parts = [f"Relevance score {relevance}/100 for your NAICS codes."]
        if compliance_pct == 100:
            reason_parts.append("You meet all compliance requirements.")
        elif compliance_pct >= 50:
            reason_parts.append(f"You meet {compliance_pct}% of requirements. {len(missing_reqs)} remaining.")
        else:
            reason_parts.append(f"Only {compliance_pct}% compliant. Significant gaps remain.")

        seen_vehicles[vehicle.id] = {
            "vehicle_id": vehicle.id,
            "vehicle_name": vehicle.name,
            "vehicle_type": vehicle.type,
            "agency_name": agency_name,
            "relevance_score": relevance,
            "compliance_readiness": compliance_pct,
            "combined_score": combined_score,
            "reason": " ".join(reason_parts),
            "missing_requirements": missing_reqs,
        }

    recommendations = sorted(seen_vehicles.values(), key=lambda x: x["combined_score"], reverse=True)
    return {"recommendations": recommendations}


@router.post("/company/sync-profile")
async def sync_company_from_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auto-populate the compliance company profile from the user's Business Profile
    (vendor profile). Syncs company name, DUNS/UEI, business type, and NAICS codes.
    """
    vp_result = await db.execute(
        select(VendorProfileDB)
        .where(VendorProfileDB.user_id == current_user.id)
        .order_by(VendorProfileDB.updated_at.desc())
    )
    vendor = vp_result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="No Business Profile found. Please set up your Business Profile first.",
        )

    company = await _get_company(db, current_user.id)
    if not company:
        company = Company(user_id=current_user.id)
        db.add(company)

    company.name = vendor.company_name or company.name
    company.uei = vendor.duns_number or company.uei
    company.business_type = vendor.socioeconomic_status or company.business_type
    company.sam_registered = bool(vendor.cage_code)

    await db.flush()

    vp_naics = vendor.naics_codes or []
    synced_naics = []
    for i, code_str in enumerate(vp_naics):
        code_clean = str(code_str).strip().split(" ")[0].split("-")[0].strip()
        if not code_clean:
            continue

        naics_result = await db.execute(
            select(NAICSCode).where(NAICSCode.code == code_clean)
        )
        naics = naics_result.scalar_one_or_none()
        if not naics:
            continue

        existing = await db.execute(
            select(CompanyNAICS).where(
                CompanyNAICS.company_id == company.id,
                CompanyNAICS.naics_id == naics.id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(CompanyNAICS(
                company_id=company.id,
                naics_id=naics.id,
                is_primary=(i == 0),
            ))

        synced_naics.append({"code": naics.code, "title": naics.title})

    naics_ids_result = await db.execute(
        select(CompanyNAICS.naics_id).where(CompanyNAICS.company_id == company.id)
    )
    naics_ids = [r[0] for r in naics_ids_result.all()]

    if naics_ids:
        req_ids_result = await db.execute(
            select(NAICSComplianceMap.compliance_id)
            .where(NAICSComplianceMap.naics_id.in_(naics_ids))
            .distinct()
        )
        req_ids = [r[0] for r in req_ids_result.all()]

        for req_id in req_ids:
            existing_cc = await db.execute(
                select(CompanyCompliance).where(
                    CompanyCompliance.company_id == company.id,
                    CompanyCompliance.compliance_id == req_id,
                )
            )
            if not existing_cc.scalar_one_or_none():
                db.add(CompanyCompliance(
                    company_id=company.id,
                    compliance_id=req_id,
                    status="not_started",
                ))

    await db.flush()

    return {
        "message": "Company profile synced from Business Profile",
        "company": {
            "id": company.id,
            "name": company.name,
            "uei": company.uei,
            "sam_registered": company.sam_registered,
            "business_type": company.business_type,
        },
        "synced_naics": synced_naics,
        "source": {
            "company_name": vendor.company_name,
            "cage_code": vendor.cage_code,
            "duns_number": vendor.duns_number,
            "naics_codes_count": len(vp_naics),
        },
    }


@router.post("/company/naics")
async def add_company_naics(
    data: CompanyNAICSAdd,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a NAICS code to the user's company."""
    company = await _get_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company profile found. Create one first.")

    naics_result = await db.execute(select(NAICSCode).where(NAICSCode.id == data.naics_id))
    if not naics_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="NAICS code not found")

    existing = await db.execute(
        select(CompanyNAICS).where(
            and_(CompanyNAICS.company_id == company.id, CompanyNAICS.naics_id == data.naics_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="NAICS code already added to company")

    cn = CompanyNAICS(company_id=company.id, naics_id=data.naics_id, is_primary=data.is_primary)
    db.add(cn)
    await db.flush()
    return {"id": cn.id, "company_id": company.id, "naics_id": data.naics_id, "is_primary": data.is_primary}


@router.delete("/company/naics/{naics_id}")
async def remove_company_naics(
    naics_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a NAICS code from the user's company."""
    company = await _get_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company profile found.")

    result = await db.execute(
        select(CompanyNAICS).where(
            and_(CompanyNAICS.company_id == company.id, CompanyNAICS.naics_id == naics_id)
        )
    )
    cn = result.scalar_one_or_none()
    if not cn:
        raise HTTPException(status_code=404, detail="NAICS code not found on company")

    await db.delete(cn)
    return {"detail": "NAICS code removed from company"}


@router.put("/company/compliance/{compliance_id}")
async def update_compliance_status(
    compliance_id: str,
    data: ComplianceStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a compliance requirement status for the user's company."""
    from datetime import datetime, timezone

    company = await _get_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company profile found.")

    req_result = await db.execute(
        select(ComplianceRequirement).where(ComplianceRequirement.id == compliance_id)
    )
    if not req_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Compliance requirement not found")

    result = await db.execute(
        select(CompanyCompliance).where(
            and_(CompanyCompliance.company_id == company.id, CompanyCompliance.compliance_id == compliance_id)
        )
    )
    cc = result.scalar_one_or_none()

    cert_date = None
    if data.certification_date:
        cert_date = datetime.fromisoformat(data.certification_date).replace(tzinfo=timezone.utc)
    exp_date = None
    if data.expiry_date:
        exp_date = datetime.fromisoformat(data.expiry_date).replace(tzinfo=timezone.utc)

    if cc:
        cc.status = data.status
        cc.certification_date = cert_date
        cc.expiry_date = exp_date
        cc.notes = data.notes
    else:
        cc = CompanyCompliance(
            company_id=company.id,
            compliance_id=compliance_id,
            status=data.status,
            certification_date=cert_date,
            expiry_date=exp_date,
            notes=data.notes,
        )
        db.add(cc)

    await db.flush()
    return {"compliance_id": compliance_id, "status": data.status, "detail": "Compliance status updated"}


# ── Base /company routes LAST ──────────────────

@router.get("/company")
async def get_company_compliance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's company profile and compliance status. Auto-creates from business profile if none exists."""
    company = await _get_company(db, current_user.id)
    if not company:
        vp_result = await db.execute(
            select(VendorProfileDB)
            .where(VendorProfileDB.user_id == current_user.id)
            .order_by(VendorProfileDB.updated_at.desc())
        )
        vendor = vp_result.scalar_one_or_none()
        if vendor:
            company = Company(
                user_id=current_user.id,
                name=vendor.company_name or "",
                uei=vendor.duns_number or "",
                business_type=vendor.socioeconomic_status or "",
                sam_registered=bool(vendor.cage_code),
            )
            db.add(company)
            await db.flush()
        else:
            raise HTTPException(status_code=404, detail="No company profile found. Create one first.")

    naics_result = await db.execute(
        select(NAICSCode, CompanyNAICS.is_primary)
        .join(CompanyNAICS, CompanyNAICS.naics_id == NAICSCode.id)
        .where(CompanyNAICS.company_id == company.id)
    )
    naics_codes = [
        {"id": n.id, "code": n.code, "title": n.title, "is_primary": primary}
        for n, primary in naics_result.all()
    ]

    comp_result = await db.execute(
        select(ComplianceRequirement, CompanyCompliance)
        .join(CompanyCompliance, CompanyCompliance.compliance_id == ComplianceRequirement.id)
        .where(CompanyCompliance.company_id == company.id)
    )
    # FIX: key renamed from "compliance" to "compliance_statuses" to match frontend
    compliance_items = [
        {
            "compliance_id": req.id, "name": req.name, "category": req.category,
            "mandatory": req.mandatory, "status": cc.status,
            "certification_date": cc.certification_date.isoformat() if cc.certification_date else None,
            "expiry_date": cc.expiry_date.isoformat() if cc.expiry_date else None,
            "notes": cc.notes,
        }
        for req, cc in comp_result.all()
    ]

    # Calculate compliance score
    total = len(compliance_items)
    compliant_count = sum(1 for c in compliance_items if c["status"] in ("compliant", "Compliant"))
    compliance_score = round((compliant_count / total * 100) if total > 0 else 0, 1)

    return {
        "id": company.id,
        "name": company.name,
        "uei": company.uei,
        "sam_registered": company.sam_registered,
        "business_type": company.business_type,
        "naics_codes": naics_codes,
        "compliance_statuses": compliance_items,   # ← FIXED: was "compliance"
        "compliance_score": compliance_score,       # ← ADDED: frontend uses this
        "eligible_vehicles": [],                    # ← ADDED: frontend uses this
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
    }


@router.post("/company")
async def create_or_update_company(
    data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update the user's company profile."""
    company = await _get_company(db, current_user.id)
    if company:
        company.name = data.name
        company.uei = data.uei
        company.sam_registered = data.sam_registered
        company.business_type = data.business_type
    else:
        company = Company(
            user_id=current_user.id,
            name=data.name,
            uei=data.uei,
            sam_registered=data.sam_registered,
            business_type=data.business_type,
        )
        db.add(company)

    await db.flush()
    return {
        "id": company.id, "name": company.name, "uei": company.uei,
        "sam_registered": company.sam_registered, "business_type": company.business_type,
    }


# ──────────────────────────────────────────────
# Proposal Compliance Check
# ──────────────────────────────────────────────

@router.post("/proposal/{proposal_id}/check")
async def run_proposal_compliance_check(
    proposal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run compliance check for a specific proposal."""
    result = await db.execute(
        select(Proposal).where(
            and_(Proposal.id == proposal_id, Proposal.user_id == current_user.id)
        )
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    company = await _get_company(db, current_user.id)
    if not company:
        raise HTTPException(status_code=404, detail="No company profile found.")

    naics_result = await db.execute(
        select(CompanyNAICS.naics_id).where(CompanyNAICS.company_id == company.id)
    )
    naics_ids = [row[0] for row in naics_result.all()]

    if not naics_ids:
        return {"proposal_id": proposal_id, "checks": [], "summary": "No NAICS codes registered."}

    req_result = await db.execute(
        select(ComplianceRequirement)
        .join(NAICSComplianceMap, NAICSComplianceMap.compliance_id == ComplianceRequirement.id)
        .where(NAICSComplianceMap.naics_id.in_(naics_ids))
    )
    required = {r.id: r for r in req_result.scalars().all()}

    status_result = await db.execute(
        select(CompanyCompliance).where(CompanyCompliance.company_id == company.id)
    )
    statuses = {cc.compliance_id: cc.status for cc in status_result.scalars().all()}

    old_checks = await db.execute(
        select(ProposalComplianceCheck).where(ProposalComplianceCheck.proposal_id == proposal_id)
    )
    for old in old_checks.scalars().all():
        await db.delete(old)

    checks = []
    for req_id, req in required.items():
        company_status = statuses.get(req_id, "Not Started")
        if company_status == "Compliant":
            check_status = "Pass"
            remarks = "Company is compliant."
        elif company_status == "In Progress":
            check_status = "Fail"
            remarks = "Compliance is in progress but not yet complete."
        else:
            check_status = "Missing"
            remarks = "No compliance record found for this requirement."

        check = ProposalComplianceCheck(
            proposal_id=proposal_id,
            compliance_id=req_id,
            status=check_status,
            remarks=remarks,
        )
        db.add(check)
        checks.append({
            "compliance_id": req_id, "name": req.name, "category": req.category,
            "status": check_status, "remarks": remarks,
        })

    await db.flush()

    passed = sum(1 for c in checks if c["status"] == "Pass")
    failed = sum(1 for c in checks if c["status"] == "Fail")
    missing = sum(1 for c in checks if c["status"] == "Missing")

    return {
        "proposal_id": proposal_id,
        "checks": checks,
        "summary": {
            "total": len(checks),
            "passed": passed,
            "failed": failed,
            "missing": missing,
            "ready": passed == len(checks),
        },
    }


@router.get("/proposal/{proposal_id}/check")
async def get_proposal_compliance_results(
    proposal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get existing compliance check results for a proposal."""
    result = await db.execute(
        select(Proposal).where(
            and_(Proposal.id == proposal_id, Proposal.user_id == current_user.id)
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Proposal not found")

    check_result = await db.execute(
        select(ProposalComplianceCheck, ComplianceRequirement)
        .join(ComplianceRequirement, ComplianceRequirement.id == ProposalComplianceCheck.compliance_id)
        .where(ProposalComplianceCheck.proposal_id == proposal_id)
    )
    checks = [
        {
            "compliance_id": check.compliance_id, "name": req.name, "category": req.category,
            "status": check.status, "remarks": check.remarks,
        }
        for check, req in check_result.all()
    ]

    passed = sum(1 for c in checks if c["status"] == "Pass")
    failed = sum(1 for c in checks if c["status"] == "Fail")
    missing = sum(1 for c in checks if c["status"] == "Missing")

    return {
        "proposal_id": proposal_id,
        "checks": checks,
        "summary": {
            "total": len(checks),
            "passed": passed,
            "failed": failed,
            "missing": missing,
            "ready": len(checks) > 0 and passed == len(checks),
        },
    }