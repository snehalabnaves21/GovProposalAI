"""
Seed script for GovCon Compliance Engine reference data.

Inserts NAICS codes, compliance requirements, agencies, contract vehicles,
and all mapping tables. Idempotent — checks for existing data before inserting.
"""

import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db_models import (
    NAICSCode,
    ComplianceRequirement,
    NAICSComplianceMap,
    Agency,
    ContractVehicle,
    NAICSContractMap,
    ContractComplianceMap,
)

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Seed data definitions
# ──────────────────────────────────────────────

NAICS_CODES = [
    ("541511", "Custom Computer Programming Services", "Software development and programming services", "IT & Technology"),
    ("541512", "Computer Systems Design Services", "System integration and IT architecture", "IT & Technology"),
    ("541513", "Computer Facilities Management Services", "IT infrastructure and data center management", "IT & Technology"),
    ("541519", "Other Computer Related Services", "Includes cybersecurity and IT support", "Cybersecurity"),
    ("541611", "Administrative Management Consulting", "Business consulting and advisory services", "Consulting"),
    ("541618", "Other Management Consulting Services", "Specialized consulting services", "Consulting"),
    ("541690", "Technical Consulting Services", "Engineering and technical advisory", "Consulting"),
    ("541715", "R&D in Physical, Engineering, and Life Sciences", "Scientific research and development", "R&D"),
    ("236220", "Commercial and Institutional Building Construction", "Construction of commercial buildings", "Construction"),
    ("237310", "Highway, Street, and Bridge Construction", "Infrastructure construction", "Construction"),
    ("621111", "Offices of Physicians", "Healthcare services", "Healthcare"),
]

COMPLIANCE_REQUIREMENTS = [
    ("FAR 52.204-21 Basic Safeguarding", "Cybersecurity", "Basic safeguarding of covered contractor information systems", True),
    ("DFARS 252.204-7012 (CMMC Level 2)", "Cybersecurity", "Safeguarding covered defense information and cyber incident reporting", True),
    ("NIST SP 800-171", "Cybersecurity", "Protecting Controlled Unclassified Information in Nonfederal Systems", True),
    ("FedRAMP Authorization", "Cybersecurity", "Security assessment framework for cloud products and services", False),
    ("SAM.gov Registration", "Registration", "Active registration in System for Award Management", True),
    ("DCAA Accounting Compliance", "Financial", "Defense Contract Audit Agency compliant accounting system", True),
    ("FAR Part 31 Cost Principles", "Financial", "Cost principles for contracts with commercial organizations", True),
    ("Section 508 Accessibility", "Accessibility", "Electronic and information technology accessibility standards", True),
    ("Service Contract Act (SCA)", "Labor", "Prevailing wage and benefit requirements for service contracts", True),
    ("Davis-Bacon Act", "Labor", "Prevailing wage requirements for construction contracts", True),
    ("Buy American Act (BAA)", "Trade", "Domestic preference for government procurement", True),
    ("Trade Agreements Act (TAA)", "Trade", "Compliance with trade agreement requirements for designated countries", True),
    ("Organizational Conflict of Interest (OCI)", "Ethics", "Preventing unfair competitive advantage and biased work", True),
    ("ISO 9001 Quality Management", "Quality", "Quality management system certification", False),
    ("ISO 27001 Information Security", "Cybersecurity", "Information security management system certification", False),
    ("Small Business Subcontracting Plan", "Socioeconomic", "Subcontracting plan for small business participation", True),
]

AGENCIES = [
    ("DoD", "Department of Defense", "https://www.defense.gov"),
    ("NASA", "National Aeronautics and Space Administration", "https://www.nasa.gov"),
    ("NIH", "National Institutes of Health", "https://www.nih.gov"),
    ("GSA", "General Services Administration", "https://www.gsa.gov"),
    ("DHS", "Department of Homeland Security", "https://www.dhs.gov"),
]

CONTRACT_VEHICLES = [
    # (name, type, agency_name_or_None, description, eligibility)
    ("GSA MAS", "GWAC", None, "General Services Administration Multiple Award Schedule", "SAM registration, financial systems, past performance"),
    ("CIO-SP3", "GWAC", "NIH", "Chief Information Officer-Solutions and Partners 3", "IT services, health IT, SAM registration, relevant NAICS"),
    ("SEWP V", "GWAC", "NASA", "Solutions for Enterprise-Wide Procurement V", "IT products and services, NASA-specific requirements"),
    ("OASIS", "IDIQ", None, "One Acquisition Solution for Integrated Services", "Professional services, relevant experience, financial stability"),
    ("SeaPort-NxG", "IDIQ", "DoD", "SeaPort Next Generation", "Engineering, technical, and programmatic support services for Navy"),
]

