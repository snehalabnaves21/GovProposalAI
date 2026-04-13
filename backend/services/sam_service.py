"""
SAM.gov API integration service for searching federal contract opportunities.
"""

import os
import logging
from typing import Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

SAM_API_BASE_URL = "https://api.sam.gov/opportunities/v2/search"


class SAMService:
    """Service for interacting with the SAM.gov Opportunities API."""

    def __init__(self) -> None:
        raw_key = os.getenv("SAM_API_KEY", "").strip()
        # Treat "demo_mode" or empty as no key
        self.api_key: str = "" if raw_key.lower() in ("", "demo_mode", "demo") else raw_key
        if not self.api_key:
            logger.warning(
                "SAM_API_KEY not set or set to demo_mode. "
                "Real SAM.gov searches require a valid API key from api.data.gov. "
                "Using demo opportunities for now."
            )

    def search_opportunities(
        self,
        keyword: str,
        naics: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Search SAM.gov for contract opportunities.

        Args:
            keyword: Search keyword(s) for opportunity titles/descriptions.
            naics: Optional NAICS code to filter results.
            limit: Maximum number of results to return (default 10).

        Returns:
            List of opportunity dicts with standardized fields.
        """
        if not self.api_key:
            logger.info("SAM_API_KEY not set — returning demo opportunities")
            return self._get_demo_opportunities(keyword, naics, limit)

        params: Dict = {
            "api_key": self.api_key,
            "keyword": keyword,
            "limit": min(limit, 100),
            "postedFrom": "",
            "postedTo": "",
        }

        if naics:
            params["ncode"] = naics

        try:
            response = requests.get(
                SAM_API_BASE_URL,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.Timeout:
            logger.error("SAM.gov API request timed out")
            raise ConnectionError("SAM.gov API request timed out. Please try again.")
        except requests.exceptions.HTTPError as exc:
            logger.error("SAM.gov API HTTP error: %s", exc)
            raise ConnectionError(f"SAM.gov API error: {exc}")
        except requests.exceptions.RequestException as exc:
            logger.error("SAM.gov API request failed: %s", exc)
            raise ConnectionError(f"Failed to connect to SAM.gov API: {exc}")

        opportunities_data = data.get("opportunitiesData", [])
        if not opportunities_data:
            return []

        return [self._parse_opportunity(opp) for opp in opportunities_data]

    @staticmethod
    def _get_demo_opportunities(keyword: Optional[str], naics: Optional[str], limit: int) -> List[Dict]:
        """Return realistic demo opportunities when no SAM API key is configured."""
        demo_data = [
            {
                "title": "Enterprise IT Modernization Services",
                "agency": "Department of Defense / Defense Information Systems Agency",
                "due_date": "2026-04-15",
                "notice_id": "W91CRB-26-R-0042",
                "description": "Seeking contractor to modernize legacy IT infrastructure, migrate to cloud, and implement zero-trust architecture across DoD networks.",
                "posted_date": "2026-03-01",
                "type": "Solicitation",
                "naics_code": "541512",
            },
            {
                "title": "Cybersecurity Operations Center Support",
                "agency": "Department of Homeland Security / CISA",
                "due_date": "2026-04-20",
                "notice_id": "70CDCR26R00000015",
                "description": "24/7 Security Operations Center staffing, threat intelligence, incident response, and vulnerability management services.",
                "posted_date": "2026-03-05",
                "type": "Solicitation",
                "naics_code": "541519",
            },
            {
                "title": "Cloud Migration and Managed Services",
                "agency": "General Services Administration / Federal Acquisition Service",
                "due_date": "2026-05-01",
                "notice_id": "47QTCA26R0003",
                "description": "AWS GovCloud and Azure Government migration services including architecture design, data migration, and ongoing managed services.",
                "posted_date": "2026-03-10",
                "type": "Presolicitation",
                "naics_code": "541512",
            },
            {
                "title": "Data Analytics and Business Intelligence Platform",
                "agency": "Department of Health and Human Services / CMS",
                "due_date": "2026-04-30",
                "notice_id": "75FCMC26R00000008",
                "description": "Development and maintenance of enterprise data analytics platform for healthcare data processing, reporting, and predictive analytics.",
                "posted_date": "2026-03-08",
                "type": "Solicitation",
                "naics_code": "541511",
            },
            {
                "title": "Software Development and DevSecOps Services",
                "agency": "Department of Veterans Affairs / OIT",
                "due_date": "2026-05-15",
                "notice_id": "36C10X26R0005",
                "description": "Agile software development, CI/CD pipeline management, and DevSecOps implementation for veteran-facing digital services.",
                "posted_date": "2026-03-12",
                "type": "Sources Sought",
                "naics_code": "541511",
            },
            {
                "title": "Artificial Intelligence and Machine Learning Services",
                "agency": "Department of Defense / Joint Artificial Intelligence Center",
                "due_date": "2026-05-20",
                "notice_id": "W56HZV-26-R-0089",
                "description": "AI/ML solution development including NLP, computer vision, and predictive modeling for defense applications.",
                "posted_date": "2026-03-11",
                "type": "Solicitation",
                "naics_code": "541715",
            },
            {
                "title": "IT Help Desk and End User Support Services",
                "agency": "Department of Education / OCIO",
                "due_date": "2026-04-25",
                "notice_id": "ED-IES-26-R-0012",
                "description": "Tier 1-3 IT support services, asset management, and end-user training for 15,000+ government employees.",
                "posted_date": "2026-03-07",
                "type": "Solicitation",
                "naics_code": "541513",
            },
            {
                "title": "Network Infrastructure Modernization",
                "agency": "Department of Justice / FBI",
                "due_date": "2026-05-10",
                "notice_id": "15F06726R0000034",
                "description": "Upgrade and modernize network infrastructure including SD-WAN deployment, 5G integration, and network security enhancements.",
                "posted_date": "2026-03-09",
                "type": "Presolicitation",
                "naics_code": "541512",
            },
        ]

        # Filter by keyword if provided
        if keyword:
            kw_lower = keyword.lower()
            demo_data = [o for o in demo_data if kw_lower in o["title"].lower() or kw_lower in o["description"].lower()]

        # Filter by NAICS code
        if naics:
            demo_data = [o for o in demo_data if o.get("naics_code", "").startswith(naics)]

        return demo_data[:limit]

    @staticmethod
    def _parse_opportunity(raw: Dict) -> Dict:
        """Parse a raw SAM.gov opportunity record into a standardized dict."""
        return {
            "title": raw.get("title", "Untitled"),
            "agency": raw.get("fullParentPathName", raw.get("departmentName", "Unknown Agency")),
            "due_date": raw.get("responseDeadLine", raw.get("archiveDate", None)),
            "notice_id": raw.get("noticeId", raw.get("solicitationNumber", None)),
            "description": raw.get("description", raw.get("additionalInfoLink", "")),
            "posted_date": raw.get("postedDate", None),
            "type": raw.get("type", raw.get("noticeType", None)),
        }
