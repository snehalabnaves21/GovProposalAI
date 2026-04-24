"""
Google Gemini AI integration service for generating government proposal content.
"""

import os
import re
import time
import logging
from typing import Dict, List, Optional

from groq import Groq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are an expert federal government proposal writer. "
    "Write professional, compelling proposal content for government contracts. "
    "Your writing should be clear, specific, and compliant with federal acquisition "
    "regulations (FAR). Use formal business language appropriate for government "
    "submissions. Include concrete details and actionable commitments where possible."
)

# Detailed prompt templates for each proposal section
SECTION_PROMPTS: Dict[str, str] = {
    "cover_page": (
        "Generate a professional cover page for a government contract proposal.\n\n"
        "Structure it EXACTLY as follows with these labeled sections:\n\n"
        "PROPOSAL TITLE: [Use the opportunity title in UPPERCASE, e.g., ENTERPRISE IT MODERNIZATION SERVICES]\n"
        "PROPOSAL TYPE: [Use the proposal_type field, e.g., Technical & Management Proposal]\n\n"
        "SUBMITTED TO:\n"
        "[Agency Name]\n"
        "[Contracting Office if available]\n\n"
        "SOLICITATION NUMBER: [RFP/solicitation number]\n\n"
        "SUBMITTED BY:\n"
        "[Company Name]\n"
        "CAGE Code: [cage_code]\n"
        "UEI / DUNS: [duns_number]\n"
        "NAICS Codes: [Primary NAICS - description, supporting codes]\n\n"
        "SUBMISSION DATE: [submission_date or current date]\n\n"
        "POINT OF CONTACT:\n"
        "[POC Name]\n"
        "[POC Title/Division]\n"
        "Email: [POC Email]\n"
        "Phone: [POC Phone]\n\n"
        "PROPOSAL STATEMENT:\n"
        "[Write a 2-3 sentence professional statement: Company respectfully submits this proposal "
        "in response to the solicitation. Reference proven expertise relevant to the opportunity. "
        "Mention commitment to exceeding performance expectations.]\n\n"
        "CONFIDENTIALITY STATEMENT:\n"
        "[Write: This proposal contains proprietary and confidential information of [Company]. "
        "It is submitted solely for evaluation by [Agency] and shall not be disclosed without "
        "prior written consent.]\n\n"
        "Use the actual vendor and opportunity data provided. Do NOT use placeholder brackets - "
        "fill in real values from the context. Format as plain text with clear labels, no markdown headers."
    ),
    "executive_summary": (
        "Write a compelling, well-structured executive summary for a government contract proposal.\n\n"
        "Structure it with these DISTINCT subsections (use these as sub-headings):\n\n"
        "1. OPENING PARAGRAPH: A strong 2-3 sentence statement where [Company Name] submits "
        "this proposal in response to [Agency]'s requirement. State what you offer and your "
        "mission alignment.\n\n"
        "2. OUR UNDERSTANDING: 1 paragraph showing deep understanding of the agency's need, "
        "objectives, and challenges. Reference specific requirements from the opportunity.\n\n"
        "3. OUR SOLUTION: Present the approach built on 3 core pillars:\n"
        "   - Pillar 1: Deep Domain Expertise (track record, on-time delivery rate)\n"
        "   - Pillar 2: Innovative Technology Framework (tools, automation, cloud)\n"
        "   - Pillar 3: Proven Methodology & Compliance (ISO, standards, continuous improvement)\n\n"
        "4. OUR TEAM: 1 paragraph about the team's qualifications, certifications, "
        "security clearances, and ability to execute.\n\n"
        "5. VALUE TO THE GOVERNMENT: Bullet points showing concrete benefits:\n"
        "   - Improved operational efficiency\n"
        "   - Reduced lifecycle costs\n"
        "   - Enhanced security and compliance\n"
        "   - Accelerated timelines\n\n"
        "6. COMMITMENT TO EXCELLENCE: Closing paragraph with confident commitment to "
        "delivering exceptional results that exceed expectations.\n\n"
        "Use the vendor's actual company name throughout (not placeholders). "
        "Keep it to 500-700 words. Tone: professional, persuasive, skimmable. "
        "Use bold for sub-headings. Make it easy for evaluators to scan."
    ),
    "vendor_profile": (
        "Write a comprehensive vendor/company profile section for a government proposal.\n\n"
        "Include:\n"
        "1. Company overview - founding, mission, headquarters location\n"
        "2. Organizational structure and size\n"
        "3. Core business areas and government contracting experience\n"
        "4. Relevant certifications, clearances, and registrations\n"
        "5. Key personnel qualifications (summarized)\n"
        "6. Financial stability and corporate resources\n"
        "7. Quality management and compliance systems\n\n"
        "Present the company as a reliable, capable government contractor "
        "with proven ability to deliver."
    ),
    "socioeconomic_status": (
        "Write a socioeconomic status section for a government contract proposal.\n\n"
        "Address the following:\n"
        "1. Applicable socioeconomic designations (Small Business, 8(a), HUBZone, "
        "SDVOSB, WOSB, etc.)\n"
        "2. Certification details and dates\n"
        "3. SBA size standard compliance for relevant NAICS codes\n"
        "4. Commitment to small business subcontracting goals (if applicable)\n"
        "5. Community impact and economic development contributions\n"
        "6. Diversity and inclusion initiatives\n\n"
        "Demonstrate how the vendor's socioeconomic status adds value to the "
        "government's procurement goals and small business utilization objectives."
    ),
    "capability_statement": (
        "Write a detailed capability statement section for a government proposal.\n\n"
        "Structure the capability statement with:\n"
        "1. Core Competencies - specific technical and functional capabilities "
        "directly relevant to this opportunity\n"
        "2. Differentiators - what sets this vendor apart from competitors\n"
        "3. Tools, Technologies, and Methodologies employed\n"
        "4. Industry certifications and standards compliance "
        "(ISO, CMMI, FedRAMP, etc. as applicable)\n"
        "5. Scalability and surge capacity\n"
        "6. Geographic coverage and delivery capabilities\n\n"
        "Tie every capability directly back to the opportunity requirements. "
        "Be specific with metrics and examples where possible."
    ),
    "past_performance": (
        "Write a past performance section for a government contract proposal.\n\n"
        "Structure this section with:\n"
        "1. Overview statement of past performance track record\n"
        "2. Three detailed past performance references (create plausible examples "
        "based on the vendor's capabilities), each including:\n"
        "   - Contract name and number\n"
        "   - Contracting agency\n"
        "   - Contract value and period of performance\n"
        "   - Scope of work summary\n"
        "   - Key achievements and outcomes\n"
        "   - Relevance to current opportunity\n"
        "3. Customer satisfaction metrics and CPARS ratings summary\n"
        "4. On-time/on-budget delivery track record\n\n"
        "Emphasize contracts that are similar in size, scope, and complexity "
        "to the current opportunity."
    ),
    "technical_approach": (
        "Write a comprehensive technical approach section for a government proposal.\n\n"
        "Include:\n"
        "1. Understanding of Requirements - demonstrate thorough comprehension "
        "of the government's needs\n"
        "2. Proposed Solution - detailed description of the technical approach, "
        "methodology, and tools\n"
        "3. Work Breakdown Structure - high-level task decomposition\n"
        "4. Implementation Timeline - phased approach with milestones\n"
        "5. Risk Management - identify key risks and mitigation strategies\n"
        "6. Quality Assurance - QA/QC processes and standards\n"
        "7. Innovation and Value-Added Features\n"
        "8. Transition Plan - approach for startup/transition and knowledge transfer\n\n"
        "Be specific and demonstrate deep technical understanding. "
        "Show a clear path from award to successful delivery."
    ),
    "staffing_plan": (
        "Write a staffing plan section for a government contract proposal.\n\n"
        "Include:\n"
        "1. Organizational Chart Description - key roles and reporting structure\n"
        "2. Key Personnel - describe 3-5 key positions with:\n"
        "   - Role title and responsibilities\n"
        "   - Required qualifications and clearances\n"
        "   - Relevant experience summary\n"
        "3. Staffing Approach - recruitment, retention, and succession planning\n"
        "4. Training and Professional Development\n"
        "5. Clearance Management - approach to security clearances if applicable\n"
        "6. Labor Category Matrix - summary of labor categories and FTEs\n"
        "7. Subcontractor Management (if applicable)\n\n"
        "Demonstrate that the vendor has qualified, available personnel "
        "to perform the work from day one."
    ),
    "compliance_checklist": (
        "Write a compliance and regulatory checklist section for a government proposal.\n\n"
        "Include a comprehensive checklist addressing:\n"
        "1. FAR/DFARS Compliance - key clauses acknowledged\n"
        "2. Section 508 Accessibility Compliance (if applicable)\n"
        "3. Cybersecurity Requirements (NIST, FISMA, FedRAMP as applicable)\n"
        "4. Data Protection and Privacy (PII handling procedures)\n"
        "5. Equal Employment Opportunity compliance\n"
        "6. Insurance and Bonding requirements\n"
        "7. Conflict of Interest certifications\n"
        "8. SAM.gov registration status\n"
        "9. Organizational Conflict of Interest (OCI) statement\n"
        "10. Representations and Certifications\n\n"
        "Format as a structured checklist with brief compliance statements "
        "for each item. Demonstrate thorough regulatory awareness."
    ),
    "management_approach": (
        "Write a Management Approach section for a government contract proposal.\n\n"
        "Include:\n"
        "1. Program Management Structure - organizational chart, reporting chains\n"
        "2. Communication Plan - stakeholder meetings, status reports, escalation paths\n"
        "3. Project Management Methodology - Agile, Waterfall, or hybrid approach\n"
        "4. Performance Monitoring - KPIs, metrics, and reporting frequency\n"
        "5. Change Management - process for handling scope changes and modifications\n"
        "6. Contract Administration - invoicing, deliverable tracking, compliance monitoring\n"
        "7. Continuous Improvement - lessons learned, process optimization\n\n"
        "Demonstrate a mature, proven management framework that ensures "
        "on-time, on-budget delivery with full transparency."
    ),
    "key_personnel": (
        "Write a Key Personnel / Resumes section for a government contract proposal.\n\n"
        "Provide detailed profiles for 3-5 key personnel:\n"
        "For each person include:\n"
        "- Name and proposed role/title\n"
        "- Years of relevant experience\n"
        "- Education (degrees, institutions)\n"
        "- Professional certifications (PMP, CISSP, etc.)\n"
        "- Security clearance level\n"
        "- 3 relevant project summaries with agency, scope, and results\n"
        "- Skills and specializations\n\n"
        "Demonstrate that key personnel meet or exceed solicitation requirements "
        "and have directly relevant federal contracting experience."
    ),
    "cost_price_proposal": (
        "Write a Cost/Price Proposal section for a government contract proposal.\n\n"
        "Include:\n"
        "1. Pricing Summary - total proposed price with breakdown by CLIN\n"
        "2. Labor Categories - list of labor categories with rates\n"
        "3. Labor Hours Estimate - estimated hours by category and task\n"
        "4. Other Direct Costs (ODCs) - travel, materials, licenses, etc.\n"
        "5. Subcontractor Costs (if applicable)\n"
        "6. Basis of Estimate - methodology used to develop pricing\n"
        "7. Rate Reasonableness - comparison to GSA rates or market rates\n"
        "8. Cost Assumptions and Exclusions\n\n"
        "Present pricing that is competitive yet realistic. "
        "Demonstrate cost consciousness and value for the government."
    ),
    "quality_assurance": (
        "Write a Quality Assurance/Quality Control Plan section.\n\n"
        "Include:\n"
        "1. QA/QC Philosophy and Standards - ISO 9001, CMMI, or equivalent\n"
        "2. Quality Control Processes - inspection, testing, review procedures\n"
        "3. Deliverable Review Cycle - draft, review, revision, final approval\n"
        "4. Defect Tracking and Corrective Action - how issues are identified and resolved\n"
        "5. Performance Metrics - quality KPIs and acceptance criteria\n"
        "6. Customer Satisfaction Monitoring - feedback mechanisms and surveys\n"
        "7. Continuous Improvement - how lessons learned drive quality improvements\n\n"
        "Demonstrate a mature quality system that ensures all deliverables "
        "meet or exceed government requirements."
    ),
    "risk_mitigation": (
        "Write a Risk Mitigation Plan section for a government contract proposal.\n\n"
        "Include:\n"
        "1. Risk Management Framework - methodology for identifying, assessing, "
        "and mitigating risks\n"
        "2. Risk Register - identify 5-7 key risks with:\n"
        "   - Risk description\n"
        "   - Probability (High/Medium/Low)\n"
        "   - Impact (High/Medium/Low)\n"
        "   - Mitigation strategy\n"
        "   - Contingency plan\n"
        "3. Risk Categories - technical, schedule, cost, and performance risks\n"
        "4. Risk Monitoring and Reporting - how risks are tracked and communicated\n"
        "5. Escalation Procedures - when and how to escalate critical risks\n\n"
        "Show proactive risk management that protects the government's interests."
    ),
    "transition_plan": (
        "Write a Transition/Phase-In Plan section for a government contract proposal.\n\n"
        "Include:\n"
        "1. Transition Approach - overall strategy for contract startup\n"
        "2. Phase-In Timeline - week-by-week activities for the first 30-90 days\n"
        "3. Knowledge Transfer - how to capture institutional knowledge from incumbent\n"
        "4. Personnel Onboarding - hiring, clearances, badging, training\n"
        "5. Systems and Tools Migration - IT systems, access, credentials\n"
        "6. Continuity of Operations - ensuring no service disruption during transition\n"
        "7. Phase-Out Plan - approach for orderly closeout at contract end\n\n"
        "Demonstrate ability to assume full operations quickly with minimal disruption."
    ),
    "subcontracting_plan": (
        "Write a Small Business Subcontracting Plan section.\n\n"
        "Include:\n"
        "1. Subcontracting Goals - percentage goals for each socioeconomic category:\n"
        "   - Small Business (SB)\n"
        "   - Small Disadvantaged Business (SDB)\n"
        "   - Women-Owned Small Business (WOSB)\n"
        "   - HUBZone Small Business\n"
        "   - Service-Disabled Veteran-Owned SB (SDVOSB)\n"
        "   - Veteran-Owned Small Business (VOSB)\n"
        "2. Subcontractor Identification - named or planned subcontractors\n"
        "3. Good Faith Effort - outreach and mentoring activities\n"
        "4. Reporting and Compliance - ISR/SSR reporting commitments\n"
        "5. Subcontractor Management - oversight, performance monitoring\n\n"
        "Per FAR 52.219-9, demonstrate commitment to maximizing small business participation."
    ),
    "compliance_matrix": (
        "Write a Compliance Matrix / Requirements Traceability Matrix section.\n\n"
        "Create a structured matrix that maps each solicitation requirement to:\n"
        "1. Requirement ID/Reference (Section C/L paragraph numbers)\n"
        "2. Requirement Description\n"
        "3. Proposal Response Location (volume, section, page)\n"
        "4. Compliance Status (Compliant/Partially Compliant/Exception)\n"
        "5. Brief Compliance Narrative (how the requirement is met)\n\n"
        "Cover requirements from:\n"
        "- Technical requirements (SOW/PWS)\n"
        "- Administrative requirements (Section L instructions)\n"
        "- Evaluation criteria (Section M)\n"
        "- Mandatory certifications and clauses\n\n"
        "Demonstrate thorough understanding of every requirement and provide "
        "a clear roadmap showing where each is addressed in the proposal."
    ),
    "implementation_timeline": (
        "Write an Implementation Timeline section for a government contract proposal.\n\n"
        "Include:\n"
        "1. Project Phases — clearly defined phases with start/end dates\n"
        "2. Key Milestones — critical deliverables and decision points\n"
        "3. Dependencies — inter-task dependencies and critical path items\n"
        "4. Resource Allocation — staffing levels by phase\n"
        "5. Deliverable Schedule — when each deliverable will be submitted\n"
        "6. Review/Approval Cycles — government review periods built in\n"
        "7. Ramp-Up and Ramp-Down periods\n\n"
        "Present a realistic, achievable timeline that demonstrates thorough planning "
        "and understanding of the work scope. Include buffer for government review cycles."
    ),
}

