from core.database import Base
from sqlalchemy import Column, DateTime, Boolean, Integer, String, Text, Index, JSON, Enum
from sqlalchemy.sql import func
import enum


class TerminalStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"


class PaymentMethod(str, enum.Enum):
    MAYA = "maya"
    CARD = "card"
    GCASH = "gcash"
    GRABPAY = "grabpay"
    PAYMONGO = "paymongo"
    XENDIT = "xendit"


class POSTerminal(Base):
    """Represents a virtual POS terminal assigned to a merchant/customer."""
    __tablename__ = "pos_terminals"
    __table_args__ = (
        Index("idx_terminal_code", "terminal_code"),
        Index("idx_terminal_user_id", "user_id"),
        Index("idx_terminal_status", "status"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    
    # Terminal identification
    terminal_code = Column(String(50), unique=True, nullable=False, index=True)
    terminal_name = Column(String(255), nullable=False)
    
    # Assignment
    user_id = Column(String(64), nullable=False, index=True)  # Telegram user ID
    merchant_id = Column(String(64), nullable=True)  # Reference to merchant account
    
    # Status
    status = Column(String(20), default=TerminalStatus.UNASSIGNED, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Configuration
    enabled_payment_methods = Column(JSON, default=lambda: [pm.value for pm in PaymentMethod], nullable=False)
    daily_transaction_limit = Column(Integer, nullable=True)  # In PHP
    max_transaction_amount = Column(Integer, nullable=True)   # In PHP
    
    # Metadata
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    # Audit
    assigned_by = Column(String(64), nullable=True)  # Telegram ID of admin who assigned
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deactivated_at = Column(DateTime(timezone=True), nullable=True)


class POSTerminalRequest(Base):
    """Represents a customer request for a POS terminal."""
    __tablename__ = "pos_terminal_requests"
    __table_args__ = (
        Index("idx_request_user_id", "user_id"),
        Index("idx_request_status", "status"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    
    # Request details
    user_id = Column(String(64), nullable=False, index=True)  # Telegram user ID
    user_name = Column(String(255), nullable=False)
    user_email = Column(String(255), nullable=True)
    user_phone = Column(String(20), nullable=True)
    
    # Request info
    business_name = Column(String(255), nullable=False)
    business_type = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    # Required payment methods
    required_payment_methods = Column(JSON, default=lambda: [PaymentMethod.MAYA.value], nullable=False)
    
    # Estimated transaction volume
    monthly_transaction_volume = Column(Integer, nullable=True)
    average_transaction_amount = Column(Integer, nullable=True)
    
    # Status
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, approved, rejected
    rejection_reason = Column(Text, nullable=True)
    
    # Assigned terminal (if approved)
    assigned_terminal_id = Column(Integer, nullable=True)
    
    # Approval info
    reviewed_by = Column(String(64), nullable=True)  # Telegram ID of admin
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class POSTerminalTransaction(Base):
    """Represents a transaction made through a POS terminal."""
    __tablename__ = "pos_terminal_transactions"
    __table_args__ = (
        Index("idx_pos_txn_terminal_id", "terminal_id"),
        Index("idx_pos_txn_user_id", "user_id"),
        Index("idx_pos_txn_status", "status"),
        {"extend_existing": True},
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    
    # Transaction details
    terminal_id = Column(Integer, nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    
    # Order/Payment info
    order_id = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=False)
    amount = Column(Integer, nullable=False)  # Amount in PHP (cents)
    currency = Column(String(3), default="PHP", nullable=False)
    
    # Payment method used
    payment_method = Column(String(50), nullable=False)
    
    # Payment gateway references
    maya_checkout_id = Column(String(255), nullable=True)
    paymongo_checkout_id = Column(String(255), nullable=True)
    xendit_invoice_id = Column(String(255), nullable=True)
    payment_url = Column(String(2048), nullable=True)
    
    # Customer info
    customer_name = Column(String(255), nullable=True)
    customer_email = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    
    # Status tracking
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, completed, failed, cancelled
    failure_reason = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
