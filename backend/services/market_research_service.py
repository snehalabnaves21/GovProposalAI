"""
Market Research & Pricing Intelligence Service.

Fetches labor rate data and competitor award data from USASpending.gov,
then generates AI-powered pricing recommendations for government proposals.
"""

import logging
import statistics
from typing import Dict, List, Optional
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

USASPENDING_API_BASE = "https://api.usaspending.gov/api/v2"

# Realistic government contracting labor rate ranges by category ($/hr).
# Used as fallback benchmarks and to validate parsed data.
GSA_LABOR_RATE_BENCHMARKS: Dict[str, Dict[str, float]] = {
    "software engineer": {"min": 85, "max": 250, "median": 145},
    "software developer": {"min": 80, "max": 240, "median": 140},
    "systems engineer": {"min": 90, "max": 260, "median": 155},
    "project manager": {"min": 95, "max": 275, "median": 160},
    "program manager": {"min": 110, "max": 310, "median": 185},
    "data scientist": {"min": 100, "max": 280, "median": 165},
    "cybersecurity analyst": {"min": 90, "max": 265, "median": 155},
    "network engineer": {"min": 80, "max": 230, "median": 135},
    "database administrator": {"min": 75, "max": 220, "median": 130},
    "business analyst": {"min": 75, "max": 210, "median": 125},
    "technical writer": {"min": 55, "max": 150, "median": 90},
    "help desk": {"min": 35, "max": 85, "median": 55},
    "system administrator": {"min": 70, "max": 200, "median": 120},
    "cloud architect": {"min": 120, "max": 320, "median": 195},
    "devops engineer": {"min": 95, "max": 270, "median": 160},
    "data engineer": {"min": 90, "max": 260, "median": 150},
    "ux designer": {"min": 70, "max": 200, "median": 120},
    "scrum master": {"min": 85, "max": 220, "median": 135},
    "quality assurance": {"min": 65, "max": 180, "median": 110},
    "subject matter expert": {"min": 100, "max": 350, "median": 200},
}

# Standard overhead / wrap rates for government contracts
WRAP_RATE_RANGES = {
    "small_business": {"overhead": 1.5, "g_and_a": 1.15, "profit": 1.08},
    "large_business": {"overhead": 1.8, "g_and_a": 1.20, "profit": 1.10},
}

# Typical labor hours per contract dollar for IT services
HOURS_PER_DOLLAR_ESTIMATE = 1 / 135  # ~$135/hr average blended rate


