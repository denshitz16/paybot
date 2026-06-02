"""
Wallet Integration — Real-time event handling for wallet updates.

Listens to wallet_update events from the event bus and:
  - Sends Telegram notifications
  - Updates dashboard in real-time via WebSocket
  - Triggers balance refreshes
"""
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin_users import AdminUser
from services.event_bus import event_bus
from services.telegram_service import TelegramService
from services.wallet_sync_service import WalletSyncService

logger = logging.getLogger(__name__)


class WalletIntegrationService:
    """Handle real-time wallet event integration."""

    @staticmethod
    async def handle_wallet_update_event(data: Dict[str, Any], db: AsyncSession) -> None:
        """Process wallet_update event and notify relevant parties.
        
        Args:
            data: Event data from event bus
            db: Database session
        """
        try:
            user_id = data.get("user_id")
            txn_type = data.get("transaction_type", "")
            amount = data.get("amount", 0)
            currency = data.get("currency", "PHP")
            from_user = data.get("from_user")  # For receive events

            # Only send Telegram notifications for specific transaction types
            if txn_type not in ("send", "receive", "withdraw", "top_up", "payment_received"):
                return

            # Look up user's Telegram chat ID
            result = await db.execute(
                select(AdminUser).where(
                    AdminUser.telegram_id == user_id,
                    AdminUser.is_active.is_(True),
                )
            )
            recipient = result.scalar_one_or_none()

            if not recipient:
                logger.debug(f"User {user_id} not found for notification")
                return

            # Prepare notification message
            symbol = "₱" if currency == "PHP" else "$"
            if txn_type == "send":
                message = (
                    f"💸 <b>Money Sent!</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 Amount: <b>{symbol}{amount:,.2f}</b>\n"
                    f"💰 New Balance: <b>{symbol}{data.get('balance', 0):,.2f}</b>\n"
                    f"🕐 {datetime.now().strftime('%b %d, %H:%M')}"
                )
            elif txn_type == "receive":
                sender_display = from_user or data.get("from_user", "Unknown")
                message = (
                    f"💵 <b>Money Received!</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 Amount: <b>{symbol}{amount:,.2f}</b>\n"
                    f"👤 From: <b>{sender_display}</b>\n"
                    f"💰 New Balance: <b>{symbol}{data.get('balance', 0):,.2f}</b>\n"
                    f"🕐 {datetime.now().strftime('%b %d, %H:%M')}"
                )
            elif txn_type == "withdraw":
                message = (
                    f"💸 <b>Withdrawal Processed!</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 Amount: <b>{symbol}{amount:,.2f}</b>\n"
                    f"💰 New Balance: <b>{symbol}{data.get('balance', 0):,.2f}</b>\n"
                    f"🕐 {datetime.now().strftime('%b %d, %H:%M')}"
                )
            elif txn_type == "top_up":
                message = (
                    f"⬆️ <b>Wallet Topped Up!</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 Amount: <b>{symbol}{amount:,.2f}</b>\n"
                    f"💰 New Balance: <b>{symbol}{data.get('balance', 0):,.2f}</b>\n"
                    f"🕐 {datetime.now().strftime('%b %d, %H:%M')}"
                )
            elif txn_type == "payment_received":
                message = (
                    f"✅ <b>Payment Received!</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n"
                    f"💰 Amount: <b>{symbol}{amount:,.2f}</b>\n"
                    f"💰 New Balance: <b>{symbol}{data.get('balance', 0):,.2f}</b>\n"
                    f"🕐 {datetime.now().strftime('%b %d, %H:%M')}"
                )
            else:
                return

            # Send Telegram notification
            tg = TelegramService()
            await tg.send_message(recipient.telegram_id, message)
            logger.info(f"Sent {txn_type} notification to user {user_id}")

        except Exception as e:
            logger.error(f"Failed to handle wallet update event: {e}", exc_info=True)


def initialize_wallet_event_handlers() -> None:
    """Initialize wallet event handlers on startup.
    
    Call this during application startup to enable real-time wallet notifications.
    """
    async def wallet_update_listener() -> None:
        """Listen for wallet_update events and process them."""
        from core.database import db_manager
        
        while True:
            try:
                # Wait for event with timeout
                has_event = await event_bus.wait_for_event(timeout=30.0)
                if not has_event:
                    continue

                # Get recent events
                recent = event_bus.get_recent_events(limit=10)
                for event in recent:
                    if event.get("event_type") == "wallet_update":
                        # Process in background to not block event bus
                        try:
                            async with db_manager.async_session_maker() as db:
                                await WalletIntegrationService.handle_wallet_update_event(
                                    event, db
                                )
                        except Exception as e:
                            logger.error(f"Error processing event: {e}")

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Wallet event listener error: {e}", exc_info=True)
                await asyncio.sleep(5)  # Retry after delay

    # Start listener in background
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    loop.create_task(wallet_update_listener())
    logger.info("Wallet event handlers initialized")


# Auto-initialize on module import
try:
    initialize_wallet_event_handlers()
except Exception as e:
    logger.warning(f"Could not initialize wallet handlers: {e}")
