"""
Transaction business logic.

Handles SMS submission, screenshot submission, confirmation, querying, and rejection.
All queries scoped by collector_id for multi-tenant isolation.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
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


async def submit_sms_as_client(
    db: AsyncSession,
    client: Client,
    sms_text: str,
) -> tuple[Transaction, ParsedSMS, ValidationResult]:
    """Process an SMS text submission from a client directly."""
    collector = await _get_collector_for_client(db, client)

    parsed = parse_mtn_sms(sms_text)
    validation = await validate_submission(db, parsed, collector)

    if validation.auto_reject:
        status = "AUTO_REJECTED"
    else:
        status = "PENDING"

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


async def submit_screenshot_as_client(
    db: AsyncSession,
    client: Client,
    amount: float,
    screenshot_key: str | None = None,
) -> Transaction:
    """Process a screenshot submission from a client directly (LOW trust)."""
    collector = await _get_collector_for_client(db, client)

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
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """Get pending transactions for a collector, with client names (paginated)."""
    where_clause = [
        Transaction.collector_id == collector_id,
        Transaction.status == "PENDING",
    ]

    # Count total
    count_result = await db.execute(
        select(func.count())
        .select_from(Transaction)
        .where(*where_clause)
    )
    total = count_result.scalar_one()

    # Fetch page
    result = await db.execute(
        select(Transaction, Client.full_name)
        .join(Client, Transaction.client_id == Client.id)
        .where(*where_clause)
        .order_by(Transaction.submitted_at.asc())
        .offset(skip)
        .limit(limit)
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
    return {"items": items, "total": total, "skip": skip, "limit": limit}


async def get_collector_transactions(
    db: AsyncSession,
    collector_id: uuid.UUID,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """Get transactions for a collector, optionally filtered by status (paginated)."""
    where_clauses = [
        Transaction.collector_id == collector_id,
        Transaction.status != "AUTO_REJECTED",
    ]
    if status_filter:
        where_clauses.append(Transaction.status == status_filter)

    # Count total
    count_result = await db.execute(
        select(func.count())
        .select_from(Transaction)
        .where(*where_clauses)
    )
    total = count_result.scalar_one()

    # Fetch page
    query = (
        select(Transaction, Client.full_name)
        .join(Client, Transaction.client_id == Client.id)
        .where(*where_clauses)
        .order_by(Transaction.submitted_at.desc())
        .offset(skip)
        .limit(limit)
    )
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
    return {"items": items, "total": total, "skip": skip, "limit": limit}


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
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """Get transactions for a specific client (paginated)."""
    where_clauses = [
        Transaction.client_id == client_id,
        Transaction.status != "AUTO_REJECTED",
    ]
    if status_filter:
        where_clauses.append(Transaction.status == status_filter)

    # Count total
    count_result = await db.execute(
        select(func.count())
        .select_from(Transaction)
        .where(*where_clauses)
    )
    total = count_result.scalar_one()

    # Fetch page
    result = await db.execute(
        select(Transaction)
        .where(*where_clauses)
        .order_by(Transaction.submitted_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = list(result.scalars().all())
    return {"items": items, "total": total, "skip": skip, "limit": limit}


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


async def _get_collector_for_client(
    db: AsyncSession,
    client: Client,
) -> Collector:
    """Look up the collector that a client belongs to."""
    result = await db.execute(
        select(Collector).where(Collector.id == client.collector_id)
    )
    collector = result.scalar_one_or_none()
    if collector is None:
        raise ValueError("Collector not found")
    return collector


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