# Human-readable section titles
SECTION_TITLES: Dict[str, str] = {
    "cover_page": "Cover Page",
    "executive_summary": "Executive Summary",
    "vendor_profile": "Company Profile",
    "socioeconomic_status": "Socioeconomic Status",
    "capability_statement": "Capability Statement",
    "past_performance": "Past Performance",
    "technical_approach": "Technical Approach",
    "management_approach": "Management Approach",
    "staffing_plan": "Staffing Plan",
    "key_personnel": "Key Personnel / Resumes",
    "cost_price_proposal": "Cost / Price Proposal",
    "quality_assurance": "Quality Assurance Plan",
    "risk_mitigation": "Risk Mitigation Plan",
    "transition_plan": "Transition / Phase-In Plan",
    "subcontracting_plan": "Small Business Subcontracting Plan",
    "compliance_matrix": "Compliance Matrix",
    "implementation_timeline": "Implementation Timeline",
    "compliance_checklist": "Compliance Checklist",
}


def _strip_leading_title(content: str, section_title: str) -> str:
    """Remove duplicate section title from the start of AI-generated content.

    AI often generates content that starts with the section heading, e.g.:
      <h2>EXECUTIVE SUMMARY</h2><p>Executive Summary TalentTalk IT...</p>
    Since the editor already displays the section title, this causes duplicates.

    Strips both heading tags and inline title text at the start of the content.
    """
    if not content or not section_title:
        return content
    title_lower = section_title.lower().strip()

    # Step 1: Remove heading tags that contain the section title
    # Matches: <h1>Executive Summary</h1>, <h2>EXECUTIVE SUMMARY</h2>, etc.
    heading_pattern = rf'\s*<h[1-6][^>]*>\s*{re.escape(title_lower)}\s*</h[1-6]>\s*'
    content = re.sub(heading_pattern, '', content, count=1, flags=re.IGNORECASE).strip()

    # Step 2: Remove the title text if it appears at the very start of remaining content
    # E.g., <p>Executive Summary TalentTalk...</p> -> <p>TalentTalk...</p>
    # Or: <p><strong>Company Profile</strong> TalentTalk...</p> -> <p>TalentTalk...</p>
    text_only = re.sub(r'<[^>]+>', '', content[:200]).strip()
    if text_only.lower().startswith(title_lower):
        # Remove title from inside the first tag or at the start
        inner_pattern = rf'(<p[^>]*>(?:\s*<(?:strong|b|em|i)[^>]*>)?\s*){re.escape(title_lower)}(\s*(?:</(?:strong|b|em|i)>)?\s*)'
        cleaned = re.sub(inner_pattern, r'\1', content, count=1, flags=re.IGNORECASE)
        if cleaned != content:
            # Clean up empty tags like <p><strong></strong> </p>
            cleaned = re.sub(r'<p[^>]*>\s*(?:<(?:strong|b|em|i)[^>]*>\s*</(?:strong|b|em|i)>\s*)*</p>\s*', '', cleaned)
            content = cleaned.strip()

    return content