class MarketResearchService:
    """Service for market research, competitor analysis, and pricing intelligence."""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the shared httpx async client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ------------------------------------------------------------------
    # Labor Rate Intelligence
    # ------------------------------------------------------------------

    async def search_labor_rates(
        self,
        labor_category: str,
        naics_code: Optional[str] = None,
        location: Optional[str] = None,
    ) -> Dict:
        """
        Search for labor rate intelligence for a given labor category.

        Combines USASpending.gov award data with GSA benchmark rates to
        produce actionable rate guidance.

        Args:
            labor_category: Labor category to search (e.g. "Software Engineer").
            naics_code: Optional NAICS code filter (e.g. "541512").
            location: Optional location filter (state or city).

        Returns:
            Dict with rate_summary, source_awards, benchmark, and recommendations.
        """
        awards = await self._fetch_awards_for_labor(
            labor_category, naics_code, location
        )

        # Estimate hourly rates from award data
        estimated_rates = self._estimate_rates_from_awards(awards, labor_category)

        # Get GSA benchmark for this category
        benchmark = self._get_benchmark(labor_category)

        # Combine estimated rates with benchmark data
        all_rates = estimated_rates[:]
        if benchmark:
            all_rates.extend([benchmark["min"], benchmark["median"], benchmark["max"]])

        if all_rates:
            avg_rate = round(statistics.mean(all_rates), 2)
            min_rate = round(min(all_rates), 2)
            max_rate = round(max(all_rates), 2)
            median_rate = round(statistics.median(all_rates), 2)
        else:
            avg_rate = min_rate = max_rate = median_rate = 0

        return {
            "labor_category": labor_category,
            "filters": {
                "naics_code": naics_code,
                "location": location,
            },
            "rate_summary": {
                "average_hourly_rate": avg_rate,
                "min_hourly_rate": min_rate,
                "max_hourly_rate": max_rate,
                "median_hourly_rate": median_rate,
                "currency": "USD",
                "data_points": len(all_rates),
            },
            "benchmark": benchmark,
            "source_awards": [
                self._format_award_summary(a) for a in awards[:15]
            ],
            "estimated_rates_from_awards": estimated_rates[:20],
            "methodology": (
                "Rates estimated from USASpending.gov contract award amounts "
                "and durations, combined with GSA Schedule benchmark data. "
                "Actual rates may vary based on clearance requirements, "
                "location, and contract vehicle."
            ),
        }

    async def _fetch_awards_for_labor(
        self,
        labor_category: str,
        naics_code: Optional[str] = None,
        location: Optional[str] = None,
    ) -> List[Dict]:
        """Fetch awards from USASpending.gov filtered by labor category keywords."""
        client = await self._get_client()
        url = f"{USASPENDING_API_BASE}/search/spending_by_award/"

        filters: Dict = {
            "keywords": [labor_category],
            "award_type_codes": ["A", "B", "C", "D"],  # Contracts
        }

        if naics_code:
            filters["naics_codes"] = {"require": [naics_code]}

        if location:
            filters["recipient_locations"] = [{"country": "USA", "state": location}]

        # Search last 3 years for better data coverage
        now = datetime.now()
        three_years_ago = now - timedelta(days=365 * 3)
        filters["time_period"] = [
            {
                "start_date": three_years_ago.strftime("%Y-%m-%d"),
                "end_date": now.strftime("%Y-%m-%d"),
            }
        ]

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
            "limit": 25,
            "page": 1,
            "sort": "Award Amount",
            "order": "desc",
        }

        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except httpx.TimeoutException:
            logger.error("USASpending API timed out for labor rate search")
            return []
        except httpx.HTTPStatusError as exc:
            logger.error("USASpending API HTTP error: %s", exc)
            return []
        except Exception as exc:
            logger.error("USASpending API request failed: %s", exc)
            return []

    def _estimate_rates_from_awards(
        self, awards: List[Dict], labor_category: str
    ) -> List[float]:
        """
        Estimate hourly rates from contract award data.

        Uses award amounts and durations to back-calculate approximate
        hourly rates, assuming typical staffing patterns.
        """
        rates = []

        for award in awards:
            amount = award.get("Award Amount")
            start = award.get("Start Date")
            end = award.get("End Date")

            if not amount or amount <= 0:
                continue

            # Calculate contract duration in months
            months = 12  # default assumption
            if start and end:
                try:
                    start_dt = datetime.strptime(start, "%Y-%m-%d")
                    end_dt = datetime.strptime(end, "%Y-%m-%d")
                    delta = (end_dt - start_dt).days
                    if delta > 0:
                        months = max(delta / 30.44, 1)
                except (ValueError, TypeError):
                    pass

            # Estimate: assume 60% of award is labor, with typical team size
            labor_portion = amount * 0.6
            total_hours = months * 160  # 160 hrs/month for a single FTE
            # Assume award supports multiple FTEs; scale by award size
            estimated_ftes = max(1, amount / (150000 * (months / 12)))
            hours_per_fte = total_hours
            estimated_rate = labor_portion / (estimated_ftes * hours_per_fte)

            # Sanity check against reasonable government rates
            if 25 <= estimated_rate <= 500:
                rates.append(round(estimated_rate, 2))

        return rates

    def _get_benchmark(self, labor_category: str) -> Optional[Dict]:
        """Look up GSA benchmark rates for the given labor category."""
        key = labor_category.lower().strip()

        # Direct match
        if key in GSA_LABOR_RATE_BENCHMARKS:
            return {
                "source": "GSA Schedule Benchmark",
                "category": labor_category,
                **GSA_LABOR_RATE_BENCHMARKS[key],
            }

        # Partial match
        for bench_key, rates in GSA_LABOR_RATE_BENCHMARKS.items():
            if bench_key in key or key in bench_key:
                return {
                    "source": "GSA Schedule Benchmark",
                    "category": bench_key.title(),
                    **rates,
                }

        # No match found — return a generic IT benchmark
        return {
            "source": "GSA Schedule Benchmark (Generic IT)",
            "category": labor_category,
            "min": 65,
            "max": 250,
            "median": 130,
            "note": "No exact benchmark match; using generic IT services range.",
        }

    @staticmethod
    def _format_award_summary(award: Dict) -> Dict:
        """Format a raw USASpending award into a concise summary."""
        amount = award.get("Award Amount")
        internal_id = award.get("generated_internal_id", "")
        detail_url = (
            f"https://www.usaspending.gov/award/{internal_id}/"
            if internal_id
            else None
        )
        return {
            "award_id": award.get("Award ID", ""),
            "recipient": award.get("Recipient Name", "Unknown"),
            "agency": award.get("Awarding Agency", "Unknown"),
            "sub_agency": award.get("Awarding Sub Agency", ""),
            "amount": round(amount, 2) if amount else None,
            "amount_formatted": f"${amount:,.0f}" if amount else "N/A",
            "description": (award.get("Description") or "")[:200],
            "start_date": award.get("Start Date"),
            "end_date": award.get("End Date"),
            "naics": award.get("NAICS Code"),
            "contract_type": award.get("Contract Award Type", ""),
            "detail_url": detail_url,
        }

    # ------------------------------------------------------------------
    # Competitor Award Analysis
    # ------------------------------------------------------------------

    async def search_competitor_awards(
        self,
        naics_code: Optional[str] = None,
        agency: Optional[str] = None,
        keyword: Optional[str] = None,
    ) -> Dict:
        """
        Search for historical contract awards to analyze competitors.

        Args:
            naics_code: NAICS code filter (e.g. "541512").
            agency: Awarding agency name filter.
            keyword: Keyword to search in award descriptions.

        Returns:
            Dict with awards list, vendor_summary, and market_insights.
        """
        client = await self._get_client()
        url = f"{USASPENDING_API_BASE}/search/spending_by_award/"

        filters: Dict = {
            "award_type_codes": ["A", "B", "C", "D"],
        }

        if keyword:
            filters["keywords"] = [keyword]

        if naics_code:
            filters["naics_codes"] = {"require": [naics_code]}

        if agency:
            filters["agencies"] = [
                {"type": "awarding", "tier": "toptier", "name": agency}
            ]

        # Last 2 years
        now = datetime.now()
        two_years_ago = now - timedelta(days=365 * 2)
        filters["time_period"] = [
            {
                "start_date": two_years_ago.strftime("%Y-%m-%d"),
                "end_date": now.strftime("%Y-%m-%d"),
            }
        ]

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
            "limit": 50,
            "page": 1,
            "sort": "Start Date",
            "order": "desc",
        }

        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
        except httpx.TimeoutException:
            logger.error("USASpending API timed out for competitor search")
            results = []
        except httpx.HTTPStatusError as exc:
            logger.error("USASpending API HTTP error: %s", exc)
            results = []
        except Exception as exc:
            logger.error("USASpending API request failed: %s", exc)
            results = []

        awards = [self._format_award_summary(a) for a in results]
        vendor_summary = self._build_vendor_summary(results)
        market_insights = self._build_market_insights(results)

        return {
            "filters": {
                "naics_code": naics_code,
                "agency": agency,
                "keyword": keyword,
            },
            "total_awards": len(awards),
            "awards": awards,
            "vendor_summary": vendor_summary,
            "market_insights": market_insights,
        }

    @staticmethod
    def _build_vendor_summary(awards: List[Dict]) -> List[Dict]:
        """Aggregate awards by vendor to show competitive landscape."""
        vendors: Dict[str, Dict] = {}

        for award in awards:
            name = award.get("Recipient Name", "Unknown")
            amount = award.get("Award Amount") or 0

            if name not in vendors:
                vendors[name] = {
                    "vendor_name": name,
                    "award_count": 0,
                    "total_value": 0,
                    "agencies": set(),
                }

            vendors[name]["award_count"] += 1
            vendors[name]["total_value"] += amount
            agency = award.get("Awarding Agency")
            if agency:
                vendors[name]["agencies"].add(agency)

        # Sort by total value descending
        result = []
        for v in sorted(vendors.values(), key=lambda x: x["total_value"], reverse=True):
            result.append({
                "vendor_name": v["vendor_name"],
                "award_count": v["award_count"],
                "total_value": round(v["total_value"], 2),
                "total_value_formatted": f"${v['total_value']:,.0f}",
                "agencies": sorted(v["agencies"]),
            })

        return result[:20]

    @staticmethod
    def _build_market_insights(awards: List[Dict]) -> Dict:
        """Generate market insights from award data."""
        amounts = [
            a.get("Award Amount", 0)
            for a in awards
            if a.get("Award Amount") and a["Award Amount"] > 0
        ]

        if not amounts:
            return {
                "total_market_value": 0,
                "average_award_size": 0,
                "median_award_size": 0,
                "min_award": 0,
                "max_award": 0,
                "unique_vendors": 0,
                "unique_agencies": 0,
            }

        unique_vendors = len(
            set(a.get("Recipient Name", "") for a in awards if a.get("Recipient Name"))
        )
        unique_agencies = len(
            set(a.get("Awarding Agency", "") for a in awards if a.get("Awarding Agency"))
        )

        return {
            "total_market_value": round(sum(amounts), 2),
            "total_market_value_formatted": f"${sum(amounts):,.0f}",
            "average_award_size": round(statistics.mean(amounts), 2),
            "average_award_formatted": f"${statistics.mean(amounts):,.0f}",
            "median_award_size": round(statistics.median(amounts), 2),
            "min_award": round(min(amounts), 2),
            "max_award": round(max(amounts), 2),
            "unique_vendors": unique_vendors,
            "unique_agencies": unique_agencies,
        }

    # ------------------------------------------------------------------
    # Pricing Recommendation Engine
    # ------------------------------------------------------------------

    def get_pricing_recommendation(
        self,
        labor_categories: List[Dict],
        competitor_data: Optional[Dict] = None,
    ) -> Dict:
        """
        Generate pricing strategy recommendations.

        Args:
            labor_categories: List of dicts with 'category' and 'rate' keys.
            competitor_data: Optional competitor analysis data from search_competitor_awards.

        Returns:
            Dict with competitive, balanced, and premium pricing strategies
            along with analysis and recommendations.
        """
        if not labor_categories:
            return {"error": "At least one labor category is required."}

        analyses = []
        for item in labor_categories:
            category = item.get("category", "Unknown")
            target_rate = item.get("rate", 0)
            benchmark = self._get_benchmark(category)

            analysis = self._analyze_single_rate(category, target_rate, benchmark)
            analyses.append(analysis)

        # Build three pricing strategies
        competitive_strategy = self._build_strategy(
            "competitive", analyses, competitor_data, multiplier=0.90
        )
        balanced_strategy = self._build_strategy(
            "balanced", analyses, competitor_data, multiplier=1.00
        )
        premium_strategy = self._build_strategy(
            "premium", analyses, competitor_data, multiplier=1.15
        )

        # Overall recommendation
        recommendation = self._generate_overall_recommendation(
            analyses, competitor_data
        )

        return {
            "labor_categories_analyzed": len(analyses),
            "analyses": analyses,
            "strategies": {
                "competitive": competitive_strategy,
                "balanced": balanced_strategy,
                "premium": premium_strategy,
            },
            "recommendation": recommendation,
            "disclaimer": (
                "These pricing recommendations are based on publicly available "
                "government contract data and GSA Schedule benchmarks. Actual "
                "pricing should account for your specific cost structure, "
                "overhead rates, clearance requirements, and contract vehicle."
            ),
        }

    def _analyze_single_rate(
        self, category: str, target_rate: float, benchmark: Optional[Dict]
    ) -> Dict:
        """Analyze a single labor category rate against benchmarks."""
        if not benchmark:
            return {
                "category": category,
                "target_rate": target_rate,
                "benchmark_available": False,
                "position": "unknown",
            }

        bench_min = benchmark.get("min", 0)
        bench_max = benchmark.get("max", 0)
        bench_median = benchmark.get("median", 0)

        # Determine market position
        if target_rate < bench_min:
            position = "below_market"
            position_label = "Below Market"
            risk = "Rate may be unsustainably low or signal inexperience to evaluators."
        elif target_rate <= bench_median * 0.9:
            position = "competitive_low"
            position_label = "Competitive (Low End)"
            risk = "Competitive but may leave margin on the table."
        elif target_rate <= bench_median * 1.1:
            position = "market_rate"
            position_label = "At Market Rate"
            risk = "Well-positioned. Standard market pricing."
        elif target_rate <= bench_max:
            position = "premium"
            position_label = "Premium"
            risk = "Justifiable with strong past performance and differentiators."
        else:
            position = "above_market"
            position_label = "Above Market"
            risk = "May be non-competitive unless justified by unique expertise."

        percentile = 0
        if bench_max > bench_min:
            percentile = round(
                ((target_rate - bench_min) / (bench_max - bench_min)) * 100, 1
            )
            percentile = max(0, min(100, percentile))

        return {
            "category": category,
            "target_rate": target_rate,
            "benchmark_available": True,
            "benchmark": {
                "min": bench_min,
                "max": bench_max,
                "median": bench_median,
            },
            "position": position,
            "position_label": position_label,
            "market_percentile": percentile,
            "risk_assessment": risk,
            "suggested_range": {
                "low": round(bench_median * 0.85, 2),
                "mid": round(bench_median, 2),
                "high": round(bench_median * 1.20, 2),
            },
        }

    def _build_strategy(
        self,
        strategy_name: str,
        analyses: List[Dict],
        competitor_data: Optional[Dict],
        multiplier: float,
    ) -> Dict:
        """Build a pricing strategy at the given multiplier."""
        strategy_labels = {
            "competitive": {
                "name": "Competitive (Price-to-Win)",
                "description": (
                    "Aggressive pricing to maximize win probability. "
                    "Best for LPTA (Lowest Price Technically Acceptable) evaluations."
                ),
            },
            "balanced": {
                "name": "Balanced (Best Value)",
                "description": (
                    "Market-rate pricing that balances competitiveness with margin. "
                    "Best for best-value trade-off evaluations."
                ),
            },
            "premium": {
                "name": "Premium (Differentiated)",
                "description": (
                    "Above-market pricing justified by superior qualifications. "
                    "Best when technical evaluation weight exceeds price weight."
                ),
            },
        }

        label = strategy_labels.get(strategy_name, {})
        rates = []
        total_annual_value = 0

        for analysis in analyses:
            if analysis.get("benchmark_available"):
                median = analysis["benchmark"]["median"]
                suggested = round(median * multiplier, 2)
            else:
                suggested = round(analysis.get("target_rate", 100) * multiplier, 2)

            annual_value = suggested * 2080  # standard work year hours
            total_annual_value += annual_value

            rates.append({
                "category": analysis["category"],
                "suggested_rate": suggested,
                "annual_value": round(annual_value, 2),
                "annual_value_formatted": f"${annual_value:,.0f}",
            })

        # Factor in competitor landscape if available
        win_probability = self._estimate_win_probability(
            strategy_name, competitor_data
        )

        return {
            "strategy": label.get("name", strategy_name),
            "description": label.get("description", ""),
            "rates": rates,
            "total_annual_value": round(total_annual_value, 2),
            "total_annual_formatted": f"${total_annual_value:,.0f}",
            "estimated_win_probability": win_probability,
        }

    @staticmethod
    def _estimate_win_probability(
        strategy: str, competitor_data: Optional[Dict]
    ) -> str:
        """Rough estimate of win probability based on strategy and competition."""
        base_probs = {
            "competitive": "60-75%",
            "balanced": "40-55%",
            "premium": "25-40%",
        }

        if competitor_data:
            vendor_count = competitor_data.get("market_insights", {}).get(
                "unique_vendors", 0
            )
            if vendor_count > 10:
                # Highly competitive market
                return {
                    "competitive": "45-60%",
                    "balanced": "30-45%",
                    "premium": "15-25%",
                }.get(strategy, "Unknown")
            elif vendor_count <= 3:
                # Low competition
                return {
                    "competitive": "70-85%",
                    "balanced": "55-70%",
                    "premium": "40-55%",
                }.get(strategy, "Unknown")

        return base_probs.get(strategy, "Unknown")

    @staticmethod
    def _generate_overall_recommendation(
        analyses: List[Dict],
        competitor_data: Optional[Dict],
    ) -> Dict:
        """Generate an overall pricing recommendation."""
        below_market = sum(
            1 for a in analyses if a.get("position") == "below_market"
        )
        above_market = sum(
            1 for a in analyses if a.get("position") == "above_market"
        )
        at_market = sum(
            1 for a in analyses if a.get("position") == "market_rate"
        )

        if below_market > len(analyses) / 2:
            summary = (
                "Most of your proposed rates are below market. Consider raising "
                "rates to improve margins while remaining competitive. Low rates "
                "can sometimes signal inexperience to government evaluators."
            )
            suggested_strategy = "balanced"
        elif above_market > len(analyses) / 2:
            summary = (
                "Most of your proposed rates are above market. Unless you have "
                "strong differentiators and the evaluation favors technical "
                "merit over price, consider adjusting rates downward."
            )
            suggested_strategy = "competitive"
        else:
            summary = (
                "Your proposed rates are generally in line with market rates. "
                "A balanced strategy is recommended. Consider the specific "
                "evaluation criteria to fine-tune your approach."
            )
            suggested_strategy = "balanced"

        tips = [
            "Review the solicitation's evaluation criteria (LPTA vs. Best Value) before finalizing rates.",
            "Factor in your indirect cost rates (overhead, G&A, fringe) to ensure profitability.",
            "Consider offering volume discounts for multi-year contracts.",
            "Ensure rates comply with the Service Contract Act wage determinations if applicable.",
        ]

        if competitor_data:
            vendor_count = competitor_data.get("market_insights", {}).get(
                "unique_vendors", 0
            )
            if vendor_count > 0:
                tips.append(
                    f"Market analysis shows {vendor_count} competing vendors in this space. "
                    "Differentiate on technical approach and past performance."
                )

        return {
            "summary": summary,
            "suggested_strategy": suggested_strategy,
            "tips": tips,
        }
