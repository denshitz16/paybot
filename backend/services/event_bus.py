import logging
import asyncio
import time
from typing import Dict, Any, List, Callable, Awaitable
from collections import deque

logger = logging.getLogger(__name__)

class EventBus:
    """System-wide event bus for synchronizing components."""
    
    _subscribers: Dict[str, List[Callable[[Dict[str, Any]], Awaitable[None]]]] = {}
    _events = deque(maxlen=100)
    _new_event_signal = asyncio.Condition()

    @classmethod
    def subscribe(cls, event_type: str, handler: Callable[[Dict[str, Any]], Awaitable[None]]):
        if event_type not in cls._subscribers:
            cls._subscribers[event_type] = []
        cls._subscribers[event_type].append(handler)
        logger.info(f"Subscribed to event: {event_type}")

    @classmethod
    async def emit(cls, event_type: str, data: Dict[str, Any]):
        """Emit an event and notify all subscribers."""
        logger.info(f"Emitting event: {event_type} - {data}")
        
        # Legacy support for publish() style data
        event_data = {**data, "timestamp": time.time(), "event_type": event_type}
        cls._events.append(event_data)

        async with cls._new_event_signal:
            cls._new_event_signal.notify_all()
        
        # Notify local async subscribers
        if event_type in cls._subscribers:
            tasks = [handler(data) for handler in cls._subscribers[event_type]]
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

        # Trigger specialized cross-component sync logic
        if event_type == "payment_completed":
            await cls._sync_payment_to_telegram(data)
        if event_type == "wallet_update":
            await cls._sync_wallet_update_to_telegram(data)

    @classmethod
    def publish(cls, data: Dict[str, Any]):
        """Sync wrapper for emit (legacy support)."""
        event_type = data.get("event_type", "status_change")
        # Run async emit in background if possible, or just append to deque
        data["timestamp"] = time.time()
        cls._events.append(data)
        
        # We can't easily wait for condition in sync, but we can notify if we have a loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(cls._notify_signal(), loop)
        except Exception:
            pass

    @classmethod
    async def _notify_signal(cls):
        async with cls._new_event_signal:
            cls._new_event_signal.notify_all()

    @classmethod
    async def wait_for_event(cls, timeout: float = 15.0) -> bool:
        try:
            async with cls._new_event_signal:
                await asyncio.wait_for(cls._new_event_signal.wait(), timeout=timeout)
                return True
        except asyncio.TimeoutError:
            return False

    @classmethod
    def get_events_since(cls, since_ts: float) -> List[Dict[str, Any]]:
        return [e for e in cls._events if e.get("timestamp", 0) > since_ts]

    @classmethod
    def get_recent_events(cls, limit: int = 20) -> List[Dict[str, Any]]:
        return list(cls._events)[-limit:]

    @classmethod
    async def _sync_payment_to_telegram(cls, data: Dict[str, Any]):
        """Specialized logic to send payment confirmation to Telegram user."""
        try:
            from services.telegram_service import TelegramService
            tg = TelegramService()
            
            user_id = data.get("user_id")
            amount = data.get("amount", 0) / 100
            order_id = data.get("order_id")
            terminal_id = data.get("terminal_id")
            
            # Format message
            message = (
                f"✅ <b>Payment Received!</b>\n\n"
                f"💰 Amount: ₱{amount:,.2f}\n"
                f"🆔 Order ID: <code>{order_id}</code>\n"
                f"📟 Terminal ID: {terminal_id}\n"
                f"🕒 Time: {data.get('completed_at', 'Just now')}\n\n"
                f"Your dashboard and terminal have been updated."
            )
            
            await tg.send_message(chat_id=user_id, text=message)
            logger.info(f"Synced payment {order_id} to Telegram user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to sync payment to Telegram: {e}")

    @classmethod
    async def _sync_wallet_update_to_telegram(cls, data: Dict[str, Any]):
        """Send a Telegram notification to the user for wallet credit/receive events."""
        try:
            from services.telegram_service import TelegramService
            tg = TelegramService()

            user_id = data.get("user_id") or ""
            # Normalize chat id: allow both "tg-123" and "123"
            chat_id = user_id[3:] if isinstance(user_id, str) and user_id.startswith("tg-") else user_id

            txn_type = data.get("transaction_type", "")
            amount = data.get("amount")
            balance = data.get("balance")

            # Only notify on credits / receipts
            credit_types = ("top_up", "receive", "crypto_topup", "usd_receive", "admin_credit")
            if txn_type not in credit_types:
                # If this is a debit/withdrawal, notify about bank processing time
                debit_types = ("withdraw", "send", "admin_debit")
                if txn_type in debit_types:
                    # Inform user that external bank processing may take 1-2 days
                    try:
                        note = data.get("note") or ""
                        amount = data.get("amount")
                        if amount is None:
                            amt_str = ""
                        else:
                            try:
                                amt_f = float(amount)
                                amt_str = f"₱{amt_f:,.2f}"
                            except Exception:
                                amt_str = str(amount)

                        bal_str = ""
                        if balance is not None:
                            try:
                                bal_f = float(balance)
                                bal_str = f"New balance: ₱{bal_f:,.2f}"
                            except Exception:
                                bal_str = f"New balance: {balance}"

                        message = (
                            f"✅ <b>Withdrawal Submitted</b>\n\n"
                            f"{amt_str}\n"
                            + (f"{note}\n" if note else "")
                            + (f"{bal_str}\n" if bal_str else "")
                            + "⏳ Bank processing typically takes 1–2 business days."
                        )
                        await tg.send_message(chat_id=chat_id, text=message)
                        logger.info(f"Notified Telegram user {chat_id} of withdrawal processing: {txn_type} {amount}")
                    except Exception as e:
                        logger.error(f"Failed to notify withdrawal to Telegram: {e}")
                return

            # Format amount (assume PHP floats for PHP wallet events)
            if amount is None:
                amt_str = ""
            else:
                try:
                    amt_f = float(amount)
                    amt_str = f"₱{amt_f:,.2f}" if data.get("currency", "PHP").upper() == "PHP" else f"${amt_f:,.2f}"
                except Exception:
                    amt_str = str(amount)

            bal_str = ""
            if balance is not None:
                try:
                    bal_f = float(balance)
                    bal_str = f"New balance: ₱{bal_f:,.2f}"
                except Exception:
                    bal_str = f"New balance: {balance}"

            note = data.get("note") or ""

            message = (
                f"✅ <b>Wallet Credited</b>\n\n"
                f"{amt_str}\n"
                + (f"{note}\n" if note else "")
                + (f"{bal_str}\n" if bal_str else "")
            )

            await tg.send_message(chat_id=chat_id, text=message)
            logger.info(f"Notified Telegram user {chat_id} of wallet update: {txn_type} {amount}")
        except Exception as e:
            logger.error(f"Failed to notify wallet update to Telegram: {e}")

event_bus = EventBus()
payment_event_bus = event_bus # Alias for legacy code
