"""Wallet Ledger Models - Double-Entry Bookkeeping for PayBot.

This module implements a complete ledger system for wallet transactions,
tracking both available (settled) and pending (T+1) balances separately.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, String, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class WalletAccount(Base):
    """User wallet account (asset side of ledger).
    
    Tracks both:
    - available_balance_centavos: Settled funds ready for withdrawal/transfer
    - pending_balance_centavos: Card payments settling T+1 (legacy) or T0 (modern)
    """

    __tablename__ = "wallet_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    telegram_id: Mapped[Optional[int]] = mapped_column(BigInteger, index=True)
    
    # Balance in centavos (₱ * 100 for precision)
    available_balance_centavos: Mapped[int] = mapped_column(BigInteger, default=0)
    pending_balance_centavos: Mapped[int] = mapped_column(BigInteger, default=0)
    
    # Multi-currency support
    usd_balance_centavos: Mapped[int] = mapped_column(BigInteger, default=0)
    usdt_trc20_address: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Account metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    kyc_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<WalletAccount user_id={self.user_id} available={self.available_balance_centavos/100:.2f} php>"


class LedgerEntry(Base):
    """Immutable ledger entry (journal).
    
    Each transaction creates one or more immutable ledger entries.
    Supports double-entry bookkeeping with debit/credit structure.
    """

    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Transaction context
    transaction_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    wallet_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    
    # Ledger account (asset, liability, revenue, expense)
    account_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        # Valid values: 'AVAILABLE', 'PENDING', 'USD_WALLET', 'REVENUE', 'EXPENSE'
    )
    
    # Transaction type for audit trail
    transaction_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        # Examples: 'QR_DEPOSIT_INSTANT', 'CARD_DEPOSIT_T0', 'CARD_DEPOSIT_T1',
        #           'BANK_WITHDRAWAL', 'P2P_TRANSFER', 'REFUND', 'FEE_DEDUCTION'
    )
    
    # Amount in centavos (always positive; direction indicated by account_type)
    amount_centavos: Mapped[int] = mapped_column(BigInteger, nullable=False)
    
    # Balance after this entry (for audit/reconciliation)
    balance_after_centavos: Mapped[int] = mapped_column(BigInteger)
    
    # Settlement status
    settlement_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        # 'INSTANT' (QR), 'T0_SETTLEMENT' (card with same-day), 'PENDING_T1' (legacy card),
        # 'SETTLED' (completed), 'FAILED', 'REVERSED'
    )
    
    # External reference (payment gateway ref, invoice ID, etc.)
    external_reference: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    
    # Payment method details
    payment_method: Mapped[Optional[str]] = mapped_column(String(100))
    payment_gateway: Mapped[Optional[str]] = mapped_column(String(100))  # 'PAYMONGO', 'XENDIT', 'MANUAL'
    
    # Description for audit
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, index=True)
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_wallet_type_created', 'wallet_id', 'transaction_type', 'created_at'),
        Index('idx_transaction_id', 'transaction_id'),
        Index('idx_settlement_status', 'settlement_status'),
    )

    def __repr__(self) -> str:
        return (
            f"<LedgerEntry wallet={self.wallet_id} type={self.transaction_type} "
            f"amount={self.amount_centavos/100:.2f} status={self.settlement_status}>"
        )


class CardSettlementConfig(Base):
    """Configuration for card settlement behavior.
    
    Determines whether card deposits settle T0 (same-day) or T+1 (next-day).
    Can be configured per payment gateway or globally.
    """

    __tablename__ = "card_settlement_configs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    
    # Scope: 'GLOBAL', 'GATEWAY', or 'MERCHANT'
    scope: Mapped[str] = mapped_column(String(50), nullable=False, default='GLOBAL')
    scope_id: Mapped[Optional[str]] = mapped_column(String(255), index=True)  # Gateway name or merchant ID
    
    # Settlement behavior
    settlement_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        # 'T0' (same-day), 'T1' (next-day), 'MANUAL' (admin approval required)
    )
    
    # Fee structure for T0 settlement (if applicable)
    t0_fee_percent: Mapped[float] = mapped_column(default=0.0)  # e.g., 0.5% for T0 acceleration
    
    # Payment method filter
    applicable_payment_methods: Mapped[Optional[str]] = mapped_column(
        Text,
        # Comma-separated: 'VISA,MASTERCARD,AMEX' or 'ALL'
    )
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<CardSettlementConfig scope={self.scope} type={self.settlement_type}>"
