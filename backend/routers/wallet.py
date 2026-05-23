"""Wallet API Endpoints - RESTful interface for wallet operations.

Endpoints for balance queries, deposits, withdrawals, and ledger history.
"""

import logging
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.wallet_service import WalletService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])


# ─────────────────────────────────────────────────────────────────────────────
# Request/Response Schemas
# ─────────────────────────────────────────────────────────────────────────────


class DepositRequest(BaseModel):
    """Deposit transaction request."""

    user_id: str = Field(..., description="Target wallet user ID")
    amount_php: Decimal = Field(..., gt=0, description="Amount in PHP")
    payment_method: str = Field(..., description="QRPH, VISA, MASTERCARD, GCASH, etc.")
    payment_gateway: str = Field(..., description="PAYMONGO, XENDIT, MANUAL")
    external_reference: str = Field(..., description="Payment gateway reference ID")
    is_t0_settlement: bool = Field(
        default=False,
        description="If true, credit available balance immediately (T0). Otherwise T+1.",
    )
    description: Optional[str] = Field(default="", description="Transaction description")


class WithdrawalRequest(BaseModel):
    """Withdrawal/disbursement request."""

    user_id: str = Field(..., description="Source wallet user ID")
    amount_php: Decimal = Field(..., gt=0, description="Amount in PHP")
    bank_code: str = Field(..., description="BDO, BPI, UNIONBANK, etc.")
    account_number: str = Field(..., description="Recipient bank account")
    recipient_name: str = Field(..., description="Recipient name")
    description: Optional[str] = Field(default="", description="Transaction description")


class BalanceResponse(BaseModel):
    """Wallet balance response."""

    user_id: str
    available_balance_php: float = Field(..., description="Settled, spendable balance")
    pending_balance_php: float = Field(..., description="T+1 card balance (pending settlement)")
    total_balance_php: float = Field(..., description="Available + Pending")
    usd_balance: float
    usdt_address: Optional[str]
    kyc_verified: bool
    is_active: bool
    created_at: str


class LedgerEntryResponse(BaseModel):
    """Single ledger entry in transaction history."""

    id: int
    transaction_id: str
    transaction_type: str
    amount_php: float
    balance_after_php: float
    settlement_status: str
    payment_method: Optional[str]
    external_reference: Optional[str]
    created_at: str
    settled_at: Optional[str]
    description: Optional[str]


class TransactionResponse(BaseModel):
    """Generic transaction response."""

    success: bool
    transaction_id: str
    message: str
    wallet_balance: BalanceResponse


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/balance/{user_id}", response_model=BalanceResponse)
async def get_balance(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get current wallet balance (available + pending)."""
    try:
        balance = await WalletService.get_wallet_balance(db, user_id)
        return BalanceResponse(**balance)
    except Exception as e:
        logger.error(f"Error fetching balance for {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/deposit", response_model=TransactionResponse)
async def deposit(req: DepositRequest, db: AsyncSession = Depends(get_db)):
    """Record a deposit transaction.
    
    Automatically handles T0 vs T+1 settlement based on payment method:
    - QR/e-wallet (QRPH, GCASH, GRABPAY): Instant/T0 settlement
    - Cards (VISA, MASTERCARD): T0 if is_t0_settlement=true, else T+1
    """
    try:
        entry = await WalletService.record_deposit(
            db=db,
            user_id=req.user_id,
            amount_php=req.amount_php,
            payment_method=req.payment_method,
            payment_gateway=req.payment_gateway,
            external_reference=req.external_reference,
            is_t0_settlement=req.is_t0_settlement,
            description=req.description,
        )

        balance = await WalletService.get_wallet_balance(db, req.user_id)

        return TransactionResponse(
            success=True,
            transaction_id=entry.transaction_id,
            message=f"Deposit of ₱{req.amount_php:.2f} recorded with {entry.settlement_status} settlement",
            wallet_balance=BalanceResponse(**balance),
        )
    except Exception as e:
        logger.error(f"Error processing deposit: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/withdraw", response_model=TransactionResponse)
async def withdraw(req: WithdrawalRequest, db: AsyncSession = Depends(get_db)):
    """Process a withdrawal/disbursement to a bank account.
    
    Deducts from available balance immediately (pessimistic locking).
    """
    try:
        entry = await WalletService.record_withdrawal(
            db=db,
            user_id=req.user_id,
            amount_php=req.amount_php,
            bank_code=req.bank_code,
            account_number=req.account_number,
            recipient_name=req.recipient_name,
            external_reference=f"{req.bank_code}-{req.account_number}",
            description=req.description,
        )

        balance = await WalletService.get_wallet_balance(db, req.user_id)

        return TransactionResponse(
            success=True,
            transaction_id=entry.transaction_id,
            message=f"Withdrawal of ₱{req.amount_php:.2f} processed to {req.bank_code}",
            wallet_balance=BalanceResponse(**balance),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing withdrawal: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/history/{user_id}", response_model=list[LedgerEntryResponse])
async def get_history(
    user_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get transaction history for a wallet."""
    try:
        history = await WalletService.get_ledger_history(db, user_id, limit, offset)
        return [LedgerEntryResponse(**h) for h in history]
    except Exception as e:
        logger.error(f"Error fetching history for {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/system/settle-pending-cards")
async def settle_pending_cards(user_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Settle pending T+1 card balances (daily sweep).
    
    Moves all pending_balance to available_balance for affected wallets.
    Typically run as a scheduled task (5 AM daily).
    """
    try:
        updated_count = await WalletService.settle_pending_cards(db, user_id)
        return {
            "success": True,
            "message": f"Settled pending cards for {updated_count} wallet(s)",
            "updated_wallets": updated_count,
        }
    except Exception as e:
        logger.error(f"Error settling pending cards: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
