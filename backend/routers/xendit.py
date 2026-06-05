"""
Xendit webhook router — minimal processing to mark transactions paid and credit wallets.
"""
import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.xendit_service import XenditService
from models.transactions import Transactions
from models.wallet_transactions import Wallet_transactions
from models.wallets import Wallets
from models.paymongo_webhook_events import PaymongoWebhookEvent
from services.event_bus import payment_event_bus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/xendit", tags=["xendit"])


async def _credit_wallet(db: AsyncSession, user_id: str, amount: float, note: str, reference_id: str) -> None:
    from services.wallets import WalletsService
    svc = WalletsService(db)
    wallet = await svc.get_or_create_wallet(user_id, "PHP", lock=True)

    balance_before = wallet.balance
    wallet.balance = round(wallet.balance + amount, 2)
    if hasattr(wallet, 'available_balance'):
        wallet.available_balance = round((wallet.available_balance or 0.0) + amount, 2)
    wallet.updated_at = datetime.now(timezone.utc)

    wtxn = Wallet_transactions(
        user_id=wallet.user_id,
        wallet_id=wallet.id,
        transaction_type="top_up",
        amount=amount,
        balance_before=balance_before,
        balance_after=wallet.balance,
        note=note,
        status="completed",
        reference_id=reference_id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(wtxn)
    await db.commit()
    await svc.publish_wallet_event(wallet.user_id, wallet, "top_up", amount, wtxn.id, note)


@router.post("/webhook")
async def xendit_webhook(request: Request, x_signature: Optional[str] = Header(None, alias="X-Callback-Signature"), db: AsyncSession = Depends(get_db)):
    try:
        raw_body = await request.body()
        svc = XenditService()
        # Try verifying with provided header; if header absent, try common aliases
        header_val = x_signature or request.headers.get("X-Signature") or request.headers.get("X-Hook-Signature") or request.headers.get("X-Callback-Signature")
        if header_val:
            verified = svc.verify_webhook_signature(raw_body, header_val)
            if not verified:
                logger.warning("Xendit webhook signature verification failed")
                return {"status": "error", "message": "Invalid signature"}
        else:
            logger.debug("No Xendit signature header present — skipping verification")

        body = json.loads(raw_body)
        logger.info("Xendit webhook received: %s", body.get("type", body.get("event", "unknown")))

        # Idempotency: reuse PaymongoWebhookEvent table for simple dedupe
        event_id = body.get("id") or body.get("data", {}).get("id") or body.get("event_id") or ""
        if event_id:
            try:
                existing = await db.execute(select(PaymongoWebhookEvent).where(PaymongoWebhookEvent.event_id == event_id))
                if existing.scalar_one_or_none():
                    logger.info("Duplicate Xendit event %s — skipping", event_id)
                    return {"status": "ok", "message": "duplicate"}
                db.add(PaymongoWebhookEvent(event_id=event_id, event_type=body.get("type", body.get("event", "xendit")), processed_at=datetime.now(timezone.utc)))
                await db.flush()
            except Exception:
                await db.rollback()

        # Flexible resource extraction
        data = body.get("data") or body.get("payload") or body
        attributes = data.get("attributes", {}) if isinstance(data, dict) else {}

        # Common identifier fields
        external_id = attributes.get("external_id") or attributes.get("externalId") or data.get("external_id") or data.get("externalId") or attributes.get("reference_id") or attributes.get("referenceId") or ""
        xendit_id = (data.get("id") or attributes.get("id") or attributes.get("invoice_id") or attributes.get("invoiceId") or "")

        # Try to determine status and amount from common fields
        status = attributes.get("status") or attributes.get("payment_status") or data.get("status") or body.get("type") or ""
        amount = attributes.get("amount") or attributes.get("paid_amount") or attributes.get("amount_paid") or attributes.get("total_amount") or data.get("amount") or 0
        try:
            amount = float(amount) if amount is not None else 0.0
        except Exception:
            amount = 0.0

        if not external_id and not xendit_id:
            logger.info("Xendit webhook missing reference identifiers; skipping")
            return {"status": "ok", "message": "no identifier"}

        # Find related transaction
        txn = None
        if external_id:
            res = await db.execute(select(Transactions).where(Transactions.external_id == external_id))
            txn = res.scalar_one_or_none()
        if not txn and xendit_id:
            res = await db.execute(select(Transactions).where(Transactions.xendit_id == xendit_id))
            txn = res.scalar_one_or_none()

        # Determine if this event indicates a settled/paid payment
        paid_values = {"PAID", "COMPLETED", "SETTLED", "SUCCESS"}
        is_paid = (str(status).upper() in paid_values) or ("paid" in str(body.get("type", "")).lower()) or ("paid" in str(body.get("event", "")).lower())

        if txn:
            old_status = txn.status
            if is_paid:
                txn.status = "paid"
                txn.updated_at = datetime.now(timezone.utc)
                await db.flush()

                if old_status != "paid" and txn.user_id:
                    # Use txn.amount if present, else attempt amount from webhook
                    topup_amount = txn.amount if txn.amount else amount
                    await _credit_wallet(db, txn.user_id, topup_amount if topup_amount else 0.0, note=f"Xendit payment: {txn.description or txn.external_id}", reference_id=txn.external_id or xendit_id)
                    payment_event_bus.publish({
                        "event_type": "status_change",
                        "transaction_id": txn.id,
                        "external_id": txn.external_id,
                        "old_status": old_status,
                        "new_status": "paid",
                        "amount": txn.amount or topup_amount,
                        "description": txn.description or "",
                        "transaction_type": txn.transaction_type,
                        "user_id": txn.user_id,
                    })
        else:
            logger.warning("No transaction found for Xendit webhook ref=%s id=%s", external_id, xendit_id)

        await db.commit()
        return {"status": "ok"}

    except Exception as e:
        logger.error("Xendit webhook error: %s", str(e), exc_info=True)
        try:
            await db.rollback()
        except Exception:
            pass
        return {"status": "error", "message": str(e)}
