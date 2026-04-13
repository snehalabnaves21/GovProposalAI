"""
Payment service supporting Stripe and Razorpay for subscription billing.
"""

import os
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# Pricing plans configuration
PLANS = {
    "starter": {
        "name": "Starter",
        "price_usd": 999,
        "max_users": 1,
        "max_proposals_per_user": 2,
        "features": [
            "1 user account",
            "2 proposals per month",
            "SAM.gov & USASpending.gov search",
            "All 18 proposal sections",
            "PDF export",
            "Image uploads in proposals",
            "Email support",
        ],
    },
    "professional": {
        "name": "Professional",
        "price_usd": 2999,
        "max_users": 2,
        "max_proposals_per_user": 5,
        "features": [
            "2 user accounts",
            "5 proposals per user/month",
            "All 18 proposal sections",
            "Interactive pricing builder",
            "PDF & DOCX export",
            "Template library (8+ templates)",
            "Priority AI generation",
            "Multi-source opportunity search",
            "Market Research & Pricing Intelligence",
            "Dedicated account manager",
        ],
    },
    "enterprise": {
        "name": "Enterprise",
        "price_usd": 0,
        "max_users": -1,
        "max_proposals_per_user": -1,
        "contact_sales": True,
        "features": [
            "Everything in Professional",
            "Unlimited users & proposals",
            "Custom templates & branding",
            "API access",
            "Dedicated support & onboarding",
            "SSO / SAML integration",
            "Custom integrations",
        ],
    },
}


class StripeService:
    """Handles Stripe payment processing."""

    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY", "")
        self.publishable_key = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
        self._stripe = None

    @property
    def stripe(self):
        if self._stripe is None:
            import stripe
            stripe.api_key = self.api_key
            self._stripe = stripe
        return self._stripe

    @property
    def is_configured(self):
        return bool(self.api_key and self.api_key != "your_key_here")

    def create_checkout_session(
        self,
        plan: str,
        user_email: str,
        user_id: int,
        success_url: str,
        cancel_url: str,
    ) -> Dict:
        """Create a Stripe Checkout session for subscription."""
        if not self.is_configured:
            return {"error": "Stripe is not configured. Please add STRIPE_SECRET_KEY to .env"}

        plan_info = PLANS.get(plan)
        if not plan_info or plan_info["price_usd"] == 0:
            return {"error": f"Invalid plan: {plan}"}

        try:
            session = self.stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"GovProposal AI - {plan_info['name']}",
                            "description": ", ".join(plan_info["features"][:3]),
                        },
                        "unit_amount": plan_info["price_usd"] * 100,  # cents
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                }],
                mode="subscription",
                customer_email=user_email,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={"user_id": str(user_id), "plan": plan},
            )
            return {
                "checkout_url": session.url,
                "session_id": session.id,
            }
        except Exception as e:
            logger.error("Stripe checkout error: %s", e)
            return {"error": str(e)}

    def handle_webhook(self, payload: bytes, sig_header: str) -> Optional[Dict]:
        """Process Stripe webhook events."""
        if not self.is_configured:
            return None

        try:
            event = self.stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )

            if event["type"] == "checkout.session.completed":
                session = event["data"]["object"]
                return {
                    "event": "subscription_created",
                    "user_id": int(session["metadata"]["user_id"]),
                    "plan": session["metadata"]["plan"],
                    "customer_id": session.get("customer"),
                    "subscription_id": session.get("subscription"),
                }
            elif event["type"] == "customer.subscription.deleted":
                sub = event["data"]["object"]
                return {
                    "event": "subscription_cancelled",
                    "customer_id": sub.get("customer"),
                }

            return None
        except Exception as e:
            logger.error("Stripe webhook error: %s", e)
            return None


class RazorpayService:
    """Handles Razorpay payment processing."""

    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import razorpay
            self._client = razorpay.Client(auth=(self.key_id, self.key_secret))
        return self._client

    @property
    def is_configured(self):
        return bool(self.key_id and self.key_id != "your_key_here")

    def create_order(self, plan: str, user_id: int) -> Dict:
        """Create a Razorpay order for subscription payment."""
        if not self.is_configured:
            return {"error": "Razorpay is not configured. Please add RAZORPAY_KEY_ID to .env"}

        plan_info = PLANS.get(plan)
        if not plan_info or plan_info["price_inr"] == 0:
            return {"error": f"Invalid plan: {plan}"}

        try:
            order = self.client.order.create({
                "amount": plan_info["price_inr"] * 100,  # paise
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "user_id": str(user_id),
                    "plan": plan,
                    "product": f"GovProposal AI - {plan_info['name']}",
                },
            })
            return {
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "key_id": self.key_id,
            }
        except Exception as e:
            logger.error("Razorpay order error: %s", e)
            return {"error": str(e)}

    def verify_payment(self, order_id: str, payment_id: str, signature: str) -> bool:
        """Verify Razorpay payment signature."""
        if not self.is_configured:
            return False

        try:
            self.client.utility.verify_payment_signature({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            })
            return True
        except Exception as e:
            logger.error("Razorpay verification failed: %s", e)
            return False


# Singleton instances
stripe_service = StripeService()
razorpay_service = RazorpayService()
