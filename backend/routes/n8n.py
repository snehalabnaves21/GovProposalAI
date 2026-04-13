"""
N8N Workflow Integration API routes.

Endpoints for triggering N8N workflows, receiving webhook callbacks,
tracking workflow runs, and managing N8N configuration.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from db_models import (
    User,
    N8NWorkflowRun,
    Company,
    CompanyNAICS,
    NAICSCode,
    CompanyCompliance,
    ComplianceRequirement,
    ContractVehicle,
    Agency,
)
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic schemas ─────────────────────────────────────────────────

class TriggerWorkflowRequest(BaseModel):
    workflow_type: str = Field(..., description="Type: proposal_generation, compliance_check, gap_analysis")
    company_name: Optional[str] = None
    naics_code: Optional[str] = None
    agency: Optional[str] = None
    scope: Optional[str] = None
    n8n_webhook_url: Optional[str] = None


class N8NWebhookPayload(BaseModel):
    run_id: str
    execution_id: Optional[str] = None
    status: str = "completed"
    result: Optional[dict] = None
    error: Optional[str] = None


class N8NSettingsUpdate(BaseModel):
    webhook_url: Optional[str] = None
    api_key: Optional[str] = None
    enabled: Optional[bool] = None


# ── In-memory N8N settings (per-user would be in DB in production) ───

_n8n_settings = {
    "webhook_url": "",
    "api_key": "",
    "enabled": True,
}


# ── Helper: gather company context for AI workflows ──────────────────

async def _gather_company_context(user_id: str, db: AsyncSession) -> dict:
    """Pull company profile, NAICS codes, and compliance status for the workflow."""
    context = {
        "company": None,
        "naics_codes": [],
        "compliance_status": [],
        "missing_requirements": [],
    }

    # Company profile
    result = await db.execute(select(Company).where(Company.user_id == user_id))
    company = result.scalar_one_or_none()
    if company:
        context["company"] = {
            "name": company.name,
            "uei_number": company.uei_number,
            "sam_registered": company.sam_registered,
            "business_type": company.business_type,
        }

        # NAICS codes
        naics_result = await db.execute(
            select(NAICSCode, CompanyNAICS)
            .join(CompanyNAICS, CompanyNAICS.naics_id == NAICSCode.id)
            .where(CompanyNAICS.company_id == company.id)
        )
        for naics, cn in naics_result.all():
            context["naics_codes"].append({
                "code": naics.code,
                "title": naics.title,
                "is_primary": cn.is_primary,
            })

        # Compliance statuses
        comp_result = await db.execute(
            select(ComplianceRequirement, CompanyCompliance)
            .outerjoin(
                CompanyCompliance,
                (CompanyCompliance.requirement_id == ComplianceRequirement.id)
                & (CompanyCompliance.company_id == company.id),
            )
        )
        for req, cc in comp_result.all():
            st = cc.status if cc else "not_started"
            context["compliance_status"].append({
                "requirement": req.name,
                "category": req.category,
                "mandatory": req.mandatory,
                "status": st,
            })
            if st != "compliant":
                context["missing_requirements"].append(req.name)

    return context


# ── Workflow templates ────────────────────────────────────────────────

def _build_workflow_json(workflow_type: str, input_data: dict, callback_url: str) -> dict:
    """Build an N8N-importable workflow JSON for the given type."""

    base_api_url = "{{$credentials.govproposalApiUrl}}"

    if workflow_type == "proposal_generation":
        return {
            "name": "GovCon AI Proposal Generation",
            "nodes": [
                {
                    "parameters": {},
                    "id": "webhook-trigger",
                    "name": "Webhook Trigger",
                    "type": "n8n-nodes-base.webhook",
                    "typeVersion": 1.1,
                    "position": [100, 300],
                    "webhookId": "govcon-proposal-trigger",
                },
                {
                    "parameters": {
                        "values": {
                            "string": [
                                {"name": "company_name", "value": input_data.get("company_name", "")},
                                {"name": "naics_code", "value": input_data.get("naics_code", "")},
                                {"name": "agency", "value": input_data.get("agency", "")},
                                {"name": "scope", "value": input_data.get("scope", "")},
                                {"name": "run_id", "value": input_data.get("run_id", "")},
                            ]
                        }
                    },
                    "id": "set-input",
                    "name": "Set Input Data",
                    "type": "n8n-nodes-base.set",
                    "typeVersion": 2,
                    "position": [300, 300],
                },
                {
                    "parameters": {
                        "url": f"{base_api_url}/api/compliance/naics/{{{{$json.naics_code}}}}",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                        "sendHeaders": True,
                        "headerParameters": {
                            "parameters": [{"name": "Authorization", "value": "Bearer {{$credentials.govproposalToken}}"}]
                        },
                    },
                    "id": "fetch-naics",
                    "name": "Fetch NAICS & Compliance",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [500, 200],
                },
                {
                    "parameters": {
                        "url": f"{base_api_url}/api/compliance/company/check",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                        "sendHeaders": True,
                        "headerParameters": {
                            "parameters": [{"name": "Authorization", "value": "Bearer {{$credentials.govproposalToken}}"}]
                        },
                    },
                    "id": "fetch-compliance",
                    "name": "Fetch Compliance Status",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [500, 400],
                },
                {
                    "parameters": {
                        "mode": "combine",
                        "combineBy": "combineAll",
                    },
                    "id": "merge-data",
                    "name": "Merge NAICS + Compliance",
                    "type": "n8n-nodes-base.merge",
                    "typeVersion": 3,
                    "position": [700, 300],
                },
                {
                    "parameters": {
                        "model": "gpt-4o-mini",
                        "messages": {
                            "values": [
                                {
                                    "role": "system",
                                    "content": "You are a GovCon compliance advisor. Analyze the compliance data and identify gaps, risks, and recommendations."
                                },
                                {
                                    "role": "user",
                                    "content": "Company: {{$json.company_name}}\nNAICS: {{$json.naics_code}}\nAgency: {{$json.agency}}\nCompliance Status: {{JSON.stringify($json.compliance_status)}}\n\nProvide a compliance gap analysis with specific actionable recommendations."
                                },
                            ]
                        },
                    },
                    "id": "ai-gap-analysis",
                    "name": "AI Compliance Gap Analysis",
                    "type": "@n8n/n8n-nodes-langchain.openAi",
                    "typeVersion": 1.4,
                    "position": [900, 200],
                },
                {
                    "parameters": {
                        "model": "gpt-4o-mini",
                        "messages": {
                            "values": [
                                {
                                    "role": "system",
                                    "content": "You are an expert federal proposal writer specializing in government contracts. Generate professional, compliant proposal sections."
                                },
                                {
                                    "role": "user",
                                    "content": "Generate a complete government contract proposal for:\n\nCompany: {{$json.company_name}}\nNAICS: {{$json.naics_code}}\nAgency: {{$json.agency}}\nScope: {{$json.scope}}\nCompliance Requirements: {{JSON.stringify($json.compliance_status)}}\n\nInclude sections: Executive Summary, Technical Approach, Management Plan, Past Performance, Compliance Statement."
                                },
                            ]
                        },
                    },
                    "id": "ai-proposal",
                    "name": "AI Proposal Generator",
                    "type": "@n8n/n8n-nodes-langchain.openAi",
                    "typeVersion": 1.4,
                    "position": [900, 400],
                },
                {
                    "parameters": {
                        "mode": "combine",
                        "combineBy": "combineAll",
                    },
                    "id": "merge-ai",
                    "name": "Merge AI Results",
                    "type": "n8n-nodes-base.merge",
                    "typeVersion": 3,
                    "position": [1100, 300],
                },
                {
                    "parameters": {
                        "model": "gpt-4o-mini",
                        "messages": {
                            "values": [
                                {
                                    "role": "system",
                                    "content": "You are a federal compliance auditor. Review the proposal and verify it meets all compliance requirements."
                                },
                                {
                                    "role": "user",
                                    "content": "Review this proposal for compliance:\n\nProposal: {{$json.proposal}}\nGap Analysis: {{$json.gap_analysis}}\nRequired Compliance: {{JSON.stringify($json.compliance_status)}}\n\nProvide a compliance score (0-100), list any violations, and suggest corrections."
                                },
                            ]
                        },
                    },
                    "id": "ai-audit",
                    "name": "Final Compliance Audit",
                    "type": "@n8n/n8n-nodes-langchain.openAi",
                    "typeVersion": 1.4,
                    "position": [1300, 300],
                },
                {
                    "parameters": {
                        "url": callback_url,
                        "method": "POST",
                        "sendBody": True,
                        "bodyParameters": {
                            "parameters": [
                                {"name": "run_id", "value": "={{$json.run_id}}"},
                                {"name": "status", "value": "completed"},
                                {"name": "result", "value": "={{JSON.stringify({proposal: $json.proposal, gap_analysis: $json.gap_analysis, compliance_audit: $json.audit, score: $json.score})}}"},
                            ]
                        },
                    },
                    "id": "callback",
                    "name": "Send Results Back",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [1500, 300],
                },
            ],
            "connections": {
                "Webhook Trigger": {"main": [[{"node": "Set Input Data", "type": "main", "index": 0}]]},
                "Set Input Data": {"main": [[{"node": "Fetch NAICS & Compliance", "type": "main", "index": 0}, {"node": "Fetch Compliance Status", "type": "main", "index": 0}]]},
                "Fetch NAICS & Compliance": {"main": [[{"node": "Merge NAICS + Compliance", "type": "main", "index": 0}]]},
                "Fetch Compliance Status": {"main": [[{"node": "Merge NAICS + Compliance", "type": "main", "index": 1}]]},
                "Merge NAICS + Compliance": {"main": [[{"node": "AI Compliance Gap Analysis", "type": "main", "index": 0}, {"node": "AI Proposal Generator", "type": "main", "index": 0}]]},
                "AI Compliance Gap Analysis": {"main": [[{"node": "Merge AI Results", "type": "main", "index": 0}]]},
                "AI Proposal Generator": {"main": [[{"node": "Merge AI Results", "type": "main", "index": 1}]]},
                "Merge AI Results": {"main": [[{"node": "Final Compliance Audit", "type": "main", "index": 0}]]},
                "Final Compliance Audit": {"main": [[{"node": "Send Results Back", "type": "main", "index": 0}]]},
            },
        }

    elif workflow_type == "compliance_check":
        return {
            "name": "GovCon Compliance Check",
            "nodes": [
                {
                    "parameters": {},
                    "id": "webhook-trigger",
                    "name": "Webhook Trigger",
                    "type": "n8n-nodes-base.webhook",
                    "typeVersion": 1.1,
                    "position": [100, 300],
                },
                {
                    "parameters": {
                        "url": f"{base_api_url}/api/compliance/company/check",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                    },
                    "id": "fetch-check",
                    "name": "Run Compliance Check",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [300, 300],
                },
                {
                    "parameters": {
                        "model": "gpt-4o-mini",
                        "messages": {
                            "values": [
                                {"role": "system", "content": "You are a GovCon compliance advisor."},
                                {"role": "user", "content": "Analyze compliance check results and provide detailed recommendations:\n\n{{JSON.stringify($json)}}"},
                            ]
                        },
                    },
                    "id": "ai-analyze",
                    "name": "AI Analysis",
                    "type": "@n8n/n8n-nodes-langchain.openAi",
                    "typeVersion": 1.4,
                    "position": [500, 300],
                },
                {
                    "parameters": {
                        "url": callback_url,
                        "method": "POST",
                        "sendBody": True,
                        "bodyParameters": {
                            "parameters": [
                                {"name": "run_id", "value": input_data.get("run_id", "")},
                                {"name": "status", "value": "completed"},
                                {"name": "result", "value": "={{JSON.stringify($json)}}"},
                            ]
                        },
                    },
                    "id": "callback",
                    "name": "Send Results",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [700, 300],
                },
            ],
            "connections": {
                "Webhook Trigger": {"main": [[{"node": "Run Compliance Check", "type": "main", "index": 0}]]},
                "Run Compliance Check": {"main": [[{"node": "AI Analysis", "type": "main", "index": 0}]]},
                "AI Analysis": {"main": [[{"node": "Send Results", "type": "main", "index": 0}]]},
            },
        }

    elif workflow_type == "gap_analysis":
        return {
            "name": "GovCon Gap Analysis",
            "nodes": [
                {
                    "parameters": {},
                    "id": "webhook-trigger",
                    "name": "Webhook Trigger",
                    "type": "n8n-nodes-base.webhook",
                    "typeVersion": 1.1,
                    "position": [100, 300],
                },
                {
                    "parameters": {
                        "url": f"{base_api_url}/api/compliance/company",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                    },
                    "id": "fetch-company",
                    "name": "Fetch Company Profile",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [300, 200],
                },
                {
                    "parameters": {
                        "url": f"{base_api_url}/api/compliance/company/recommendations",
                        "authentication": "genericCredentialType",
                        "genericAuthType": "httpHeaderAuth",
                    },
                    "id": "fetch-recs",
                    "name": "Fetch Recommendations",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [300, 400],
                },
                {
                    "parameters": {
                        "mode": "combine",
                        "combineBy": "combineAll",
                    },
                    "id": "merge",
                    "name": "Merge Data",
                    "type": "n8n-nodes-base.merge",
                    "typeVersion": 3,
                    "position": [500, 300],
                },
                {
                    "parameters": {
                        "model": "gpt-4o-mini",
                        "messages": {
                            "values": [
                                {"role": "system", "content": "You are a GovCon strategy advisor specializing in federal contract readiness assessment."},
                                {"role": "user", "content": "Perform a comprehensive gap analysis:\n\nCompany: {{JSON.stringify($json.company)}}\nRecommendations: {{JSON.stringify($json.recommendations)}}\n\nProvide: 1) Current readiness score, 2) Critical gaps, 3) 90-day action plan, 4) Contract vehicle priority list"},
                            ]
                        },
                    },
                    "id": "ai-gap",
                    "name": "AI Gap Analysis",
                    "type": "@n8n/n8n-nodes-langchain.openAi",
                    "typeVersion": 1.4,
                    "position": [700, 300],
                },
                {
                    "parameters": {
                        "url": callback_url,
                        "method": "POST",
                        "sendBody": True,
                        "bodyParameters": {
                            "parameters": [
                                {"name": "run_id", "value": input_data.get("run_id", "")},
                                {"name": "status", "value": "completed"},
                                {"name": "result", "value": "={{JSON.stringify($json)}}"},
                            ]
                        },
                    },
                    "id": "callback",
                    "name": "Send Results",
                    "type": "n8n-nodes-base.httpRequest",
                    "typeVersion": 4.2,
                    "position": [900, 300],
                },
            ],
            "connections": {
                "Webhook Trigger": {"main": [[{"node": "Fetch Company Profile", "type": "main", "index": 0}, {"node": "Fetch Recommendations", "type": "main", "index": 0}]]},
                "Fetch Company Profile": {"main": [[{"node": "Merge Data", "type": "main", "index": 0}]]},
                "Fetch Recommendations": {"main": [[{"node": "Merge Data", "type": "main", "index": 1}]]},
                "Merge Data": {"main": [[{"node": "AI Gap Analysis", "type": "main", "index": 0}]]},
                "AI Gap Analysis": {"main": [[{"node": "Send Results", "type": "main", "index": 0}]]},
            },
        }

    return {"name": "Unknown Workflow", "nodes": [], "connections": {}}


# ── Built-in AI simulation (runs without N8N) ────────────────────────

async def _run_builtin_workflow(run: N8NWorkflowRun, db: AsyncSession):
    """Simulate the workflow using built-in AI service when N8N is not connected."""
    import json
    from datetime import datetime, timezone

    input_data = json.loads(run.input_data) if run.input_data else {}
    context = await _gather_company_context(run.user_id, db)

    company_name = input_data.get("company_name") or (context["company"]["name"] if context["company"] else "Your Company")
    naics_codes = context["naics_codes"]
    compliance = context["compliance_status"]
    missing = context["missing_requirements"]

    if run.workflow_type == "proposal_generation":
        result = {
            "proposal": {
                "executive_summary": f"Proposal for {company_name} targeting {input_data.get('agency', 'federal agency')}. "
                    f"Scope: {input_data.get('scope', 'IT services')}. "
                    f"Primary NAICS: {input_data.get('naics_code', naics_codes[0]['code'] if naics_codes else 'N/A')}.",
                "technical_approach": f"Our technical approach leverages proven methodologies across {len(naics_codes)} NAICS domains. "
                    "We implement industry best practices with continuous improvement cycles.",
                "management_plan": "Our management structure ensures accountability with dedicated program managers, "
                    "quality assurance processes, and regular stakeholder communication.",
                "compliance_statement": f"We maintain {len([c for c in compliance if c['status'] == 'compliant'])} active compliance certifications. "
                    f"{len(missing)} requirements need attention before submission.",
            },
            "gap_analysis": {
                "compliant_count": len([c for c in compliance if c["status"] == "compliant"]),
                "in_progress_count": len([c for c in compliance if c["status"] == "in_progress"]),
                "missing_count": len(missing),
                "missing_requirements": missing[:10],
                "risk_level": "Low" if len(missing) == 0 else "Medium" if len(missing) <= 3 else "High",
            },
            "compliance_audit": {
                "score": max(0, 100 - (len(missing) * 8)),
                "passed": len(missing) == 0,
                "violations": [f"Missing: {r}" for r in missing[:5]],
                "recommendations": [
                    "Complete all mandatory compliance requirements before submission",
                    "Update SAM.gov registration if expired",
                    "Verify NAICS code alignment with opportunity requirements",
                ],
            },
        }
    elif run.workflow_type == "compliance_check":
        compliant = [c for c in compliance if c["status"] == "compliant"]
        in_progress = [c for c in compliance if c["status"] == "in_progress"]
        result = {
            "compliance_check": {
                "total_requirements": len(compliance),
                "compliant": len(compliant),
                "in_progress": len(in_progress),
                "not_started": len(missing),
                "score": round((len(compliant) / max(len(compliance), 1)) * 100),
                "details": compliance[:15],
            },
            "ai_analysis": {
                "summary": f"{company_name} has {len(compliant)} compliant, {len(in_progress)} in-progress, and {len(missing)} missing requirements.",
                "critical_gaps": [r for r in missing if any(c["mandatory"] and c["requirement"] == r for c in compliance)][:5],
                "recommendations": [
                    "Prioritize mandatory requirements that are not started",
                    "Set target dates for in-progress items",
                    "Consider third-party compliance consulting for complex requirements",
                ],
            },
        }
    elif run.workflow_type == "gap_analysis":
        result = {
            "gap_analysis": {
                "readiness_score": max(0, 100 - (len(missing) * 6)),
                "critical_gaps": missing[:5],
                "total_gaps": len(missing),
                "naics_coverage": len(naics_codes),
            },
            "action_plan": {
                "30_day": [
                    "Complete SAM.gov registration verification",
                    "Begin CMMC Level 2 assessment if applicable",
                    "Gather past performance documentation",
                ],
                "60_day": [
                    "Submit pending compliance certifications",
                    "Develop capability statement",
                    "Identify teaming partners for large contracts",
                ],
                "90_day": [
                    "Complete all mandatory compliance items",
                    "Begin monitoring SAM.gov for matching opportunities",
                    "Prepare proposal templates for target vehicles",
                ],
            },
            "recommended_vehicles": [
                {"name": "GSA MAS", "priority": "High", "reason": "Broad scope, suitable for IT services"},
                {"name": "OASIS", "priority": "Medium", "reason": "Good for consulting and professional services"},
            ],
        }
    else:
        result = {"error": "Unknown workflow type"}

    run.status = "completed"
    run.result_data = json.dumps(result)
    run.completed_at = datetime.now(timezone.utc)
    await db.commit()

    return result


# ── API Endpoints ─────────────────────────────────────────────────────

@router.get("/settings")
async def get_n8n_settings(current_user: User = Depends(get_current_user)):
    """Get N8N integration settings."""
    return {
        "webhook_url": _n8n_settings["webhook_url"],
        "api_key": "****" if _n8n_settings["api_key"] else "",
        "enabled": _n8n_settings["enabled"],
        "connected": bool(_n8n_settings["webhook_url"]),
    }


@router.put("/settings")
async def update_n8n_settings(
    settings: N8NSettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update N8N integration settings."""
    if settings.webhook_url is not None:
        _n8n_settings["webhook_url"] = settings.webhook_url
    if settings.api_key is not None:
        _n8n_settings["api_key"] = settings.api_key
    if settings.enabled is not None:
        _n8n_settings["enabled"] = settings.enabled

    return {"message": "Settings updated", **_n8n_settings}


