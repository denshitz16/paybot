"""Virtual POS Terminal & Wallet Engine Models.

Double-entry bookkeeping ledger with support for:
- QR instant deposits (QRPH, GCash, Maya)
- Card payments with T+1 settlement
- InstaPay withdrawals
"""

from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column
import enum

from models.base import BaseModel


class LedgerEntryType(str, enum.Enum):
    """Transaction types in the immutable ledger."""
    QR_DEPOSIT_INSTANT = "QR_DEPOSIT_INSTANT"
    CARD_DEPOSIT_PENDING = "CARD_DEPOSIT_PENDING"
    CARD_BALANCE_CLEARED = "CARD_BALANCE_CLEARED"
    WITHDRAWAL_OUT = "WITHDRAWAL_OUT"
    REFUND_IN = "REFUND_IN"
    FEE_DEDUCTION = "FEE_DEDUCTION"


class LedgerEntryStatus(str, enum.Enum):
    """Ledger entry states."""
    SUCCESS = "SUCCESS"
    PENDING = "PENDING"
    FAILED = "FAILED"
    REVERSED = "REVERSED"


class VirtualWallet(BaseModel):
    """In-memory abstraction of merchant wallet state.
    
    Tracks:
    - available_balance: Settled funds ready for withdrawal/disbursement
    - pending_balance: Card payments awaiting T+1 clearing
    - total_lifetime: Total funds ever received (audit trail)
    """
    __tablename__ = "virtual_wallets"

    wallet_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Balance tracking in centavos (₱1.00 = 100 centavos)
    available_balance: Mapped[int] = mapped_column(Integer, default=0)  # Centavos
    pending_balance: Mapped[int] = mapped_column(Integer, default=0)    # Card T+1
    total_lifetime: Mapped[int] = mapped_column(Integer, default=0)     # Total received
    
    currency: Mapped[str] = mapped_column(String(3), default="PHP")


class LedgerEntry(BaseModel):
    """Immutable double-entry ledger record.
    
    Every transaction creates an entry that cannot be modified, ensuring
    complete audit trail and accounting integrity.
    """
    __tablename__ = "ledger_entries"

    wallet_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    
    # Transaction metadata
    entry_type: Mapped[LedgerEntryType] = mapped_column(Enum(LedgerEntryType), nullable=False)
    status: Mapped[LedgerEntryStatus] = mapped_column(Enum(LedgerEntryStatus), default=LedgerEntryStatus.SUCCESS)
    
    # Amount in centavos
    amount_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # External references
    external_reference: Mapped[str] = mapped_column(String(255), nullable=True, unique=True)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=True)
    
    # Optional metadata
    description: Mapped[str] = mapped_column(Text, nullable=True)
    metadata: Mapped[str] = mapped_column(Text, nullable=True)  # JSON-serialized
    
    # Settlement timestamp
    settled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class CardSettlementBatch(BaseModel):
    """Tracks daily T+1 card settlement cycles.
    
    Used for reconciliation and audit purposes.
    """
    __tablename__ = "card_settlement_batches"

    batch_date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    
    total_cleared: Mapped[int] = mapped_column(Integer, default=0)  # Centavos cleared
    wallet_count: Mapped[int] = mapped_column(Integer, default=0)   # Wallets processed
    
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")