# NAICS-to-compliance mappings: (naics_code, compliance_name, priority)
NAICS_COMPLIANCE_MAPPINGS = [
    # IT & Technology NAICS → Cybersecurity + general
    ("541511", "FAR 52.204-21 Basic Safeguarding", "High"),
    ("541511", "NIST SP 800-171", "High"),
    ("541511", "SAM.gov Registration", "High"),
    ("541511", "Section 508 Accessibility", "Medium"),
    ("541511", "DCAA Accounting Compliance", "Medium"),

    ("541512", "FAR 52.204-21 Basic Safeguarding", "High"),
    ("541512", "DFARS 252.204-7012 (CMMC Level 2)", "High"),
    ("541512", "NIST SP 800-171", "High"),
    ("541512", "SAM.gov Registration", "High"),
    ("541512", "Section 508 Accessibility", "Medium"),

    ("541513", "FAR 52.204-21 Basic Safeguarding", "High"),
    ("541513", "NIST SP 800-171", "High"),
    ("541513", "FedRAMP Authorization", "High"),
    ("541513", "SAM.gov Registration", "High"),
    ("541513", "ISO 27001 Information Security", "Medium"),

    ("541519", "FAR 52.204-21 Basic Safeguarding", "High"),
    ("541519", "DFARS 252.204-7012 (CMMC Level 2)", "High"),
    ("541519", "NIST SP 800-171", "High"),
    ("541519", "SAM.gov Registration", "High"),
    ("541519", "ISO 27001 Information Security", "High"),

    # Consulting NAICS
    ("541611", "SAM.gov Registration", "High"),
    ("541611", "DCAA Accounting Compliance", "High"),
    ("541611", "FAR Part 31 Cost Principles", "High"),
    ("541611", "Organizational Conflict of Interest (OCI)", "High"),
    ("541611", "Service Contract Act (SCA)", "Medium"),

    ("541618", "SAM.gov Registration", "High"),
    ("541618", "DCAA Accounting Compliance", "Medium"),
    ("541618", "Organizational Conflict of Interest (OCI)", "High"),
    ("541618", "Small Business Subcontracting Plan", "Medium"),

    ("541690", "SAM.gov Registration", "High"),
    ("541690", "DCAA Accounting Compliance", "Medium"),
    ("541690", "FAR Part 31 Cost Principles", "Medium"),
    ("541690", "ISO 9001 Quality Management", "Medium"),

    # R&D
    ("541715", "SAM.gov Registration", "High"),
    ("541715", "DCAA Accounting Compliance", "High"),
    ("541715", "FAR Part 31 Cost Principles", "High"),
    ("541715", "Organizational Conflict of Interest (OCI)", "Medium"),
    ("541715", "Buy American Act (BAA)", "Medium"),

    # Construction
    ("236220", "SAM.gov Registration", "High"),
    ("236220", "Davis-Bacon Act", "High"),
    ("236220", "Buy American Act (BAA)", "High"),
    ("236220", "ISO 9001 Quality Management", "Medium"),
    ("236220", "Small Business Subcontracting Plan", "Medium"),

    ("237310", "SAM.gov Registration", "High"),
    ("237310", "Davis-Bacon Act", "High"),
    ("237310", "Buy American Act (BAA)", "High"),
    ("237310", "Trade Agreements Act (TAA)", "Medium"),

    # Healthcare
    ("621111", "SAM.gov Registration", "High"),
    ("621111", "DCAA Accounting Compliance", "Medium"),
    ("621111", "Service Contract Act (SCA)", "High"),
    ("621111", "Section 508 Accessibility", "Medium"),
    ("621111", "Small Business Subcontracting Plan", "Medium"),
]

# NAICS-to-contract-vehicle mappings: (naics_code, vehicle_name, relevance_score)
NAICS_CONTRACT_MAPPINGS = [
    ("541511", "GSA MAS", 90),
    ("541511", "CIO-SP3", 85),
    ("541511", "SEWP V", 70),
    ("541511", "OASIS", 80),

    ("541512", "GSA MAS", 90),
    ("541512", "CIO-SP3", 90),
    ("541512", "SEWP V", 80),
    ("541512", "OASIS", 75),

    ("541513", "CIO-SP3", 85),
    ("541513", "SEWP V", 90),

    ("541519", "GSA MAS", 80),
    ("541519", "CIO-SP3", 90),
    ("541519", "SEWP V", 85),

    ("541611", "GSA MAS", 85),
    ("541611", "OASIS", 95),

    ("541618", "GSA MAS", 80),
    ("541618", "OASIS", 90),

    ("541690", "GSA MAS", 75),
    ("541690", "OASIS", 85),
    ("541690", "SeaPort-NxG", 70),

    ("541715", "OASIS", 80),
    ("541715", "SeaPort-NxG", 85),

    ("236220", "GSA MAS", 60),

    ("237310", "GSA MAS", 55),

    ("621111", "GSA MAS", 70),
    ("621111", "CIO-SP3", 60),
]

