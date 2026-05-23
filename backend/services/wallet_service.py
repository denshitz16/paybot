"""Wallet Service - Core ledger operations with T0/T1 card settlement.

Handles all wallet operations including deposits, withdrawals, transfers,
and automatic settlement of card payments.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.wallet_ledger import WalletAccount, LedgerEntry, CardSettlementConfig

logger = logging.getLogger(__name__)


class WalletService:
    """Wallet ledger service with double-entry bookkeeping."""

    @staticmethod
    async def get_or_create_wallet(db: AsyncSession, user_id: str, telegram_id: Optional[int] = None) -> WalletAccount:
        """Get existing wallet or create new one."""
        result = await db.execute(
            select(WalletAccount).where(WalletAccount.user_id == user_id)
        )
        wallet = result.scalars().first()

        if not wallet:
            wallet = WalletAccount(
                user_id=user_id,
                telegram_id=telegram_id,
                available_balance_centavos=0,
                pending_balance_centavos=0,
            )
            db.add(wallet)
            await db.commit()
            logger.info(f"Created wallet for user {user_id}")

        return wallet

    @staticmethod
    async def record_deposit(
        db: AsyncSession,
        user_id: str,
        amount_php: Decimal,
        payment_method: str,
        payment_gateway: str,
        external_reference: str,
        is_t0_settlement: bool = False,
        description: str = "",
    ) -> LedgerEntry:
        """Record a deposit transaction with automatic T0/T1 settlement.
        
        Args:
            user_id: Target wallet user ID
            amount_php: Amount in Philippine Pesos
            payment_method: 'QRPH', 'VISA', 'MASTERCARD', 'GCASH', etc.
            payment_gateway: 'PAYMONGO', 'XENDIT', 'MANUAL'
            external_reference: Payment gateway reference ID
            is_t0_settlement: If True, credit available balance immediately (T0).
                            If False, credit pending balance (T+1).
            description: Transaction description for audit
        
        Returns:
            LedgerEntry recording the deposit
        """
        amount_centavos = int(amount_php * 100)
        wallet = await WalletService.get_or_create_wallet(db, user_id)

        # Determine settlement behavior
        if is_t0_settlement or payment_method in ('QRPH', 'GCASH', 'GRABPAY'):
            # Instant/same-day settlement: credit available balance
            wallet.available_balance_centavos += amount_centavos
            settlement_status = 'INSTANT' if payment_method == 'QRPH' else 'T0_SETTLEMENT'
            account_type = 'AVAILABLE'
        else:
            # T+1 settlement: credit pending balance (legacy card behavior)
            wallet.pending_balance_centavos += amount_centavos
            settlement_status = 'PENDING_T1'
            account_type = 'PENDING'

        # Create immutable ledger entry
        entry = LedgerEntry(
            transaction_id=f"{payment_gateway}-{external_reference}",
            wallet_id=user_id,
            account_type=account_type,
            transaction_type=f"{payment_method}_DEPOSIT_{settlement_status}",
            amount_centavos=amount_centavos,
            balance_after_centavos=wallet.available_balance_centavos + wallet.pending_balance_centavos,
            settlement_status=settlement_status,
            external_reference=external_reference,
            payment_method=payment_method,
            payment_gateway=payment_gateway,
            description=description or f"Deposit via {payment_method}",
            created_at=datetime.utcnow(),
            settled_at=datetime.utcnow() if settlement_status in ('INSTANT', 'T0_SETTLEMENT') else None,
        )

        db.add(wallet)
        db.add(entry)
        await db.commit()

        logger.info(
            f"Recorded deposit: user={user_id} amount={amount_php:.2f} php "
            f"method={payment_method} settlement={settlement_status}"
        )

        return entry

    @staticmethod
    async def record_withdrawal(
        db: AsyncSession,
        user_id: str,
        amount_php: Decimal,
        bank_code: str,
        account_number: str,
        recipient_name: str,
        external_reference: str,
        description: str = "",
    ) -> LedgerEntry:
        """Record a bank withdrawal/disbursement (money-out).
        
        Deducts from available balance immediately (pessimistic lock).
        """
        amount_centavos = int(amount_php * 100)
        wallet = await WalletService.get_or_create_wallet(db, user_id)

        if wallet.available_balance_centavos < amount_centavos:
            raise ValueError(
                f"Insufficient balance. Available: {wallet.available_balance_centavos/100:.2f} php, "
                f"Requested: {amount_php:.2f} php"
            )

        # Deduct immediately
        wallet.available_balance_centavos -= amount_centavos

        entry = LedgerEntry(
            transaction_id=f"WITHDRAWAL-{external_reference}",
            wallet_id=user_id,
            account_type='AVAILABLE',
            transaction_type='BANK_WITHDRAWAL',
            amount_centavos=amount_centavos,
            balance_after_centavos=wallet.available_balance_centavos,
            settlement_status='SETTLED',
            external_reference=external_reference,
            payment_method=f"{bank_code}_{account_number[-4:]}",
            payment_gateway='INSTAPAY',
            description=description or f"Withdrawal to {bank_code} ({recipient_name})",
            created_at=datetime.utcnow(),
            settled_at=datetime.utcnow(),
        )

        db.add(wallet)
        db.add(entry)
        await db.commit()

        logger.info(
            f"Recorded withdrawal: user={user_id} amount={amount_php:.2f} php "
            f"bank={bank_code} account=***{account_number[-4:]}"
        )

        return entry

    @staticmethod
    async def settle_pending_cards(
        db: AsyncSession,
        user_id: Optional[str] = None,
    ) -> int:
        """Move pending T+1 card balances to available (settlement sweep).
        
        Typically run daily as a batch job (5 AM sweep).
        
        Args:
            user_id: If provided, only settle for this user. Otherwise, settle all.
        
        Returns:
            Number of wallets updated
        """
        if user_id:
            query = select(WalletAccount).where(
                (WalletAccount.user_id == user_id) &
                (WalletAccount.pending_balance_centavos > 0)
            )
        else:
            query = select(WalletAccount).where(WalletAccount.pending_balance_centavos > 0)

        result = await db.execute(query)
        wallets = result.scalars().all()

        updated_count = 0
        for wallet in wallets:
            if wallet.pending_balance_centavos > 0:
                # Move pending to available
                amount = wallet.pending_balance_centavos
                wallet.available_balance_centavos += amount
                wallet.pending_balance_centavos = 0

                # Record settlement entry
                entry = LedgerEntry(
                    transaction_id=f"SETTLEMENT-SWEEP-{wallet.user_id}-{datetime.utcnow().timestamp()}",
                    wallet_id=wallet.user_id,
                    account_type='AVAILABLE',
                    transaction_type='CARD_SETTLEMENT_T1_CLEAR',
                    amount_centavos=amount,
                    balance_after_centavos=wallet.available_balance_centavos,
                    settlement_status='SETTLED',
                    external_reference=f"DAILY_SWEEP_{datetime.utcnow().date()}",
                    payment_gateway='SYSTEM',
                    description=f"Daily T+1 card settlement sweep (₱{amount/100:.2f})",
                    created_at=datetime.utcnow(),
                    settled_at=datetime.utcnow(),
                )

                db.add(wallet)
                db.add(entry)
                updated_count += 1

                logger.info(
                    f"Settled pending balance: user={wallet.user_id} "
                    f"amount={amount/100:.2f} php"
                )

        if updated_count > 0:
            await db.commit()
            logger.info(f"Card settlement sweep complete: {updated_count} wallets updated")

        return updated_count

    @staticmethod
    async def get_wallet_balance(
        db: AsyncSession,
        user_id: str,
    ) -> dict:
        """Get current wallet balance (available + pending)."""
        wallet = await WalletService.get_or_create_wallet(db, user_id)

        return {
            "user_id": user_id,
            "available_balance_php": wallet.available_balance_centavos / 100,
            "pending_balance_php": wallet.pending_balance_centavos / 100,
            "total_balance_php": (wallet.available_balance_centavos + wallet.pending_balance_centavos) / 100,
            "usd_balance": wallet.usd_balance_centavos / 100,
            "usdt_address": wallet.usdt_trc20_address,
            "kyc_verified": wallet.kyc_verified,
            "is_active": wallet.is_active,
            "created_at": wallet.created_at.isoformat(),
        }

    @staticmethod
    async def get_ledger_history(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list:
        """Get transaction history for a wallet."""
        result = await db.execute(
            select(LedgerEntry)
            .where(LedgerEntry.wallet_id == user_id)
            .order_by(LedgerEntry.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        entries = result.scalars().all()

        return [
            {
                "id": e.id,
                "transaction_id": e.transaction_id,
                "transaction_type": e.transaction_type,
                "amount_php": e.amount_centavos / 100,
                "balance_after_php": e.balance_after_centavos / 100,
                "settlement_status": e.settlement_status,
                "payment_method": e.payment_method,
                "external_reference": e.external_reference,
                "created_at": e.created_at.isoformat(),
                "settled_at": e.settled_at.isoformat() if e.settled_at else None,
                "description": e.description,
            }
            for e in entries
        ]
