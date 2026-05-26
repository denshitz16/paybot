import base64
import hashlib
import json
import logging
import os
import uuid
from typing import Any, Dict, Optional

import httpx
from core.config import settings

logger = logging.getLogger(__name__)

MAYA_SANDBOX_BASE_URL = "https://pg-sandbox.paymaya.com/checkout/v1"
MAYA_LIVE_BASE_URL = "https://pg.maya.ph/checkout/v1"

# Maya Business API endpoints (Payments/QR/Vault)
MAYA_BUSINESS_SANDBOX_URL = "https://pg-sandbox.paymaya.com"
MAYA_BUSINESS_LIVE_URL = "https://pg.maya.ph"


class MayaService:
    """Service for Maya Manager Checkout integration."""

    def __init__(self):
        self.secret_key = os.environ.get("MAYA_SECRET_KEY", "") or settings.maya_secret_key
        self.mode = os.environ.get("MAYA_MODE", "") or settings.maya_mode or "sandbox"
        self.base_url = os.environ.get("MAYA_BASE_URL", "") or settings.maya_base_url.strip()

        if not self.base_url:
            self.base_url = MAYA_LIVE_BASE_URL if self.mode.lower() == "live" else MAYA_SANDBOX_BASE_URL

        if not self.secret_key:
            logger.warning("MAYA_SECRET_KEY not configured - Maya API calls will fail")

    def _get_auth_headers(self) -> Dict[str, str]:
        if not self.secret_key:
            return {}
        encoded = base64.b64encode(f"{self.secret_key}:".encode("utf-8")).decode("ascii")
        return {"Authorization": f"Basic {encoded}"}

    def _amount_value(self, amount: float) -> float:
        """Maya Business API uses decimal (major units) for amounts."""
        return round(float(amount), 2)

    def _extract_checkout_url(self, data: Dict[str, Any]) -> str:
        url = data.get("redirectUrl") or data.get("redirect_url") or data.get("checkoutUrl") or data.get("checkout_url") or ""
        if isinstance(url, dict):
            return (
                url.get("web") or url.get("success") or url.get("failure") or url.get("cancel") or ""
            )
        return url or ""

    async def create_checkout(
        self,
        amount: float,
        description: str = "",
        channel_code: str = "",
        customer_name: str = "",
        customer_email: str = "",
        mobile_number: str = "",
        external_id: str = "",
        success_redirect_url: str = "",
        failure_redirect_url: str = "",
        cancel_redirect_url: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not external_id:
            external_id = f"maya-{uuid.uuid4().hex[:12]}"

        amount_value = self._amount_value(amount)
        redirect_base = settings.backend_url.rstrip("/")

        # T0 Settlement Hint: In some Maya integrations, passing certain metadata
        # or using specific items helps with settlement routing, though it's
        # mostly account-level.
        payload: Dict[str, Any] = {
            "requestReferenceNumber": external_id,
            "totalAmount": {"value": amount_value, "currency": "PHP"},
            "redirectUrl": {
                "success": success_redirect_url or f"{redirect_base}/api/v1/gateway/maya/redirect/success",
                "failure": failure_redirect_url or f"{redirect_base}/api/v1/gateway/maya/redirect/failed",
                "cancel": cancel_redirect_url or f"{redirect_base}/api/v1/gateway/maya/redirect/cancelled",
            },
            "items": [
                {
                    "name": description or "POS Terminal Payment",
                    "code": "POS_SALE",
                    "quantity": 1,
                    "unitPrice": {"value": amount_value, "currency": "PHP"},
                    "totalAmount": {"value": amount_value, "currency": "PHP"},
                }
            ],
            "metadata": {
                "description": description,
                "channel_code": channel_code,
                "customer_name": customer_name,
                "customer_email": customer_email,
                "settlement_type": "T0",  # Hint for T0 settlement if supported by the merchant configuration
                "terminal_id": metadata.get("terminal_id") if metadata else "POS-1",
                **(metadata or {}),
            },
        }

        if customer_name or customer_email or mobile_number:
            buyer: Dict[str, str] = {}
            if customer_name:
                buyer["name"] = customer_name
            if customer_email:
                buyer["email"] = customer_email
            if mobile_number:
                buyer["phoneNumber"] = mobile_number
            payload["buyer"] = buyer

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/checkouts",
                    json=payload,
                    headers={**self._get_auth_headers(), "Content-Type": "application/json"},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                return {
                    "success": True,
                    "checkout_id": data.get("id", ""),
                    "checkout_url": self._extract_checkout_url(data),
                    "external_id": external_id,
                    "amount": amount,
                    "status": data.get("status", "CREATED"),
                    "response": data,
                }
        except httpx.HTTPStatusError as exc:
            logger.error("Maya checkout creation failed: %s", exc.response.text)
            return {"success": False, "error": exc.response.text}
        except Exception as exc:
            logger.error("Maya checkout creation error: %s", exc)
            return {"success": False, "error": str(exc)}

    async def get_checkout_status(self, checkout_id: str) -> Dict[str, Any]:
        if not checkout_id:
            return {"success": False, "error": "Missing checkout ID"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/checkouts/{checkout_id}",
                    headers={**self._get_auth_headers(), "Content-Type": "application/json"},
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
                return {
                    "success": True,
                    "checkout_id": data.get("id", ""),
                    "external_id": data.get("requestReferenceNumber", ""),
                    "status": (data.get("status") or "").upper(),
                    "response": data,
                }
        except httpx.HTTPStatusError as exc:
            logger.error("Maya checkout status fetch failed: %s", exc.response.text)
            return {"success": False, "error": exc.response.text}
        except Exception as exc:
            logger.error("Maya checkout status fetch error: %s", exc)
            return {"success": False, "error": str(exc)}

    async def create_payment_link(
        self,
        amount: float,
        description: str = "",
        customer_name: str = "",
        customer_email: str = "",
        external_id: str = "",
    ) -> Dict[str, Any]:
        return await self.create_checkout(
            amount=amount,
            description=description,
            customer_name=customer_name,
            customer_email=customer_email,
            external_id=external_id,
        )

    async def create_invoice(
        self,
        amount: float,
        description: str = "",
        customer_name: str = "",
        customer_email: str = "",
        external_id: str = "",
    ) -> Dict[str, Any]:
        return await self.create_checkout(
            amount=amount,
            description=description,
            customer_name=customer_name,
            customer_email=customer_email,
            external_id=external_id,
        )

    async def create_terminal_payment(
        self,
        amount: float,
        description: str = "",
        terminal_id: str = "",
        external_id: str = "",
        customer_name: str = "",
        customer_email: str = "",
        mobile_number: str = "",
    ) -> Dict[str, Any]:
        """Create a real terminal payment with T0 settlement priority."""
        return await self.create_checkout(
            amount=amount,
            description=description or f"Terminal Payment {terminal_id}",
            channel_code="PH_MAYA_POS",
            customer_name=customer_name,
            customer_email=customer_email,
            mobile_number=mobile_number,
            external_id=external_id,
            metadata={
                "terminal_mode": "real",
                "terminal_id": terminal_id,
                "settlement_type": "T0",
                "transaction_type": "POS_SALE",
            },
        )

    async def create_virtual_terminal(
        self,
        amount: float,
        description: str = "",
        customer_name: str = "",
        customer_email: str = "",
        mobile_number: str = "",
        terminal_id: str = "",
        channel_code: str = "PH_MAYA",
        external_id: str = "",
    ) -> Dict[str, Any]:
        return await self.create_checkout(
            amount=amount,
            description=description or "Maya Virtual Terminal",
            channel_code=channel_code,
            customer_name=customer_name,
            customer_email=customer_email,
            mobile_number=mobile_number,
            external_id=external_id,
            metadata={
                "terminal_mode": "virtual",
                "terminal_id": terminal_id,
                "preferred_payment_method": "card",
            },
        )

    async def create_ewallet_charge(
        self,
        amount: float,
        channel_code: str,
        mobile_number: str = "",
        external_id: str = "",
    ) -> Dict[str, Any]:
        return await self.create_checkout(
            amount=amount,
            description=f"E-wallet payment ({channel_code})",
            channel_code=channel_code,
            mobile_number=mobile_number,
            external_id=external_id,
        )

    async def get_balance(self, account_type: str = "CASH") -> Dict[str, Any]:
        return {"success": False, "error": "Maya Manager does not support balance lookup through the checkout API."}

    async def get_available_banks(self) -> Dict[str, Any]:
        return {"success": False, "error": "Maya Manager does not provide a bank list through the checkout API."}

    def calculate_fees(self, amount: float, method: str) -> Dict[str, Any]:
        fee_rates: Dict[str, Dict[str, float]] = {
            "invoice": {"percentage": 0.028, "fixed": 0},
            "qr_code": {"percentage": 0.007, "fixed": 0},
            "ewallet": {"percentage": 0.02, "fixed": 0},
            "virtual_account": {"percentage": 0, "fixed": 25},
            "card": {"percentage": 0.035, "fixed": 0},
            "disbursement": {"percentage": 0, "fixed": 25},
            "retail": {"percentage": 0, "fixed": 20},
        }
        rates = fee_rates.get(method, {"percentage": 0.03, "fixed": 0})
        fee = amount * rates["percentage"] + rates["fixed"]
        return {
            "amount": amount,
            "method": method,
            "fee": round(fee, 2),
            "net_amount": round(amount - fee, 2),
            "fee_percentage": rates["percentage"] * 100,
            "fee_fixed": rates["fixed"],
        }

    async def create_disbursement(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        return {"success": False, "error": "Maya Manager does not support disbursement via this checkout integration."}

    async def create_refund(self, *args: Any, **kwargs: Any) -> Dict[str, Any]:
        return {"success": False, "error": "Maya Manager does not support refunds through this checkout integration."}

    # ============ Maya Business API Methods (Card Payments) ============

    def _get_business_api_headers(self) -> Dict[str, str]:
        """Get headers for Maya Business API requests."""
        api_key = os.environ.get("MAYA_BUSINESS_API_KEY", "") or settings.maya_business_api_key
        if not api_key:
            return {}
        encoded = base64.b64encode(f"{api_key}:".encode("utf-8")).decode("ascii")
        return {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/json",
        }

    def _get_business_api_base_url(self) -> str:
        """Get Maya Business API base URL."""
        base_url = (
            os.environ.get("MAYA_BUSINESS_BASE_URL", "")
            or settings.maya_business_base_url.strip()
        )
        if base_url:
            return base_url

        mode = (
            os.environ.get("MAYA_BUSINESS_MODE", "")
            or settings.maya_business_mode or "sandbox"
        )
        return (
            MAYA_BUSINESS_LIVE_URL if mode.lower() == "live" else MAYA_BUSINESS_SANDBOX_URL
        )

    async def create_card_payment(
        self,
        amount: float,
        description: str = "",
        customer_name: str = "",
        customer_email: str = "",
        customer_phone: str = "",
        external_id: str = "",
        success_redirect_url: str = "",
        failure_redirect_url: str = "",
        cancel_redirect_url: str = "",
    ) -> Dict[str, Any]:
        """Create a card payment checkout using Maya Business API.
        
        This method creates a secure checkout session for accepting credit/debit card payments.
        """
        api_key = (
            os.environ.get("MAYA_BUSINESS_API_KEY", "")
            or settings.maya_business_api_key
        )
        if not api_key:
            return {"success": False, "error": "Maya Business API key not configured"}

        if not external_id:
            external_id = f"card-{uuid.uuid4().hex[:12]}"

        amount_cents = int(round(amount * 100))
        redirect_base = settings.backend_url.rstrip("/")

        # Build checkout payload for Maya Business API
        payload = {
            "totalAmount": {
                "value": amount_cents,
                "currency": "PHP"
            },
            "buyer": {},
            "redirectUrl": {
                "success": success_redirect_url or f"{redirect_base}/payment/success",
                "failure": failure_redirect_url or f"{redirect_base}/payment/failed",
                "cancel": cancel_redirect_url or f"{redirect_base}/payment/cancelled",
            },
            "requestReferenceNumber": external_id,
            "items": [
                {
                    "name": description or "Card Payment",
                    "code": "CARD",
                    "quantity": 1,
                    "unitPrice": {
                        "value": amount_cents,
                        "currency": "PHP"
                    },
                    "totalAmount": {
                        "value": amount_cents,
                        "currency": "PHP"
                    }
                }
            ],
            "metadata": {
                "description": description,
                "customer_name": customer_name,
                "customer_email": customer_email,
                "customer_phone": customer_phone,
            }
        }

        # Add buyer details if provided
        if customer_name:
            payload["buyer"]["name"] = customer_name
        if customer_email:
            payload["buyer"]["email"] = customer_email
        if customer_phone:
            payload["buyer"]["phoneNumber"] = customer_phone

        try:
            base_url = self._get_business_api_base_url()
            headers = self._get_business_api_headers()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/checkout/v1/checkouts",
                    json=payload,
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                checkout_url = ""
                if isinstance(data.get("redirectUrl"), dict):
                    checkout_url = data["redirectUrl"].get("success", "")
                elif isinstance(data.get("checkoutUrl"), str):
                    checkout_url = data["checkoutUrl"]
                elif isinstance(data.get("redirect_url"), str):
                    checkout_url = data["redirect_url"]

                return {
                    "success": True,
                    "checkout_id": data.get("id", ""),
                    "checkout_url": checkout_url,
                    "external_id": external_id,
                    "amount": amount,
                    "status": data.get("status", "CREATED"),
                    "response": data,
                }
        except httpx.HTTPStatusError as exc:
            logger.error("Maya Business API checkout creation failed: %s", exc.response.text)
            return {"success": False, "error": f"Payment gateway error: {exc.response.text}"}
        except Exception as exc:
            logger.error("Maya Business API checkout creation error: %s", exc)
            return {"success": False, "error": str(exc)}

    async def get_payment_status(self, checkout_id: str) -> Dict[str, Any]:
        """Retrieve the status of a card payment."""
        api_key = (
            os.environ.get("MAYA_BUSINESS_API_KEY", "")
            or settings.maya_business_api_key
        )
        if not api_key:
            return {"success": False, "error": "Maya Business API key not configured"}

        try:
            base_url = self._get_business_api_base_url()
            headers = self._get_business_api_headers()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{base_url}/checkout/v1/checkouts/{checkout_id}",
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                return {
                    "success": True,
                    "checkout_id": data.get("id", ""),
                    "status": data.get("status", ""),
                    "amount": data.get("totalAmount", {}).get("value", 0) / 100,
                    "response": data,
                }
        except httpx.HTTPStatusError as exc:
            logger.error("Maya Business API status check failed: %s", exc.response.text)
            return {"success": False, "error": f"Status check failed: {exc.response.text}"}
        except Exception as exc:
            logger.error("Maya Business API status check error: %s", exc)
            return {"success": False, "error": str(exc)}

    async def create_qr_payment(
        self,
        amount: float,
        description: str = "",
        external_id: str = "",
        success_redirect_url: str = "",
        failure_redirect_url: str = "",
        cancel_redirect_url: str = "",
    ) -> Dict[str, Any]:
        """Create a Dynamic QR code for payment (PWM).
        
        This is ideal for real terminals where the customer scans a QR on the screen.
        Maya Business QR API usually results in T0 settlement for verified merchants.
        """
        api_key = os.environ.get("MAYA_BUSINESS_API_KEY", "") or settings.maya_business_api_key
        if not api_key:
            return {"success": False, "error": "Maya Business API key not configured"}

        if not external_id:
            external_id = f"qr-{uuid.uuid4().hex[:12]}"

        amount_val = self._amount_value(amount)
        redirect_base = settings.backend_url.rstrip("/")

        payload = {
            "totalAmount": {
                "value": amount_val,
                "currency": "PHP"
            },
            "redirectUrl": {
                "success": success_redirect_url or f"{redirect_base}/api/v1/gateway/maya/redirect/success",
                "failure": failure_redirect_url or f"{redirect_base}/api/v1/gateway/maya/redirect/failed",
                "cancel": cancel_redirect_url or f"{redirect_base}/api/v1/gateway/maya/redirect/cancelled",
            },
            "requestReferenceNumber": external_id,
            "metadata": {
                "description": description,
                "type": "DYNAMIC_QR",
                "settlement_type": "T0"
            }
        }

        try:
            base_url = self._get_business_api_base_url()
            headers = self._get_business_api_headers()

            async with httpx.AsyncClient() as client:
                # New endpoint for Dynamic QR (PWM)
                response = await client.post(
                    f"{base_url}/payments/v1/qr/payments",
                    json=payload,
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()

                return {
                    "success": True,
                    "qr_id": data.get("paymentId") or data.get("id", ""),
                    "qr_content": data.get("qrCodeBody") or data.get("qrContent", ""),
                    "redirect_url": data.get("redirectUrl", ""),
                    "external_id": external_id,
                    "amount": amount,
                    "status": "CREATED",
                    "response": data,
                }
        except httpx.HTTPStatusError as exc:
            logger.error("Maya QR creation failed: %s", exc.response.text)
            # Fallback: Many merchants use the standard Checkout API even for QR
            return await self.create_checkout(amount, description, external_id=external_id)
        except Exception as exc:
            logger.error("Maya QR creation error: %s", exc)
            return {"success": False, "error": str(exc)}
