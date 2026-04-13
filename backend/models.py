"""
Pydantic models for GovProposal AI request/response schemas.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# --- Vendor Profile Models ---

class ContactInfo(BaseModel):
    name: str = Field(..., description="Contact person's full name")
    email: str = Field(..., description="Contact email address")
    phone: str = Field(..., description="Contact phone number")
    address: str = Field("", description="Business address")


class VendorProfile(BaseModel):
    company_name: str = Field(..., description="Legal company name")
    cage_code: str = Field("", description="CAGE code for government contracting")
    duns_number: str = Field("", description="DUNS/UEI number")
    naics_codes: List[str] = Field(default_factory=list, description="Applicable NAICS codes")
    capabilities: str = Field("", description="Company capabilities summary")
    past_performance: str = Field("", description="Past performance narrative")
    socioeconomic_status: str = Field(
        "",
        description="Socioeconomic designations (e.g., Small Business, 8(a), HUBZone, SDVOSB, WOSB)"
    )
    contact_info: ContactInfo = Field(..., description="Primary contact information")


# --- Opportunity Models ---

class Opportunity(BaseModel):
    title: str = Field(..., description="Opportunity title")
    agency: str = Field("", description="Contracting agency")
    description: str = Field("", description="Opportunity description")
    requirements: str = Field("", description="Specific requirements or SOW summary")
    due_date: Optional[str] = Field(None, description="Response due date")
    notice_id: Optional[str] = Field(None, description="SAM.gov notice ID")
    posted_date: Optional[str] = Field(None, description="Date posted")
    type: Optional[str] = Field(None, description="Notice type")


class OpportunitySearchResult(BaseModel):
    title: str
    agency: str
    due_date: Optional[str] = None
    notice_id: Optional[str] = None
    description: Optional[str] = None
    posted_date: Optional[str] = None
    type: Optional[str] = None


# --- Proposal Models ---

AVAILABLE_SECTIONS: List[str] = [
    "cover_page",
    "executive_summary",
    "vendor_profile",
    "socioeconomic_status",
    "capability_statement",
    "past_performance",
    "technical_approach",
    "management_approach",
    "staffing_plan",
    "key_personnel",
    "cost_price_proposal",
    "quality_assurance",
    "risk_mitigation",
    "transition_plan",
    "subcontracting_plan",
    "compliance_matrix",
    "implementation_timeline",
    "compliance_checklist",
]


class ProposalRequest(BaseModel):
    vendor: Dict = Field(..., description="Vendor profile data")
    opportunity: Dict = Field(..., description="Opportunity details")
    sections: List[str] = Field(
        default=AVAILABLE_SECTIONS,
        description="List of sections to generate"
    )


class ProposalSection(BaseModel):
    title: str = Field(..., description="Section title")
    content: str = Field(..., description="Generated section content")


class ProposalResponse(BaseModel):
    proposal_id: str = Field(..., description="Unique proposal identifier")
    opportunity_title: str = Field(..., description="Title of the target opportunity")
    vendor_name: str = Field(..., description="Vendor company name")
    sections: Dict[str, ProposalSection] = Field(
        ..., description="Generated sections keyed by section name"
    )
    metadata: Optional[Dict] = Field(None, description="Cover page metadata (agency, CAGE, POC, etc.)")


# --- Export Models ---

class ExportRequest(BaseModel):
    proposal_title: str = Field("Government Proposal", description="Title for the document")
    vendor_name: str = Field("", description="Vendor company name")
    sections: Dict[str, ProposalSection] = Field(
        ..., description="Sections to export, keyed by section name"
    )
    metadata: Optional[Dict] = Field(None, description="Extended metadata for cover page (agency, POC, etc.)")
    company_logo: Optional[str] = Field(None, description="Base64-encoded company logo image (data URL)")
    volume_assignments: Optional[Dict[str, List[str]]] = Field(
        None,
        description="Map of volume name to list of section keys. E.g. {'Volume I - Administrative': ['cover_page', 'executive_summary']}"
    )