def _text_to_html(text: str, section_key: str = "") -> str:
    """Convert plain-text proposal content into clean HTML for the rich-text editor.

    Handles: headings (ALL CAPS lines), numbered items, bullet points,
    labeled fields (Key: Value), and regular paragraphs.
    """
    if not text or not text.strip():
        return ""

    # If it already looks like HTML, return as-is
    if "<p>" in text or "<h2>" in text or "<div>" in text:
        return text

    lines = text.split("\n")
    html_parts = []
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines
        if not line:
            i += 1
            continue

        # ALL CAPS lines with 3+ words → h2 heading
        if (line.isupper() and len(line.split()) >= 2 and len(line) > 5
                and not line.startswith("-") and not line.startswith("•")):
            html_parts.append(f'<h2>{line.title()}</h2>')
            i += 1
            continue

        # Lines ending with colon → subheading (h3)
        if (line.endswith(":") and len(line) < 80 and not line.startswith("-")
                and not line.startswith("•") and not line.startswith("–")):
            html_parts.append(f'<h3>{line[:-1]}</h3>')
            i += 1
            continue

        # Numbered items (1. or 1) style) → ordered list
        if re.match(r'^\d+[\.\)]\s', line):
            html_parts.append("<ol>")
            while i < len(lines):
                li = lines[i].strip()
                m = re.match(r'^\d+[\.\)]\s*(.*)', li)
                if m:
                    content = m.group(1)
                    # Check for bold prefix like "Deep Domain Expertise — description"
                    dash_m = re.match(r'^(.+?)\s*[—–-]\s*(.*)', content)
                    if dash_m:
                        html_parts.append(f'<li><strong>{dash_m.group(1)}</strong> — {dash_m.group(2)}</li>')
                    else:
                        html_parts.append(f'<li>{content}</li>')
                    i += 1
                elif not li:
                    i += 1
                    break
                else:
                    break
            html_parts.append("</ol>")
            continue

        # Bullet items (-, •, ✔) → unordered list
        if re.match(r'^[-•✔✓►▸]\s', line):
            html_parts.append("<ul>")
            while i < len(lines):
                li = lines[i].strip()
                bm = re.match(r'^[-•✔✓►▸]\s*(.*)', li)
                if bm:
                    html_parts.append(f'<li>{bm.group(1)}</li>')
                    i += 1
                elif not li:
                    i += 1
                    break
                else:
                    break
            html_parts.append("</ul>")
            continue

        # "Label: Value" pattern on single line (common in cover pages)
        label_m = re.match(r'^([A-Z][A-Za-z /&]+):\s*(.+)', line)
        if label_m and len(label_m.group(1)) < 40:
            html_parts.append(f'<p><strong>{label_m.group(1)}:</strong> {label_m.group(2)}</p>')
            i += 1
            continue

        # Regular paragraph — collect consecutive non-special lines
        para_lines = [line]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if not nxt:
                i += 1
                break
            # Stop if next line looks like a heading, list, or label
            if (nxt.isupper() and len(nxt.split()) >= 2 and len(nxt) > 5):
                break
            if re.match(r'^\d+[\.\)]\s', nxt):
                break
            if re.match(r'^[-•✔✓►▸]\s', nxt):
                break
            if nxt.endswith(":") and len(nxt) < 80:
                break
            para_lines.append(nxt)
            i += 1

        html_parts.append(f'<p>{"<br/>".join(para_lines)}</p>')

    return "\n".join(html_parts)


def _cover_page_to_html(text: str, vendor: Dict, opportunity: Dict) -> str:
    """Convert cover page content into a structured, visually appealing HTML block."""
    company = vendor.get("company_name", "")
    agency = opportunity.get("agency", "")
    office = opportunity.get("contracting_office", "")
    title = opportunity.get("title", "Government Services Contract")
    cage = vendor.get("cage_code", "")
    duns = vendor.get("duns_number", "")
    naics = vendor.get("naics_codes", "")
    if isinstance(naics, list):
        naics = ", ".join(naics) if naics else ""
    solicitation = opportunity.get("solicitation_number", "")
    submission_date = opportunity.get("submission_date", "March 2026")
    poc_name = opportunity.get("poc_name", "")
    poc_title = opportunity.get("poc_title", "")
    poc_email = opportunity.get("poc_email", "")
    poc_phone = opportunity.get("poc_phone", "")
    proposal_type = opportunity.get("proposal_type", "Technical & Management Proposal")

    # Extract proposal statement and confidentiality from AI text if present
    proposal_stmt = ""
    confidentiality = ""
    if text:
        # Try to find proposal statement section
        ps_match = re.search(r'(?:PROPOSAL STATEMENT|Proposal Statement)[:\s]*\n?(.*?)(?=\n\s*(?:CONFIDENTIALITY|Confidentiality)|$)', text, re.DOTALL | re.IGNORECASE)
        if ps_match:
            proposal_stmt = ps_match.group(1).strip()
        conf_match = re.search(r'(?:CONFIDENTIALITY STATEMENT|Confidentiality Statement)[:\s]*\n?(.*?)$', text, re.DOTALL | re.IGNORECASE)
        if conf_match:
            confidentiality = conf_match.group(1).strip()

    if not proposal_stmt:
        proposal_stmt = (
            f"{company} respectfully submits this proposal in response to the above-referenced "
            f"solicitation. Our approach combines advanced technology, industry best practices, "
            f"and a highly skilled workforce to ensure successful delivery."
        )
    if not confidentiality:
        confidentiality = (
            f"This proposal contains proprietary and confidential information of {company}. "
            f"It is submitted solely for evaluation purposes and shall not be disclosed "
            f"without prior written consent."
        )

    # Build structured cover page HTML
    parts = []
    parts.append(f'<div style="text-align:center;padding:20px 0">')
    parts.append(f'<h1 style="color:#1B2A4A;font-size:24px;margin:0 0 8px">{title.upper()}</h1>')
    parts.append(f'<p style="color:#10B981;font-size:16px;margin:0 0 24px">{proposal_type}</p>')

    if agency:
        parts.append(f'<p style="color:#6B7280;font-size:12px;margin:0">Submitted To</p>')
        parts.append(f'<p style="color:#1B2A4A;font-size:16px;font-weight:bold;margin:4px 0">{agency}</p>')
        if office:
            parts.append(f'<p style="color:#374151;font-size:14px;margin:0 0 16px">{office}</p>')
        else:
            parts.append(f'<br/>')

    if solicitation:
        parts.append(f'<p style="color:#374151;margin:8px 0">Solicitation No: {solicitation}</p>')

    parts.append(f'<hr style="border:none;border-top:2px solid #10B981;width:60%;margin:16px auto"/>')

    if company:
        parts.append(f'<p style="color:#6B7280;font-size:12px;margin:0">Submitted By</p>')
        parts.append(f'<p style="color:#1B2A4A;font-size:18px;font-weight:bold;margin:4px 0">{company}</p>')
        details = []
        if cage:
            details.append(f"CAGE: {cage}")
        if duns:
            details.append(f"UEI/DUNS: {duns}")
        if naics:
            details.append(f"NAICS: {naics}")
        if details:
            parts.append(f'<p style="color:#6B7280;font-size:12px;margin:4px 0">{" | ".join(details)}</p>')
        parts.append(f'<br/>')

    if submission_date:
        parts.append(f'<p style="color:#374151;margin:8px 0"><strong>Submission Date:</strong> {submission_date}</p>')

    if poc_name:
        parts.append(f'<br/>')
        parts.append(f'<p style="color:#6B7280;font-size:12px;margin:0">Point of Contact</p>')
        parts.append(f'<p style="color:#1B2A4A;font-weight:bold;margin:4px 0">{poc_name}</p>')
        if poc_title:
            parts.append(f'<p style="color:#374151;font-size:13px;margin:0">{poc_title}</p>')
        poc_details = []
        if poc_email:
            poc_details.append(f"Email: {poc_email}")
        if poc_phone:
            poc_details.append(f"Phone: {poc_phone}")
        if poc_details:
            parts.append(f'<p style="color:#6B7280;font-size:12px;margin:4px 0">{" | ".join(poc_details)}</p>')

    parts.append(f'</div>')

    # Proposal Statement
    parts.append(f'<h3 style="color:#1B2A4A;margin-top:24px">Proposal Statement</h3>')
    parts.append(f'<p>{proposal_stmt}</p>')

    # Confidentiality
    parts.append(f'<h3 style="color:#1B2A4A;margin-top:16px">Confidentiality Statement</h3>')
    parts.append(f'<p style="color:#6B7280;font-style:italic">{confidentiality}</p>')

    return "\n".join(parts)


