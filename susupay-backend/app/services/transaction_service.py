"""
Transaction business logic.

Handles SMS submission, screenshot submission, confirmation, querying, and rejection.
All queries scoped by collector_id for multi-tenant isolation.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.collector import Collector
from app.models.transaction import Transaction
from app.services.sms_parser import ParsedSMS, parse_mtn_sms
from app.services.validator import ValidationResult, validate_submission


async def submit_sms(
    db: AsyncSession,
    collector: Collector,
    client_id: uuid.UUID,
    sms_text: str,
) -> tuple[Transaction, ParsedSMS, ValidationResult]:
    """Process an SMS text submission."""
    # Verify client belongs to this collector
    client = await _get_client_for_collector(db, client_id, collector.id)

    # Parse SMS
    parsed = parse_mtn_sms(sms_text)

    # Validate
    validation = await validate_submission(db, parsed, collector)

    # Determine status
    if validation.auto_reject:
        status = "AUTO_REJECTED"
    else:
        status = "PENDING"

    # Don't store mtn_txn_id for auto-rejected duplicates (unique constraint)
    store_txn_id = None if validation.auto_reject else parsed.transaction_id

    txn = Transaction(
        collector_id=collector.id,
        client_id=client.id,
        amount=parsed.amount or 0,
        mtn_txn_id=store_txn_id,
        submission_type="SMS_TEXT",
        trust_level=validation.trust_level,
        status=status,
        validation_flags=validation.flags or None,
        raw_sms_text=sms_text,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    return txn, parsed, validation


async def submit_screenshot(
    db: AsyncSession,
    collector: Collector,
    client_id: uuid.UUID,
    amount: float,
    screenshot_key: str | None = None,
) -> Transaction:
    """Process a screenshot submission (LOW trust)."""
    client = await _get_client_for_collector(db, client_id, collector.id)

    txn = Transaction(
        collector_id=collector.id,
        client_id=client.id,
        amount=amount,
        submission_type="SCREENSHOT",
        trust_level="LOW",
        status="PENDING",
        screenshot_key=screenshot_key,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)

    return txn


async def get_pending_feed(
    db: AsyncSession,
    collector_id: uuid.UUID,
) -> list[dict]:
    """Get all pending transactions for a collector, with client names."""
    result = await db.execute(
        select(Transaction, Client.full_name)
        .join(Client, Transaction.client_id == Client.id)
        .where(
            Transaction.collector_id == collector_id,
            Transaction.status == "PENDING",
        )
        .order_by(Transaction.submitted_at.asc())
    )
    items = []
    for txn, client_name in result.all():
        items.append(
            {
                "id": txn.id,
                "client_id": txn.client_id,
                "client_name": client_name,
                "amount": txn.amount,
                "submission_type": txn.submission_type,
                "trust_level": txn.trust_level,
                "status": txn.status,
                "validation_flags": txn.validation_flags,
                "submitted_at": txn.submitted_at,
                "confirmed_at": txn.confirmed_at,
                "collector_note": txn.collector_note,
            }
        )
    return items


async def get_collector_transactions(
    db: AsyncSession,
    collector_id: uuid.UUID,
    status_filter: str | None = None,
) -> list[dict]:
    """Get transactions for a collector, optionally filtered by status."""
    query = (
        select(Transaction, Client.full_name)
        .join(Client, Transaction.client_id == Client.id)
        .where(Transaction.collector_id == collector_id)
    )
    if status_filter:
        query = query.where(Transaction.status == status_filter)
    query = query.order_by(Transaction.submitted_at.desc())

    result = await db.execute(query)
    items = []
    for txn, client_name in result.all():
        items.append(
            {
                "id": txn.id,
                "client_id": txn.client_id,
                "client_name": client_name,
                "amount": txn.amount,
                "submission_type": txn.submission_type,
                "trust_level": txn.trust_level,
                "status": txn.status,
                "validation_flags": txn.validation_flags,
                "submitted_at": txn.submitted_at,
                "confirmed_at": txn.confirmed_at,
                "collector_note": txn.collector_note,
            }
        )
    return items


async def confirm_transaction(
    db: AsyncSession,
    txn_id: uuid.UUID,
    collector_id: uuid.UUID,
) -> Transaction:
    """Collector confirms a PENDING or QUERIED transaction."""
    txn = await _get_transaction_for_collector(db, txn_id, collector_id)

    if txn.status not in ("PENDING", "QUERIED"):
        raise ValueError(f"Cannot confirm transaction with status {txn.status}")

    txn.status = "CONFIRMED"
    txn.confirmed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(txn)
    return txn


async def query_transaction(
    db: AsyncSession,
    txn_id: uuid.UUID,
    collector_id: uuid.UUID,
    note: str,
) -> Transaction:
    """Collector queries a PENDING transaction."""
    txn = await _get_transaction_for_collector(db, txn_id, collector_id)

    if txn.status != "PENDING":
        raise ValueError(f"Cannot query transaction with status {txn.status}")

    txn.status = "QUERIED"
    txn.collector_note = note
    await db.commit()
    await db.refresh(txn)
    return txn


async def reject_transaction(
    db: AsyncSession,
    txn_id: uuid.UUID,
    collector_id: uuid.UUID,
    note: str,
) -> Transaction:
    """Collector rejects a QUERIED transaction."""
    txn = await _get_transaction_for_collector(db, txn_id, collector_id)

    if txn.status != "QUERIED":
        raise ValueError(f"Cannot reject transaction with status {txn.status}")

    txn.status = "REJECTED"
    txn.collector_note = note
    await db.commit()
    await db.refresh(txn)
    return txn


async def get_client_history(
    db: AsyncSession,
    client_id: uuid.UUID,
) -> list[Transaction]:
    """Get all transactions for a specific client."""
    result = await db.execute(
        select(Transaction)
        .where(
            Transaction.client_id == client_id,
            Transaction.status != "AUTO_REJECTED",
        )
        .order_by(Transaction.submitted_at.desc())
    )
    return list(result.scalars().all())


async def _get_client_for_collector(
    db: AsyncSession,
    client_id: uuid.UUID,
    collector_id: uuid.UUID,
) -> Client:
    """Fetch a client, enforcing multi-tenant isolation."""
    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.collector_id == collector_id,
        )
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise ValueError("Client not found in your group")
    return client


async def _get_transaction_for_collector(
    db: AsyncSession,
    txn_id: uuid.UUID,
    collector_id: uuid.UUID,
) -> Transaction:
    """Fetch a transaction, enforcing multi-tenant isolation."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            Transaction.collector_id == collector_id,
        )
    )
    txn = result.scalar_one_or_none()
    if txn is None:
        raise ValueError("Transaction not found")
    return txn