@router.post("/trigger")
async def trigger_workflow(
    req: TriggerWorkflowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an N8N workflow or run built-in simulation."""
    valid_types = ["proposal_generation", "compliance_check", "gap_analysis"]
    if req.workflow_type not in valid_types:
        raise HTTPException(400, f"Invalid workflow_type. Must be one of: {valid_types}")

    # Create workflow run record
    run = N8NWorkflowRun(
        user_id=current_user.id,
        workflow_type=req.workflow_type,
        status="running",
        input_data=json.dumps({
            "company_name": req.company_name or "",
            "naics_code": req.naics_code or "",
            "agency": req.agency or "",
            "scope": req.scope or "",
        }),
        started_at=datetime.now(timezone.utc),
    )
    db.add(run)
    await db.flush()

    run_id = run.id

    # Check if N8N webhook is configured
    webhook_url = req.n8n_webhook_url or _n8n_settings.get("webhook_url")

    if webhook_url and _n8n_settings.get("enabled"):
        # Trigger external N8N workflow via webhook
        import httpx

        input_data = json.loads(run.input_data)
        input_data["run_id"] = run_id

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(webhook_url, json=input_data)
                if resp.status_code in (200, 201):
                    run.n8n_execution_id = resp.json().get("executionId", "")
                    await db.commit()
                    return {
                        "run_id": run_id,
                        "status": "running",
                        "mode": "n8n",
                        "message": "Workflow triggered in N8N. Results will arrive via webhook.",
                    }
                else:
                    logger.warning("N8N webhook returned %s: %s", resp.status_code, resp.text)
                    # Fall back to built-in
        except Exception as e:
            logger.warning("N8N webhook failed: %s. Falling back to built-in.", e)

    # Run built-in simulation
    result = await _run_builtin_workflow(run, db)

    return {
        "run_id": run_id,
        "status": "completed",
        "mode": "built-in",
        "message": "Workflow completed using built-in AI engine.",
        "result": result,
    }


@router.post("/webhook")
async def n8n_webhook_callback(
    payload: N8NWebhookPayload,
    db: AsyncSession = Depends(get_db),
):
    """Receive results from N8N workflow execution (no auth - called by N8N)."""
    result = await db.execute(
        select(N8NWorkflowRun).where(N8NWorkflowRun.id == payload.run_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Workflow run not found")

    run.status = payload.status
    if payload.execution_id:
        run.n8n_execution_id = payload.execution_id
    if payload.result:
        run.result_data = json.dumps(payload.result)
    if payload.error:
        run.error_message = payload.error
        run.status = "failed"
    run.completed_at = datetime.now(timezone.utc)

    await db.commit()

    return {"message": "Result received", "run_id": payload.run_id, "status": run.status}


@router.get("/runs")
async def list_workflow_runs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
):
    """List recent workflow runs for the current user."""
    result = await db.execute(
        select(N8NWorkflowRun)
        .where(N8NWorkflowRun.user_id == current_user.id)
        .order_by(desc(N8NWorkflowRun.created_at))
        .limit(limit)
    )
    runs = result.scalars().all()

    return [
        {
            "id": r.id,
            "workflow_type": r.workflow_type,
            "status": r.status,
            "mode": "n8n" if r.n8n_execution_id else "built-in",
            "input_data": json.loads(r.input_data) if r.input_data else None,
            "has_result": bool(r.result_data),
            "error_message": r.error_message,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in runs
    ]


@router.get("/runs/{run_id}")
async def get_workflow_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific workflow run including results."""
    result = await db.execute(
        select(N8NWorkflowRun).where(
            N8NWorkflowRun.id == run_id,
            N8NWorkflowRun.user_id == current_user.id,
        )
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Workflow run not found")

    return {
        "id": run.id,
        "workflow_type": run.workflow_type,
        "status": run.status,
        "mode": "n8n" if run.n8n_execution_id else "built-in",
        "input_data": json.loads(run.input_data) if run.input_data else None,
        "result_data": json.loads(run.result_data) if run.result_data else None,
        "error_message": run.error_message,
        "n8n_execution_id": run.n8n_execution_id,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


@router.delete("/runs/{run_id}")
async def delete_workflow_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a workflow run."""
    result = await db.execute(
        select(N8NWorkflowRun).where(
            N8NWorkflowRun.id == run_id,
            N8NWorkflowRun.user_id == current_user.id,
        )
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(404, "Workflow run not found")

    await db.delete(run)
    await db.commit()
    return {"message": "Run deleted"}


@router.get("/workflows")
async def get_available_workflows(current_user: User = Depends(get_current_user)):
    """Get list of available N8N workflow templates."""
    return [
        {
            "id": "proposal_generation",
            "name": "AI Proposal Generation",
            "description": "Generate a complete government contract proposal with compliance gap analysis and audit",
            "icon": "document",
            "steps": [
                "Fetch NAICS & compliance data",
                "AI compliance gap analysis",
                "AI proposal generation (parallel)",
                "Final compliance audit",
            ],
        },
        {
            "id": "compliance_check",
            "name": "Compliance Check",
            "description": "Run a comprehensive compliance check with AI-powered analysis and recommendations",
            "icon": "shield",
            "steps": [
                "Fetch current compliance status",
                "AI analysis of gaps and risks",
                "Generate prioritized recommendations",
            ],
        },
        {
            "id": "gap_analysis",
            "name": "Gap Analysis & Action Plan",
            "description": "Analyze compliance gaps and generate a 90-day action plan with contract vehicle recommendations",
            "icon": "chart",
            "steps": [
                "Fetch company profile & recommendations",
                "AI gap analysis",
                "Generate 30/60/90-day action plan",
                "Prioritize contract vehicles",
            ],
        },
    ]


@router.get("/workflows/{workflow_type}/export")
async def export_workflow_json(
    workflow_type: str,
    current_user: User = Depends(get_current_user),
):
    """Export an N8N workflow JSON for direct import into N8N."""
    valid_types = ["proposal_generation", "compliance_check", "gap_analysis"]
    if workflow_type not in valid_types:
        raise HTTPException(400, f"Invalid workflow_type. Must be one of: {valid_types}")

    callback_url = "YOUR_GOVPROPOSAL_URL/api/n8n/webhook"
    input_data = {"run_id": "{{$json.run_id}}"}

    workflow = _build_workflow_json(workflow_type, input_data, callback_url)

    return {
        "workflow": workflow,
        "instructions": {
            "step_1": "Open N8N and go to Workflows > Import from JSON",
            "step_2": "Paste the workflow JSON above",
            "step_3": "Update credential placeholders: govproposalApiUrl and govproposalToken",
            "step_4": f"Set the callback URL to your GovProposal instance + /api/n8n/webhook",
            "step_5": "Activate the workflow",
        },
    }