# Contract-vehicle-to-compliance mappings: (vehicle_name, compliance_name, mandatory)
CONTRACT_COMPLIANCE_MAPPINGS = [
    ("GSA MAS", "SAM.gov Registration", True),
    ("GSA MAS", "FAR Part 31 Cost Principles", True),
    ("GSA MAS", "FAR 52.204-21 Basic Safeguarding", True),
    ("GSA MAS", "Trade Agreements Act (TAA)", True),
    ("GSA MAS", "Small Business Subcontracting Plan", False),

    ("CIO-SP3", "SAM.gov Registration", True),
    ("CIO-SP3", "NIST SP 800-171", True),
    ("CIO-SP3", "FAR 52.204-21 Basic Safeguarding", True),
    ("CIO-SP3", "Section 508 Accessibility", True),
    ("CIO-SP3", "DCAA Accounting Compliance", True),

    ("SEWP V", "SAM.gov Registration", True),
    ("SEWP V", "FAR 52.204-21 Basic Safeguarding", True),
    ("SEWP V", "NIST SP 800-171", True),
    ("SEWP V", "FedRAMP Authorization", False),

    ("OASIS", "SAM.gov Registration", True),
    ("OASIS", "DCAA Accounting Compliance", True),
    ("OASIS", "FAR Part 31 Cost Principles", True),
    ("OASIS", "Organizational Conflict of Interest (OCI)", True),
    ("OASIS", "Small Business Subcontracting Plan", True),

    ("SeaPort-NxG", "SAM.gov Registration", True),
    ("SeaPort-NxG", "DFARS 252.204-7012 (CMMC Level 2)", True),
    ("SeaPort-NxG", "DCAA Accounting Compliance", True),
    ("SeaPort-NxG", "Service Contract Act (SCA)", True),
]


# ──────────────────────────────────────────────
# Seed function
# ──────────────────────────────────────────────

async def seed_compliance_data(db: AsyncSession) -> None:
    """Seed all compliance reference data. Idempotent — skips if data exists."""

    # Check if already seeded (use NAICS table as sentinel)
    result = await db.execute(select(NAICSCode).limit(1))
    if result.scalar_one_or_none() is not None:
        logger.info("Compliance data already seeded — skipping.")
        return

    logger.info("Seeding GovCon compliance reference data...")

    # 1. NAICS codes
    naics_map = {}  # code -> id
    for code, title, description, category in NAICS_CODES:
        obj = NAICSCode(code=code, title=title, description=description, industry_category=category)
        db.add(obj)
        naics_map[code] = obj

    await db.flush()
    # Refresh to get generated IDs
    for code, obj in naics_map.items():
        naics_map[code] = obj.id

    # 2. Compliance requirements
    comp_map = {}  # name -> id
    for name, category, description, mandatory in COMPLIANCE_REQUIREMENTS:
        obj = ComplianceRequirement(name=name, category=category, description=description, mandatory=mandatory)
        db.add(obj)
        comp_map[name] = obj

    await db.flush()
    for name, obj in comp_map.items():
        comp_map[name] = obj.id

    # 3. Agencies
    agency_map = {}  # name -> id
    for name, department, website in AGENCIES:
        obj = Agency(name=name, department=department, website=website)
        db.add(obj)
        agency_map[name] = obj

    await db.flush()
    for name, obj in agency_map.items():
        agency_map[name] = obj.id

    # 4. Contract vehicles
    vehicle_map = {}  # name -> id
    for name, vtype, agency_name, description, eligibility in CONTRACT_VEHICLES:
        agency_id = agency_map.get(agency_name) if agency_name else None
        obj = ContractVehicle(
            name=name, type=vtype, agency_id=agency_id,
            description=description, eligibility_criteria=eligibility,
        )
        db.add(obj)
        vehicle_map[name] = obj

    await db.flush()
    for name, obj in vehicle_map.items():
        vehicle_map[name] = obj.id

    # 5. NAICS-compliance mappings
    for naics_code, comp_name, priority in NAICS_COMPLIANCE_MAPPINGS:
        naics_id = naics_map.get(naics_code)
        compliance_id = comp_map.get(comp_name)
        if naics_id and compliance_id:
            db.add(NAICSComplianceMap(
                naics_id=naics_id, compliance_id=compliance_id, priority_level=priority,
            ))

    # 6. NAICS-contract mappings
    for naics_code, vehicle_name, score in NAICS_CONTRACT_MAPPINGS:
        naics_id = naics_map.get(naics_code)
        vehicle_id = vehicle_map.get(vehicle_name)
        if naics_id and vehicle_id:
            db.add(NAICSContractMap(
                naics_id=naics_id, contract_vehicle_id=vehicle_id, relevance_score=score,
            ))

    # 7. Contract-compliance mappings
    for vehicle_name, comp_name, mandatory in CONTRACT_COMPLIANCE_MAPPINGS:
        vehicle_id = vehicle_map.get(vehicle_name)
        compliance_id = comp_map.get(comp_name)
        if vehicle_id and compliance_id:
            db.add(ContractComplianceMap(
                contract_vehicle_id=vehicle_id, compliance_id=compliance_id, mandatory=mandatory,
            ))

    await db.commit()
    logger.info(
        "Seeded compliance data: %d NAICS, %d requirements, %d agencies, %d vehicles.",
        len(NAICS_CODES), len(COMPLIANCE_REQUIREMENTS), len(AGENCIES), len(CONTRACT_VEHICLES),
    )
