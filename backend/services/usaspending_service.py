"""
USASpending.gov API integration for searching federal contract awards.
Free public API - no API key required.
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta

import requests

logger = logging.getLogger(__name__)

USASPENDING_API_BASE = "https://api.usaspending.gov/api/v2"


class USASpendingService:
    """Service for searching federal contract awards via USASpending.gov API."""

    def search_awards(
        self,
        keyword: str,
        naics: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Search USASpending.gov for federal contract awards.

        Args:
            keyword: Search keyword(s).
            naics: Optional NAICS code filter.
            limit: Maximum results to return.

        Returns:
            List of award dicts with standardized fields.
        """
        url = f"{USASPENDING_API_BASE}/search/spending_by_award/"

        # Build filters
        filters = {
            "keywords": [keyword] if keyword else [],
            "award_type_codes": ["A", "B", "C", "D"],  # Contracts only
        }

        if naics:
            filters["naics_codes"] = {"require": [naics]}

        # Time filter - last 12 months
        now = datetime.now()
        one_year_ago = now - timedelta(days=365)
        filters["time_period"] = [{
            "start_date": one_year_ago.strftime("%Y-%m-%d"),
            "end_date": now.strftime("%Y-%m-%d"),
        }]

        payload = {
            "filters": filters,
            "fields": [
                "Award ID",
                "Recipient Name",
                "Description",
                "Start Date",
                "End Date",
                "Award Amount",
                "Awarding Agency",
                "Awarding Sub Agency",
                "Contract Award Type",
                "NAICS Code",
                "generated_internal_id",
            ],
            "limit": min(limit, 50),
            "page": 1,
            "sort": "Award Amount",
            "order": "desc",
        }

        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.Timeout:
            logger.error("USASpending API request timed out")
            raise ConnectionError("USASpending.gov API timed out. Please try again.")
        except requests.exceptions.HTTPError as exc:
            logger.error("USASpending API HTTP error: %s", exc)
            raise ConnectionError(f"USASpending.gov API error: {exc}")
        except requests.exceptions.RequestException as exc:
            logger.error("USASpending API request failed: %s", exc)
            raise ConnectionError(f"Failed to connect to USASpending.gov: {exc}")

        results = data.get("results", [])
        return [self._parse_award(award) for award in results]

    @staticmethod
    def _parse_award(raw: Dict) -> Dict:
        """Parse a USASpending award into standardized opportunity format."""
        amount = raw.get("Award Amount")
        amount_str = f"${amount:,.0f}" if amount else "N/A"

        return {
            "title": raw.get("Description", "Untitled Award")[:200],
            "agency": raw.get("Awarding Agency", raw.get("Awarding Sub Agency", "Unknown")),
            "due_date": raw.get("End Date"),
            "notice_id": raw.get("Award ID", ""),
            "description": (
                f"Award Amount: {amount_str}. "
                f"Recipient: {raw.get('Recipient Name', 'N/A')}. "
                f"Type: {raw.get('Contract Award Type', 'N/A')}. "
                f"NAICS: {raw.get('NAICS Code', 'N/A')}."
            ),
            "posted_date": raw.get("Start Date"),
            "type": "Award",
            "source": "USASpending.gov",
            "amount": amount_str,
        }
