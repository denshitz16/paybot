"""
Wallet Sync Service — Unified wallet balance synchronization across all platforms.

Ensures:
  - Dashboard displays correct balance from database
  - Telegram bot shows live PayMongo balance with DB fallback
  - Real-time event broadcasting on wallet changes
  - Consistent user_id formatting (no prefix inconsistencies)
  - Proper notifications for all wallet operations
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import select, case, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.wallets import Wallets
from models.wallet_transactions import Wallet_transactions
from services.event_bus import payment_event_bus
from services.paymongo_service import PayMongoService

logger = logging.getLogger(__name__)

# Transaction types that affect wallet balance
_PHP_CREDIT_TYPES = ("top_up", "receive", "admin_credit", "payment_received")
_PHP_DEBIT_TYPES = ("send", "withdraw", "admin_debit", "payment_sent")
_USD_CREDIT_TYPES = ("crypto_topup", "usd_receive", "admin_credit")
_USD_DEBIT_TYPES = ("usdt_send", "usd_send", "admin_debit")


class WalletSyncService:
    """Unified wallet synchronization for PHP, USD, and USDT wallets."""

    @staticmethod
    def normalize_user_id(user_id: str, currency: str = "PHP") -> str:
        """Normalize user_id: remove 'tg-' prefix for PHP, keep for USD.
        
        Args:
            user_id: Raw user ID (may include 'tg-' prefix)
            currency: Wallet currency (PHP, USD)
            
        Returns:
            Normalized user_id without extra prefixes
        """
        cleaned = user_id.strip()
        if currency.upper() == "PHP" and cleaned.startswith("tg-"):
            return cleaned[3:]
        return cleaned

    @staticmethod
    def get_telegram_prefixed_id(user_id: str) -> str:
        """Add 'tg-' prefix for internal Telegram wallet storage."""
        cleaned = user_id.strip().lstrip("tg-")
        return f"tg-{cleaned}"

    @staticmethod
    async def get_or_create_wallet(
        db: AsyncSession,
        user_id: str,
        currency: str = "PHP",
    ) -> Wallets:
        """Get or create a wallet, ensuring normalized user_id."""
        normalized_id = WalletSyncService.normalize_user_id(user_id, currency)
        currency_upper = currency.upper()

        # Try to find wallet with normalized ID
        result = await db.execute(
            select(Wallets).where(
                Wallets.user_id == normalized_id,
                Wallets.currency == currency_upper,
            )
        )
        wallet = result.scalar_one_or_none()

        if wallet:
            return wallet

        # Check for legacy "tg-" prefixed wallet (PHP only)
        if currency_upper == "PHP":
            legacy_id = WalletSyncService.get_telegram_prefixed_id(normalized_id)
            result = await db.execute(
                select(Wallets).where(
                    Wallets.user_id == legacy_id,
                    Wallets.currency == "PHP",
                )
            )
            wallet = result.scalar_one_or_none()
            if wallet:
                # Migrate to normalized ID
                wallet.user_id = normalized_id
                wallet.updated_at = datetime.now()
                await db.commit()
                await db.refresh(wallet)
                logger.info(f"Migrated wallet from {legacy_id} to {normalized_id}")
                return wallet

        # Create new wallet
        now = datetime.now()
        new_wallet = Wallets(
            user_id=normalized_id,
            currency=currency_upper,
            balance=0.0,
            created_at=now,
            updated_at=now,
        )
        db.add(new_wallet)
        await db.flush()
        return new_wallet

    @staticmethod
    async def get_php_balance_live(
        db: AsyncSession,
        user_id: str,
        skip_paymongo: bool = False,
    ) -> float:
        """Get PHP balance from live PayMongo account, fallback to DB.
        
        Args:
            db: Database session
            user_id: Normalized user ID
            skip_paymongo: If True, skip PayMongo and use DB only
            
        Returns:
            Balance in PHP (as float)
        """
        # Try live PayMongo balance first
        if not skip_paymongo:
            try:
                pm_svc = PayMongoService()
                result = await pm_svc.get_balance()
                if result.get("success"):
                    available = result.get("available", [])
                    php_entry = next(
                        (e for e in available if e.get("currency", "").upper() == "PHP"),
                        None,
                    )
                    if php_entry is not None:
                        balance = float(php_entry["amount"]) / 100.0
                        logger.debug(f"PHP balance from PayMongo: ₱{balance:.2f}")
                        return balance
            except Exception as e:
                logger.warning(f"PayMongo balance fetch failed: {e}")

        # Fallback to DB wallet
        normalized_id = WalletSyncService.normalize_user_id(user_id, "PHP")
        result = await db.execute(
            select(Wallets).where(
                Wallets.user_id == normalized_id,
                Wallets.currency == "PHP",
            )
        )
        wallet = result.scalar_one_or_none()
        if wallet:
            return float(wallet.balance or 0.0)
        return 0.0

    @staticmethod
    async def compute_usd_balance(
        db: AsyncSession,
        user_id: str,
    ) -> float:
        """Compute USD balance from transaction history (credits - debits).
        
        Args:
            db: Database session
            user_id: User ID (with or without tg- prefix)
            
        Returns:
            USD balance as float
        """
        # Use the provided user_id as-is for transaction lookup
        result = await db.execute(
            select(
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Wallet_transactions.transaction_type.in_(_USD_CREDIT_TYPES),
                                Wallet_transactions.amount,
                            ),
                            else_=0.0,
                        )
                    ),
                    0.0,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Wallet_transactions.transaction_type.in_(_USD_DEBIT_TYPES),
                                Wallet_transactions.amount,
                            ),
                            else_=0.0,
                        )
                    ),
                    0.0,
                ),
            ).where(
                Wallet_transactions.user_id == user_id,
                Wallet_transactions.status == "completed",
            )
        )
        credits, debits = result.one()
        balance = max(0.0, float(credits or 0.0) - float(debits or 0.0))
        return balance

    @staticmethod
    async def publish_wallet_event(
        user_id: str,
        wallet: Wallets,
        txn_type: str,
        amount: float,
        txn_id: int,
        recipient: Optional[str] = None,
    ) -> None:
        """Publish wallet update event for real-time dashboard/bot sync.
        
        Args:
            user_id: User performing the transaction
            wallet: Wallet object
            txn_type: Transaction type (send, receive, withdraw, etc.)
            amount: Transaction amount
            txn_id: Transaction record ID
            recipient: Optional recipient user_id or name
        """
        event = {
            "event_type": "wallet_update",
            "user_id": user_id,
            "wallet_id": wallet.id,
            "balance": wallet.balance,
            "currency": wallet.currency,
            "transaction_type": txn_type,
            "amount": amount,
            "transaction_id": txn_id,
        }
        if recipient:
            event["recipient"] = recipient

        try:
            payment_event_bus.publish(event)
            logger.debug(f"Published wallet event: {txn_type} for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to publish wallet event: {e}")

    @staticmethod
    async def notify_wallet_transfer(
        tg_service: Any,
        chat_id: str,
        txn_type: str,
        amount: float,
        currency: str = "PHP",
        sender: Optional[str] = None,
        recipient: Optional[str] = None,
        new_balance: Optional[float] = None,
    ) -> None:
        """Send wallet transfer notification to user via Telegram.
        
        Args:
            tg_service: TelegramService instance
            chat_id: Telegram chat ID
            txn_type: Transaction type (send, receive, withdraw, etc.)
            amount: Amount transferred
            currency: Currency (PHP, USD)
            sender: Sender name/username (for incoming transfers)
            recipient: Recipient name/username (for outgoing transfers)
            new_balance: New balance after transaction
        """
        symbol = "₱" if currency == "PHP" else "$"
        curr_display = "PHP" if currency == "PHP" else "USD"

        if txn_type == "send":
            message = (
                f"💸 <b>Money Sent!</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 Amount: <b>{symbol}{amount:,.2f} {curr_display}</b>\n"
                f"👤 To: <b>{recipient}</b>\n"
            )
        elif txn_type == "receive":
            message = (
                f"💵 <b>Money Received!</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 Amount: <b>{symbol}{amount:,.2f} {curr_display}</b>\n"
                f"👤 From: <b>{sender}</b>\n"
            )
        elif txn_type == "withdraw":
            message = (
                f"💸 <b>Withdrawal Processed!</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 Amount: <b>{symbol}{amount:,.2f} {curr_display}</b>\n"
            )
        elif txn_type == "top_up":
            message = (
                f"⬆️ <b>Wallet Topped Up!</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 Amount: <b>{symbol}{amount:,.2f} {curr_display}</b>\n"
            )
        elif txn_type == "payment_received":
            message = (
                f"✅ <b>Payment Received!</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 Amount: <b>{symbol}{amount:,.2f} {curr_display}</b>\n"
            )
        else:
            message = (
                f"💳 <b>Wallet Updated!</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 Amount: <b>{symbol}{amount:,.2f} {curr_display}</b>\n"
            )

        if new_balance is not None:
            message += f"💰 New Balance: <b>{symbol}{new_balance:,.2f}</b>\n"

        message += f"🕐 {datetime.now().strftime('%b %d, %H:%M')}"

        try:
            await tg_service.send_message(chat_id, message)
            logger.info(f"Sent {txn_type} notification to chat {chat_id}")
        except Exception as e:
            logger.error(f"Failed to send wallet notification: {e}")