class AIService:
    """Service for generating proposal content using Google Gemini API."""

    def __init__(self) -> None:
        raw_key = os.getenv("GROQ_API_KEY", "").strip()

        self.api_key = raw_key
        self.demo_mode = not bool(self.api_key)

        if self.demo_mode:
            logger.warning(
                "GROQ_API_KEY not set. Running in DEMO mode with template-based content."
            )
        else:
            self.client = Groq(api_key=self.api_key)

    def generate_section(self, prompt: str) -> str:
        """
        Generate content for a single proposal section using Groq.
        Includes automatic retry with exponential backoff for rate limit errors.
        """
        if self.demo_mode:
            return "Demo mode active. Please check API key."

        max_retries = 4
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=2000,
                    temperature=0.7,
                )
                return response.choices[0].message.content.strip()

            except Exception as e:
                error_str = str(e).lower()
                is_rate_limit = (
                    "rate limit" in error_str
                    or "429" in error_str
                    or "quota" in error_str
                    or "too many requests" in error_str
                    or "rate_limit_exceeded" in error_str
                )
                if is_rate_limit and attempt < max_retries - 1:
                    wait = 2 ** attempt  # 1s, 2s, 4s
                    logger.warning(
                        "Groq rate limit hit, retrying in %ds (attempt %d/%d)",
                        wait, attempt + 1, max_retries,
                    )
                    time.sleep(wait)
                    continue
                # Non-rate-limit error or exhausted retries
                print("❌ GROQ ERROR:", e)
                if is_rate_limit:
                    return (
                        "AI quota exceeded for this section. "
                        "Click AI Rewrite above to regenerate, or type your content below."
                    )
                return f"AI ERROR: {str(e)}"
    
    @staticmethod
    def _generate_demo_text(prompt: str) -> str:
        """Generate template-based content when no Gemini API key is configured."""
        prompt_lower = prompt.lower()
        if "about us" in prompt_lower or "about company" in prompt_lower:
            return (
                "We are a dedicated government contracting firm committed to delivering innovative solutions "
                "that address the evolving needs of federal agencies. With a proven track record of successful "
                "contract performance, our team combines deep domain expertise with cutting-edge technology to "
                "drive mission success.\n\n"
                "Our organization maintains a strong commitment to quality, compliance, and continuous improvement. "
                "We hold key industry certifications and maintain active registrations across all major federal "
                "procurement platforms. Our team of experienced professionals brings decades of combined expertise "
                "in supporting federal missions across defense, civilian, and intelligence community sectors.\n\n"
                "We pride ourselves on building lasting partnerships with our government clients, consistently "
                "delivering on time and within budget while exceeding performance expectations."
            )
        elif "capability statement" in prompt_lower:
            return (
                "CORE COMPETENCIES: Our firm specializes in delivering comprehensive solutions across IT modernization, "
                "cybersecurity, cloud migration, data analytics, and program management. We leverage industry best "
                "practices and agile methodologies to ensure rapid, cost-effective delivery.\n\n"
                "DIFFERENTIATORS: What sets us apart is our deep understanding of federal acquisition processes, "
                "combined with our ability to rapidly deploy highly qualified personnel. Our past performance record "
                "demonstrates consistent excellence across multiple federal agencies and contract vehicles.\n\n"
                "VALUE PROPOSITION: We offer competitive pricing, flexible staffing models, and a commitment to "
                "small business utilization goals. Our quality management system ensures compliance with all "
                "applicable FAR/DFAR requirements while maintaining the highest standards of service delivery."
            )
        else:
            # Generic review / analysis response
            return (
                "SCOPE OF WORK SUMMARY\n"
                "This opportunity requires the contractor to provide comprehensive professional services "
                "in support of the agency's mission objectives. The scope encompasses planning, execution, "
                "and management of key deliverables aligned with federal requirements.\n\n"
                "KEY REQUIREMENTS\n"
                "- Qualified personnel with relevant experience and certifications\n"
                "- Compliance with all applicable federal regulations (FAR/DFAR)\n"
                "- Regular status reporting and performance metrics\n"
                "- Quality assurance and continuous improvement processes\n\n"
                "RECOMMENDED APPROACH\n"
                "A phased approach is recommended, beginning with requirements analysis, followed by "
                "solution design, implementation, and ongoing support. Leveraging agile methodologies "
                "will ensure responsive delivery aligned with agency priorities.\n\n"
                "GO/NO-GO RECOMMENDATION: PURSUE\n"
                "This opportunity aligns well with our core competencies and past performance profile. "
                "Recommend proceeding with proposal development."
            )

    def _build_past_performance_content(self, vendor: Dict, company: str, opp_title: str) -> str:
        """Build past performance section using actual vendor records if available."""
        pp_records = vendor.get("past_performances", [])
        if pp_records and isinstance(pp_records, list) and len(pp_records) > 0:
            lines = [
                f"Past Performance\n",
                f"{company} has a proven track record of successful contract execution. "
                f"Below are our past performance references demonstrating our "
                f"capability to deliver services similar to {opp_title}.\n"
            ]
            for i, pp in enumerate(pp_records, 1):
                if not isinstance(pp, dict):
                    continue
                name = pp.get("contract_name", f"Contract Reference {i}")
                lines.append(f"Reference {i}: {name}")
                if pp.get("agency"):
                    lines.append(f"- Agency: {pp['agency']}")
                if pp.get("contract_number"):
                    lines.append(f"- Contract Number: {pp['contract_number']}")
                if pp.get("contract_value"):
                    lines.append(f"- Contract Value: {pp['contract_value']}")
                start = pp.get("start_year", "")
                end = pp.get("end_year", "")
                if start or end:
                    lines.append(f"- Period of Performance: {start} - {end}")
                if pp.get("staffing_count"):
                    lines.append(f"- Staffing: {pp['staffing_count']}")
                if pp.get("description"):
                    lines.append(f"- Scope: {pp['description']}")
                lines.append("")  # blank line between references
            return "\n".join(lines)
        else:
            # Fallback to demo data
            return (
                f"Past Performance\n\n"
                f"{company} has a proven track record of successful contract execution. "
                f"Below are representative past performance references demonstrating our "
                f"capability to deliver services similar to {opp_title}.\n\n"
                f"Reference 1: Enterprise IT Modernization\n"
                f"- Agency: Department of Defense\n"
                f"- Contract Value: $4.2M\n"
                f"- Period: 2023-2025\n"
                f"- Scope: End-to-end IT modernization including cloud migration, "
                f"application development, and cybersecurity implementation\n"
                f"- Result: Delivered on-time and under budget; CPARS rating: Exceptional\n\n"
                f"Reference 2: Cybersecurity Operations Support\n"
                f"- Agency: Department of Homeland Security\n"
                f"- Contract Value: $2.8M\n"
                f"- Period: 2022-2024\n"
                f"- Scope: 24/7 SOC operations, threat intelligence, incident response\n"
                f"- Result: 99.99% uptime; zero critical security breaches; CPARS: Very Good\n\n"
                f"Reference 3: Cloud Infrastructure Services\n"
                f"- Agency: General Services Administration\n"
                f"- Contract Value: $1.5M\n"
                f"- Period: 2024-2025\n"
                f"- Scope: AWS GovCloud migration and managed services\n"
                f"- Result: 40% cost reduction achieved; CPARS: Exceptional"
            )

    def _generate_demo_section(self, section_key: str, vendor: Dict, opportunity: Dict) -> str:
        """Generate realistic demo content for a section without calling the AI API."""
        company = vendor.get("company_name", "Acme Federal Solutions")
        opp_title = opportunity.get("title", "Government Services Contract")
        agency = opportunity.get("agency", "Federal Agency")
        description = opportunity.get("description", "government services and support")
        naics = vendor.get("naics_codes", "541512")
        if isinstance(naics, list):
            naics = ", ".join(naics) if naics else "541512"
        capabilities = vendor.get("capabilities", "IT modernization, cloud services, cybersecurity")
        cage = vendor.get("cage_code", "5ABC1")
        duns = vendor.get("duns_number", "123456789")
        socio = vendor.get("socioeconomic_status", "Small Business")

        templates = {
            "cover_page": (
                f"PROPOSAL\n\n"
                f"Title: {opp_title}\n"
                f"Submitted to: {agency}\n"
                f"Submitted by: {company}\n"
                f"CAGE Code: {cage}\n"
                f"DUNS/UEI: {duns}\n"
                f"NAICS: {naics}\n"
                f"Date: March 2026\n\n"
                f"Point of Contact:\n"
                f"{company}\n"
                f"Federal Contracting Division\n\n"
                f"This proposal is submitted in response to the above-referenced solicitation "
                f"and represents {company}'s comprehensive approach to meeting all requirements."
            ),
            "executive_summary": (
                f"Executive Summary\n\n"
                f"{company} is pleased to submit this proposal in response to {agency}'s requirement "
                f"for {opp_title}. Our team brings extensive experience in {capabilities}, "
                f"positioning us as an ideal partner for this critical initiative.\n\n"
                f"Our Proposed Solution:\n"
                f"{company} proposes a comprehensive, results-driven approach that leverages our "
                f"proven methodologies and experienced workforce. Our solution addresses every aspect "
                f"of the stated requirements while delivering measurable value through:\n\n"
                f"1. Deep Domain Expertise — Over a decade of experience delivering similar solutions "
                f"to federal agencies, with a 98% on-time delivery rate.\n\n"
                f"2. Innovative Technology — We employ cutting-edge tools and frameworks that enhance "
                f"efficiency, reduce costs, and accelerate delivery timelines.\n\n"
                f"3. Proven Methodology — Our ISO-certified processes ensure quality, compliance, "
                f"and continuous improvement throughout the period of performance.\n\n"
                f"4. Dedicated Team — We commit top-tier professionals with relevant certifications "
                f"and clearances, ensuring seamless execution from day one.\n\n"
                f"{company} is committed to delivering exceptional results that exceed expectations "
                f"while maintaining full compliance with all applicable regulations and standards."
            ),
            "vendor_profile": (
                f"Company Profile\n\n"
                f"{company} is a dynamic, mission-focused organization specializing in {capabilities}. "
                f"Founded with the vision of delivering exceptional services to government agencies, "
                f"we have grown into a trusted partner for federal, state, and local clients.\n\n"
                f"Organization Overview:\n"
                f"- CAGE Code: {cage}\n"
                f"- DUNS/UEI: {duns}\n"
                f"- NAICS Codes: {naics}\n"
                f"- Socioeconomic Status: {socio}\n"
                f"- Registered and active in SAM.gov\n\n"
                f"Core Business Areas:\n"
                f"Our core competencies include {capabilities}. We maintain a robust quality "
                f"management system and invest heavily in professional development to ensure "
                f"our team stays at the forefront of industry best practices.\n\n"
                f"Corporate Resources:\n"
                f"{company} maintains strong financial health, demonstrated by consistent year-over-year "
                f"revenue growth and a healthy balance sheet. Our corporate infrastructure supports "
                f"rapid scaling to meet contract requirements."
            ),
            "socioeconomic_status": (
                f"Socioeconomic Status\n\n"
                f"{company} is classified as a {socio} under SBA size standards for NAICS {naics}. "
                f"We are committed to supporting the government's small business utilization goals "
                f"and economic development objectives.\n\n"
                f"Certifications and Designations:\n"
                f"- {socio} designation confirmed and active\n"
                f"- SBA size standard compliant for applicable NAICS codes\n"
                f"- Active SAM.gov registration with current representations and certifications\n\n"
                f"Small Business Subcontracting:\n"
                f"{company} maintains a robust small business subcontracting plan that maximizes "
                f"opportunities for small, disadvantaged, women-owned, HUBZone, and "
                f"service-disabled veteran-owned small businesses."
            ),
            "capability_statement": (
                f"Capability Statement\n\n"
                f"Core Competencies:\n"
                f"{company} delivers excellence across our key capability areas: {capabilities}. "
                f"Each competency is backed by certified professionals, proven processes, and "
                f"successful past performance.\n\n"
                f"Differentiators:\n"
                f"1. Agile Delivery — We employ agile and DevSecOps methodologies that accelerate "
                f"delivery while maintaining quality and security.\n"
                f"2. Cleared Workforce — Our team maintains active security clearances, enabling "
                f"rapid onboarding and seamless integration.\n"
                f"3. Innovation Focus — We invest 10% of revenue in R&D to stay ahead of "
                f"emerging technologies and threats.\n\n"
                f"Tools & Technologies:\n"
                f"Our technology stack includes industry-leading platforms and tools, "
                f"all configured to meet federal security and compliance requirements. "
                f"We maintain FedRAMP-ready infrastructure and NIST-compliant processes."
            ),
            "past_performance": self._build_past_performance_content(vendor, company, opp_title),
            "technical_approach": (
                f"Technical Approach\n\n"
                f"1. Understanding of Requirements\n"
                f"{company} thoroughly understands {agency}'s requirements for {opp_title}. "
                f"Our analysis of the solicitation reveals key focus areas that align directly "
                f"with our proven capabilities in {capabilities}.\n\n"
                f"2. Proposed Solution\n"
                f"We propose a phased approach that ensures rapid value delivery while "
                f"minimizing risk:\n\n"
                f"Phase 1 - Discovery & Planning (Weeks 1-4): Comprehensive requirements analysis, "
                f"stakeholder engagement, and detailed project planning.\n\n"
                f"Phase 2 - Implementation (Weeks 5-16): Core solution development and deployment "
                f"using agile sprints with bi-weekly deliverables.\n\n"
                f"Phase 3 - Optimization (Weeks 17-20): Performance tuning, user training, "
                f"and knowledge transfer.\n\n"
                f"3. Risk Management\n"
                f"Our proactive risk management framework identifies, assesses, and mitigates "
                f"risks throughout the project lifecycle. Key risk areas and mitigations are "
                f"documented in our Risk Register and reviewed weekly.\n\n"
                f"4. Quality Assurance\n"
                f"All deliverables undergo rigorous QA/QC processes aligned with ISO 9001 "
                f"standards, ensuring consistent quality and compliance."
            ),
            "staffing_plan": (
                f"Staffing Plan\n\n"
                f"1. Key Personnel\n"
                f"{company} commits the following key personnel to this engagement:\n\n"
                f"Program Manager — 15+ years of federal program management experience, "
                f"PMP certified, with proven expertise managing contracts of similar size and scope.\n\n"
                f"Technical Lead — 12+ years in {capabilities}, with relevant certifications "
                f"and hands-on experience delivering solutions to federal agencies.\n\n"
                f"Subject Matter Expert — Deep domain expertise in the functional area, "
                f"with a track record of successful implementations.\n\n"
                f"Quality Assurance Lead — Certified CMMI and ISO auditor, responsible for "
                f"ensuring all deliverables meet the highest quality standards.\n\n"
                f"2. Staffing Approach\n"
                f"All staff assigned to this contract will possess the required security clearances "
                f"and certifications. Our talent acquisition team maintains a pipeline of pre-vetted "
                f"candidates to support surge requirements.\n\n"
                f"3. Training & Development\n"
                f"We invest in continuous professional development, with mandatory 40+ hours of "
                f"annual training per employee to keep skills current."
            ),
            "compliance_checklist": (
                f"Compliance Checklist\n\n"
                f"{company} confirms compliance with all applicable requirements:\n\n"
                f"[x] FAR/DFARS Compliance — All applicable clauses acknowledged and incorporated\n"
                f"[x] Section 508 Accessibility — Full compliance with accessibility standards\n"
                f"[x] Cybersecurity (NIST 800-171/FISMA) — Compliant security controls implemented\n"
                f"[x] Data Protection & Privacy — PII handling procedures in place per NIST guidelines\n"
                f"[x] Equal Employment Opportunity — Full EEO compliance certified\n"
                f"[x] Insurance & Bonding — Adequate coverage maintained\n"
                f"[x] Conflict of Interest — No organizational conflicts of interest identified\n"
                f"[x] SAM.gov Registration — Active and current\n"
                f"[x] Representations & Certifications — All current and accurate\n"
                f"[x] Quality Management System — ISO 9001 certified processes\n\n"
                f"{company} maintains a dedicated compliance team that monitors regulatory changes "
                f"and ensures ongoing adherence to all federal acquisition requirements."
            ),
            "management_approach": (
                f"Management Approach\n\n"
                f"1. Program Management Structure\n"
                f"{company} will establish a dedicated Program Management Office (PMO) led by an "
                f"experienced Program Manager who reports directly to the Contracting Officer's "
                f"Representative (COR). Our organizational structure ensures clear lines of authority, "
                f"accountability, and rapid decision-making.\n\n"
                f"2. Communication Plan\n"
                f"- Weekly Status Reports delivered every Friday by 5:00 PM\n"
                f"- Bi-weekly Program Reviews with government stakeholders\n"
                f"- Monthly Executive Briefings for senior leadership\n"
                f"- 24-hour response time for all government inquiries\n"
                f"- Escalation path: Task Lead → PM → VP of Operations → CEO\n\n"
                f"3. Project Management Methodology\n"
                f"{company} employs a hybrid Agile/PMBOK methodology tailored to federal requirements. "
                f"We use 2-week sprints for iterative delivery while maintaining the documentation "
                f"and traceability required for government contracts.\n\n"
                f"4. Performance Monitoring\n"
                f"Key Performance Indicators tracked monthly:\n"
                f"- Schedule Performance Index (SPI) target: ≥ 0.95\n"
                f"- Cost Performance Index (CPI) target: ≥ 0.95\n"
                f"- Deliverable Acceptance Rate target: ≥ 98%\n"
                f"- Customer Satisfaction Score target: ≥ 4.5/5.0"
            ),
            "key_personnel": (
                f"Key Personnel / Resumes\n\n"
                f"1. Program Manager — John A. Mitchell, PMP\n"
                f"Experience: 15 years in federal program management\n"
                f"Education: MBA, George Washington University; BS Computer Science, Virginia Tech\n"
                f"Certifications: PMP, ITIL v4, SAFe Agilist\n"
                f"Clearance: Secret\n"
                f"Relevant Projects:\n"
                f"- Led $8M DoD IT modernization program (2022-2025) — Delivered on-time\n"
                f"- Managed $4.2M DHS cybersecurity operations contract — CPARS: Exceptional\n"
                f"- Directed $3.1M GSA cloud migration — 35% cost savings achieved\n\n"
                f"2. Technical Lead — Sarah K. Rodriguez\n"
                f"Experience: 12 years in {capabilities}\n"
                f"Education: MS Information Systems, Johns Hopkins; BS Engineering, Penn State\n"
                f"Certifications: CISSP, AWS Solutions Architect, Azure Administrator\n"
                f"Clearance: Top Secret\n"
                f"Relevant Projects:\n"
                f"- Architect for DoD enterprise cloud platform — 99.99% uptime\n"
                f"- Led DHS zero-trust implementation — Reduced incidents by 60%\n"
                f"- Designed VA data analytics pipeline — Processing 10M+ records daily\n\n"
                f"3. Quality Assurance Lead — David Chen, CSQA\n"
                f"Experience: 10 years in quality assurance and testing\n"
                f"Education: MS Software Engineering, Carnegie Mellon\n"
                f"Certifications: CSQA, CMMI Appraiser, ISO 9001 Lead Auditor\n"
                f"Clearance: Secret\n"
                f"Relevant Projects:\n"
                f"- QA lead for DoD Agile development program — Zero defects in production\n"
                f"- Established CMMI Level 3 processes for federal contractor\n"
                f"- Led Section 508 compliance testing for 15+ government applications"
            ),
            "cost_price_proposal": (
                f"Cost / Price Proposal\n\n"
                f"1. Pricing Summary\n"
                f"{company} proposes competitive, fair and reasonable pricing for {opp_title}. "
                f"Our rates are benchmarked against GSA Schedule rates and reflect our commitment "
                f"to delivering maximum value to {agency}.\n\n"
                f"2. Labor Categories and Rates\n"
                f"Program Manager ............ $165/hour\n"
                f"Technical Lead ............. $155/hour\n"
                f"Senior Engineer/Analyst .... $140/hour\n"
                f"Mid-Level Engineer/Analyst . $115/hour\n"
                f"Junior Engineer/Analyst .... $85/hour\n"
                f"Quality Assurance Lead ..... $130/hour\n"
                f"Administrative Support ..... $65/hour\n\n"
                f"3. Other Direct Costs (ODCs)\n"
                f"- Travel: Estimated $25,000 annually (CONUS, per JTR)\n"
                f"- Software Licenses: $15,000 annually\n"
                f"- Training: $10,000 annually\n\n"
                f"4. Basis of Estimate\n"
                f"Labor hours are estimated based on similar past performance contracts. "
                f"Rates are fully burdened and include fringe benefits, overhead, G&A, and profit. "
                f"All rates are compliant with applicable Service Contract Labor Standards."
            ),
            "quality_assurance": (
                f"Quality Assurance Plan\n\n"
                f"1. QA/QC Philosophy\n"
                f"{company} maintains an ISO 9001:2015 certified Quality Management System (QMS) "
                f"that ensures consistent, high-quality deliverables across all contracts.\n\n"
                f"2. Quality Control Processes\n"
                f"- Peer Review: All deliverables undergo peer review before submission\n"
                f"- Technical Review: Senior staff validate technical accuracy and completeness\n"
                f"- Compliance Review: Dedicated QA team verifies regulatory compliance\n"
                f"- Final Approval: PM certifies deliverable quality before government submission\n\n"
                f"3. Deliverable Review Cycle\n"
                f"Draft Deliverable → Internal QC Review (2 days) → Revisions → "
                f"Government Draft Review → Incorporate Feedback → Final Deliverable\n\n"
                f"4. Performance Metrics\n"
                f"- Deliverable acceptance rate: Target ≥ 98% first submission\n"
                f"- Defect density: Target < 0.5 defects per deliverable\n"
                f"- Corrective action closure: Within 5 business days\n"
                f"- Customer satisfaction: Target ≥ 4.5/5.0\n\n"
                f"5. Continuous Improvement\n"
                f"Quarterly lessons learned sessions drive process improvements. "
                f"Root cause analysis is conducted for all quality escapes."
            ),
            "risk_mitigation": (
                f"Risk Mitigation Plan\n\n"
                f"1. Risk Management Framework\n"
                f"{company} employs a proactive risk management approach aligned with "
                f"PMI PMBOK and NIST risk management frameworks.\n\n"
                f"2. Risk Register\n\n"
                f"Risk: Key Personnel Turnover\n"
                f"Probability: Medium | Impact: High\n"
                f"Mitigation: Maintain bench of pre-cleared backup personnel; cross-train team\n"
                f"Contingency: Deploy backup within 5 business days\n\n"
                f"Risk: Schedule Delays Due to Requirements Changes\n"
                f"Probability: Medium | Impact: Medium\n"
                f"Mitigation: Agile methodology with sprint-based re-prioritization\n"
                f"Contingency: Surge staffing available within 2 weeks\n\n"
                f"Risk: Technology Obsolescence\n"
                f"Probability: Low | Impact: High\n"
                f"Mitigation: Continuous technology monitoring; modular architecture\n"
                f"Contingency: Technology refresh plan with minimal disruption\n\n"
                f"Risk: Security Breach or Data Loss\n"
                f"Probability: Low | Impact: Critical\n"
                f"Mitigation: NIST 800-171 controls; continuous monitoring; encryption at rest/transit\n"
                f"Contingency: Incident response plan with 1-hour notification to government\n\n"
                f"Risk: Subcontractor Performance Issues\n"
                f"Probability: Low | Impact: Medium\n"
                f"Mitigation: Rigorous subcontractor vetting; monthly performance reviews\n"
                f"Contingency: Pre-identified alternate subcontractors\n\n"
                f"3. Risk Monitoring\n"
                f"Risks are reviewed weekly at PMO meetings and reported monthly to the COR."
            ),
            "transition_plan": (
                f"Transition / Phase-In Plan\n\n"
                f"1. Transition Approach\n"
                f"{company} will execute a disciplined 30-day transition plan that ensures "
                f"zero disruption to ongoing operations while rapidly assuming full contract responsibilities.\n\n"
                f"2. Phase-In Timeline\n"
                f"Week 1: Contract kick-off, key personnel onboarding, access requests\n"
                f"Week 2: Knowledge transfer sessions with incumbent/government; systems access\n"
                f"Week 3: Shadow operations — our team works alongside existing staff\n"
                f"Week 4: Full operational capability; incumbent handoff complete\n\n"
                f"3. Knowledge Transfer\n"
                f"- Structured KT sessions with incumbent staff (if applicable)\n"
                f"- Documentation review and repository transfer\n"
                f"- Process mapping and workflow documentation\n"
                f"- Tool and system access provisioning\n\n"
                f"4. Personnel Onboarding\n"
                f"- All key personnel identified and committed prior to contract start\n"
                f"- Security clearance processing initiated upon award notification\n"
                f"- Building access and CAC/PIV card requests submitted Day 1\n"
                f"- Role-specific training completed within first 2 weeks\n\n"
                f"5. Continuity of Operations\n"
                f"{company} guarantees no service interruption during transition. "
                f"Our experienced transition team has successfully executed 10+ federal contract transitions."
            ),
            "subcontracting_plan": (
                f"Small Business Subcontracting Plan\n\n"
                f"Per FAR 52.219-9, {company} commits to the following small business subcontracting goals:\n\n"
                f"Subcontracting Goals (% of total subcontract value):\n"
                f"- Small Business (SB): 40%\n"
                f"- Small Disadvantaged Business (SDB): 10%\n"
                f"- Women-Owned Small Business (WOSB): 8%\n"
                f"- HUBZone Small Business: 5%\n"
                f"- Service-Disabled Veteran-Owned SB (SDVOSB): 5%\n"
                f"- Veteran-Owned Small Business (VOSB): 3%\n\n"
                f"Good Faith Efforts:\n"
                f"- Active outreach through SBA's SubNet and Dynamic Small Business Search\n"
                f"- Participation in small business matchmaking events and procurement conferences\n"
                f"- Mentor-protege relationships with developing small businesses\n"
                f"- Unbundling of requirements to maximize small business participation\n\n"
                f"Reporting:\n"
                f"- Individual Subcontracting Reports (ISR) submitted semi-annually via eSRS\n"
                f"- Summary Subcontracting Reports (SSR) submitted annually\n"
                f"- Internal quarterly reviews of subcontracting goal achievement\n\n"
                f"{company} has a proven track record of exceeding small business subcontracting goals "
                f"and is committed to maximizing opportunities for small businesses."
            ),
            "compliance_matrix": (
                f"Compliance Matrix\n\n"
                f"The following matrix maps each solicitation requirement to {company}'s proposal response.\n\n"
                f"Req ID | Requirement | Proposal Section | Status | Narrative\n"
                f"{'─' * 80}\n"
                f"C.1.1 | Technical approach per SOW | Technical Approach, §3 | Compliant | "
                f"{company} addresses all technical requirements through our proven methodology.\n\n"
                f"C.2.1 | Key personnel qualifications | Key Personnel, §4 | Compliant | "
                f"All proposed key personnel meet or exceed stated qualifications.\n\n"
                f"C.3.1 | Quality management system | Quality Assurance, §5 | Compliant | "
                f"ISO 9001:2015 certified QMS in place and operational.\n\n"
                f"C.4.1 | Security requirements | Compliance Checklist, §9 | Compliant | "
                f"NIST 800-171 compliant; facility clearance current.\n\n"
                f"L.1.1 | Page limit compliance | All volumes | Compliant | "
                f"All volumes within specified page limits.\n\n"
                f"L.2.1 | Format requirements (font, margins) | All volumes | Compliant | "
                f"12pt Times New Roman, 1-inch margins throughout.\n\n"
                f"M.1.1 | Technical approach evaluation | Technical Approach, §3 | Compliant | "
                f"Addresses all evaluation sub-factors per Section M.\n\n"
                f"M.2.1 | Past performance evaluation | Past Performance, §6 | Compliant | "
                f"Three relevant references with CPARS ratings provided.\n\n"
                f"M.3.1 | Price evaluation | Cost/Price Proposal, §7 | Compliant | "
                f"Fair and reasonable pricing with complete cost breakdown.\n\n"
                f"{company} has performed a comprehensive compliance review and confirms "
                f"full compliance with all solicitation requirements."
            ),
            "implementation_timeline": (
                f"Implementation Timeline\n\n"
                f"{company} proposes the following phased implementation plan for {opp_title}:\n\n"
                f"PHASE 1: MOBILIZATION & TRANSITION (Months 1-2)\n"
                f"Week 1-2: Contract kick-off, personnel onboarding, access provisioning\n"
                f"Week 3-4: Knowledge transfer from incumbent, systems setup\n"
                f"Week 5-6: Shadow operations, process documentation\n"
                f"Week 7-8: Full operational capability achieved\n"
                f"Milestone: Transition Complete — Full operations assumed\n\n"
                f"PHASE 2: CORE IMPLEMENTATION (Months 3-8)\n"
                f"Month 3-4: Requirements analysis, solution design, stakeholder reviews\n"
                f"Month 5-6: Core development/delivery, iterative testing\n"
                f"Month 7-8: Integration testing, user acceptance testing\n"
                f"Milestone: Core Deliverables — Primary deliverables accepted\n\n"
                f"PHASE 3: OPTIMIZATION & STEADY STATE (Months 9-12)\n"
                f"Month 9-10: Performance optimization, training delivery\n"
                f"Month 11-12: Continuous improvement, lessons learned, option year planning\n"
                f"Milestone: Year 1 Complete — All base year deliverables submitted\n\n"
                f"KEY MILESTONES:\n"
                f"- Contract Award + 30 days: Transition Complete\n"
                f"- Contract Award + 90 days: First Major Deliverable\n"
                f"- Contract Award + 180 days: Mid-Year Review\n"
                f"- Contract Award + 365 days: Base Year Complete\n\n"
                f"STAFFING BY PHASE:\n"
                f"Phase 1: 6 FTEs (transition team + key personnel)\n"
                f"Phase 2: 10 FTEs (full project team)\n"
                f"Phase 3: 8 FTEs (steady-state operations)\n\n"
                f"All timelines include built-in government review periods (10 business days "
                f"per deliverable review cycle)."
            ),
        }

        return templates.get(section_key, f"[Demo content for {section_key}]")

    def generate_proposal(
        self,
        vendor: Dict,
        opportunity: Dict,
        sections: Optional[List[str]] = None,
    ) -> Dict[str, Dict[str, str]]:
        """
        Generate a complete government proposal with multiple sections.

        Uses Gemini AI when API key is available, otherwise generates
        realistic demo content using templates.

        Args:
            vendor: Vendor profile data dict.
            opportunity: Opportunity details dict.
            sections: List of section keys to generate. If None, generates all sections.

        Returns:
            Dict mapping section keys to dicts with 'title' and 'content'.
        """
        if sections is None:
            sections = list(SECTION_PROMPTS.keys())

        results: Dict[str, Dict[str, str]] = {}

        if self.demo_mode:
            logger.info("Generating proposal in DEMO mode (no API key)")
            for section_key in sections:
                if section_key not in SECTION_PROMPTS:
                    logger.warning("Unknown section requested: %s (skipping)", section_key)
                    continue
                content = self._generate_demo_section(section_key, vendor, opportunity)
                # Convert to HTML for rich-text editor
                if section_key == "cover_page":
                    content = _cover_page_to_html(content, vendor, opportunity)
                else:
                    content = _text_to_html(content, section_key)
                # Strip leading section title to avoid duplicates in the editor
                section_title = SECTION_TITLES.get(section_key, section_key.replace("_", " ").title())
                content = _strip_leading_title(content, section_title)
                results[section_key] = {
                    "title": section_title,
                    "content": content,
                }
                logger.info("Generated demo section: %s", section_key)
            return results

        # Real AI generation with Gemini
        vendor_context = self._build_vendor_context(vendor)
        opportunity_context = self._build_opportunity_context(opportunity)

        for section_key in sections:
            if section_key not in SECTION_PROMPTS:
                logger.warning("Unknown section requested: %s (skipping)", section_key)
                continue

            section_prompt = self._build_section_prompt(
                section_key=section_key,
                vendor_context=vendor_context,
                opportunity_context=opportunity_context,
            )

            try:
                content = self.generate_section(section_prompt)
                # Convert to HTML for rich-text editor
                if section_key == "cover_page":
                    content = _cover_page_to_html(content, vendor, opportunity)
                else:
                    content = _text_to_html(content, section_key)
                # Strip leading section title to avoid duplicates in the editor
                section_title = SECTION_TITLES.get(section_key, section_key.replace("_", " ").title())
                content = _strip_leading_title(content, section_title)
                results[section_key] = {
                    "title": section_title,
                    "content": content,
                }
                logger.info("Generated section: %s", section_key)
            except RuntimeError as exc:
                logger.error("Failed to generate section %s: %s", section_key, exc)
                results[section_key] = {
                    "title": SECTION_TITLES.get(section_key, section_key.replace("_", " ").title()),
                    "content": f"[Error generating this section: {exc}]",
                }

        return results

    def _build_section_prompt(
        self,
        section_key: str,
        vendor_context: str,
        opportunity_context: str,
    ) -> str:
        """Build the complete prompt for a given section."""
        base_prompt = SECTION_PROMPTS[section_key]

        return (
            f"{base_prompt}\n\n"
            f"--- VENDOR INFORMATION ---\n{vendor_context}\n\n"
            f"--- OPPORTUNITY INFORMATION ---\n{opportunity_context}\n\n"
            f"Write the {SECTION_TITLES.get(section_key, section_key)} section now. "
            f"Be specific, professional, and directly relevant to this opportunity. "
            f"Do not use placeholder brackets like [insert X here] - generate complete, "
            f"realistic content based on the provided information."
        )

    @staticmethod
    def _build_vendor_context(vendor: Dict) -> str:
        """Format vendor data into a readable context string."""
        lines = []
        lines.append(f"Company Name: {vendor.get('company_name', 'N/A')}")

        if vendor.get("cage_code"):
            lines.append(f"CAGE Code: {vendor['cage_code']}")
        if vendor.get("duns_number"):
            lines.append(f"DUNS/UEI Number: {vendor['duns_number']}")
        if vendor.get("ein_tin"):
            lines.append(f"EIN/TIN: {vendor['ein_tin']}")
        if vendor.get("naics_codes"):
            codes = vendor["naics_codes"]
            if isinstance(codes, list):
                codes = ", ".join(codes)
            lines.append(f"NAICS Codes: {codes}")
        if vendor.get("organizational_type"):
            lines.append(f"Organization Type: {vendor['organizational_type']}")
        if vendor.get("state_of_incorporation"):
            lines.append(f"State of Incorporation: {vendor['state_of_incorporation']}")
        if vendor.get("years_in_business"):
            lines.append(f"Years in Business: {vendor['years_in_business']}")
        if vendor.get("number_of_employees"):
            lines.append(f"Number of Employees: {vendor['number_of_employees']}")
        if vendor.get("annual_revenue"):
            lines.append(f"Annual Revenue: {vendor['annual_revenue']}")

        if vendor.get("registered_address"):
            lines.append(f"Registered/HQ Address: {vendor['registered_address']}")
        branches = vendor.get("branches", [])
        if branches and isinstance(branches, list):
            branch_strs = []
            for b in branches:
                if isinstance(b, dict):
                    name = b.get("name", "")
                    addr = b.get("address", "")
                    if name or addr:
                        branch_strs.append(f"{name}: {addr}" if name and addr else name or addr)
            if branch_strs:
                lines.append(f"Branch Offices: {'; '.join(branch_strs)}")

        lines.append(f"Capabilities: {vendor.get('capabilities', 'Not specified')}")
        lines.append(f"Past Performance: {vendor.get('past_performance', 'Not specified')}")
        lines.append(
            f"Socioeconomic Status: {vendor.get('socioeconomic_status', 'Not specified')}"
        )

        if vendor.get("sam_registration_status"):
            lines.append(f"SAM.gov Status: {vendor['sam_registration_status']}")
        if vendor.get("security_clearance_level"):
            lines.append(f"Facility Clearance: {vendor['security_clearance_level']}")
        if vendor.get("certifications"):
            certs = vendor["certifications"]
            if isinstance(certs, list):
                certs = ", ".join(certs)
            lines.append(f"Certifications: {certs}")
        if vendor.get("contract_vehicles"):
            cvs = vendor["contract_vehicles"]
            if isinstance(cvs, list):
                cvs = ", ".join(cvs)
            lines.append(f"Contract Vehicles: {cvs}")

        # About company / capability statement
        if vendor.get("about_company"):
            lines.append(f"About the Company: {vendor['about_company']}")
        if vendor.get("capability_statement"):
            lines.append(f"Capability Statement: {vendor['capability_statement']}")

        # Business classifications
        if vendor.get("business_classifications"):
            bc = vendor["business_classifications"]
            if isinstance(bc, list):
                bc = ", ".join(bc)
            lines.append(f"Business Classifications: {bc}")

        # Past performance records (structured)
        pp_records = vendor.get("past_performances", [])
        if pp_records and isinstance(pp_records, list):
            lines.append("\nPast Performance Records:")
            for i, pp in enumerate(pp_records, 1):
                if isinstance(pp, dict):
                    name = pp.get("contract_name") or pp.get("client_name", "N/A")
                    agency = pp.get("agency", "")
                    contract_num = pp.get("contract_number", "")
                    value = pp.get("contract_value", "")
                    staffing = pp.get("staffing_count", "")
                    start = pp.get("start_year", "")
                    end = pp.get("end_year", "")
                    desc = pp.get("description", "")
                    tags = pp.get("relevance_tags", "")
                    parts = [f"  {i}. {name}"]
                    if agency:
                        parts.append(f"     Agency: {agency}")
                    if contract_num:
                        parts.append(f"     Contract #: {contract_num}")
                    if value:
                        parts.append(f"     Value: {value}")
                    if start or end:
                        parts.append(f"     Period: {start} - {end}")
                    if staffing:
                        parts.append(f"     Staffing: {staffing}")
                    if desc:
                        parts.append(f"     Description: {desc}")
                    if tags:
                        parts.append(f"     Tags: {tags}")
                    lines.extend(parts)

        # Management team / key personnel
        for team_key, team_label in [
            ("management_team", "Management Team"),
            ("executive_team", "Executive Team"),
        ]:
            team = vendor.get(team_key, [])
            if team and isinstance(team, list):
                lines.append(f"\n{team_label}:")
                for i, member in enumerate(team, 1):
                    if isinstance(member, dict):
                        name = member.get("name", "N/A")
                        role = member.get("designation") or member.get("title", "N/A")
                        about = member.get("about") or member.get("bio", "")
                        lines.append(f"  {i}. {name} — {role}")
                        if about:
                            lines.append(f"     {about[:200]}")

        # Capability examples
        cap_examples = vendor.get("capability_examples", [])
        if cap_examples and isinstance(cap_examples, list):
            lines.append("\nCapability Examples:")
            for i, ex in enumerate(cap_examples, 1):
                if isinstance(ex, dict):
                    lines.append(f"  {i}. {ex.get('title', 'N/A')}: {ex.get('description', '')}")

        # Support both flat and nested contact info
        contact = vendor.get("contact_info", {})
        if contact:
            lines.append(f"Contact Name: {contact.get('name', 'N/A')}")
            lines.append(f"Contact Email: {contact.get('email', 'N/A')}")
            lines.append(f"Contact Phone: {contact.get('phone', 'N/A')}")
            lines.append(f"Address: {contact.get('address', 'N/A')}")
        else:
            if vendor.get("contact_name"):
                lines.append(f"Contact Name: {vendor['contact_name']}")
            if vendor.get("contact_email"):
                lines.append(f"Contact Email: {vendor['contact_email']}")
            if vendor.get("contact_phone"):
                lines.append(f"Contact Phone: {vendor['contact_phone']}")
            if vendor.get("contact_address"):
                lines.append(f"Address: {vendor['contact_address']}")

        return "\n".join(lines)

    @staticmethod
    def _build_opportunity_context(opportunity: Dict) -> str:
        """Format opportunity data into a readable context string."""
        lines = []
        lines.append(f"Opportunity Title: {opportunity.get('title', 'N/A')}")

        if opportunity.get("solicitation_number"):
            lines.append(f"Solicitation Number: {opportunity['solicitation_number']}")
        lines.append(f"Agency: {opportunity.get('agency', 'N/A')}")
        if opportunity.get("contracting_office"):
            lines.append(f"Contracting Office: {opportunity['contracting_office']}")
        if opportunity.get("set_aside_type"):
            lines.append(f"Set-Aside Type: {opportunity['set_aside_type']}")
        if opportunity.get("contract_type"):
            lines.append(f"Contract Type: {opportunity['contract_type']}")
        if opportunity.get("naics_code"):
            lines.append(f"NAICS Code: {opportunity['naics_code']}")
        if opportunity.get("place_of_performance"):
            lines.append(f"Place of Performance: {opportunity['place_of_performance']}")
        if opportunity.get("period_of_performance"):
            lines.append(f"Period of Performance: {opportunity['period_of_performance']}")
        if opportunity.get("estimated_value"):
            lines.append(f"Estimated Value: {opportunity['estimated_value']}")

        lines.append(f"Description: {opportunity.get('description', 'Not provided')}")
        lines.append(f"Requirements: {opportunity.get('requirements', 'Not provided')}")

        if opportunity.get("evaluation_criteria"):
            lines.append(f"Evaluation Criteria: {opportunity['evaluation_criteria']}")
        if opportunity.get("notice_id"):
            lines.append(f"Notice/Solicitation ID: {opportunity['notice_id']}")
        if opportunity.get("due_date"):
            lines.append(f"Response Due Date: {opportunity['due_date']}")
        if opportunity.get("type"):
            lines.append(f"Notice Type: {opportunity['type']}")

        return "\n".join(lines)