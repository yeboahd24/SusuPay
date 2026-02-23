"""
Payout business logic.

Handles payout requests, approval, decline, and completion.
All queries scoped by collector_id for multi-tenant isolation.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.payout import Payout
from app.services.balance_service import get_client_balance


async def request_payout(
    db: AsyncSession,
    client: Client,
    amount: Decimal,
    payout_type: str,
    reason: str | None = None,
) -> Payout:
    """Client requests a payout. Amount must not exceed available balance."""
    balance_info = await get_client_balance(db, client.id)
    available = balance_info["balance"]

    if available <= 0:
        raise ValueError("No available balance for payout")
    if amount > available:
        raise ValueError(
            f"Payout amount GHS {amount} exceeds available balance GHS {available}"
        )

    payout = Payout(
        collector_id=client.collector_id,
        client_id=client.id,
        amount=amount,
        payout_type=payout_type,
        status="REQUESTED",
        reason=reason,
    )
    db.add(payout)
    await db.commit()
    await db.refresh(payout)
    return payout


async def approve_payout(
    db: AsyncSession,
    payout_id: uuid.UUID,
    collector_id: uuid.UUID,
) -> Payout:
    """Collector approves a REQUESTED payout."""
    payout = await _get_payout_for_collector(db, payout_id, collector_id)

    if payout.status != "REQUESTED":
        raise ValueError(f"Cannot approve payout with status {payout.status}")

    payout.status = "APPROVED"
    payout.approved_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(payout)
    return payout


async def decline_payout(
    db: AsyncSession,
    payout_id: uuid.UUID,
    collector_id: uuid.UUID,
    reason: str,
) -> Payout:
    """Collector declines a REQUESTED payout with a reason."""
    payout = await _get_payout_for_collector(db, payout_id, collector_id)

    if payout.status != "REQUESTED":
        raise ValueError(f"Cannot decline payout with status {payout.status}")

    payout.status = "DECLINED"
    payout.reason = reason
    await db.commit()
    await db.refresh(payout)
    return payout


async def complete_payout(
    db: AsyncSession,
    payout_id: uuid.UUID,
    collector_id: uuid.UUID,
) -> Payout:
    """Collector marks an APPROVED payout as COMPLETED."""
    payout = await _get_payout_for_collector(db, payout_id, collector_id)

    if payout.status != "APPROVED":
        raise ValueError(f"Cannot complete payout with status {payout.status}")

    payout.status = "COMPLETED"
    payout.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(payout)
    return payout


async def get_client_payouts(
    db: AsyncSession,
    client_id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """Get payouts for a specific client (paginated)."""
    where_clause = [Payout.client_id == client_id]

    count_result = await db.execute(
        select(func.count())
        .select_from(Payout)
        .where(*where_clause)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Payout)
        .where(*where_clause)
        .order_by(Payout.requested_at.desc())
        .offset(skip)
        .limit(limit)
    )
    items = list(result.scalars().all())
    return {"items": items, "total": total, "skip": skip, "limit": limit}


async def get_collector_payouts(
    db: AsyncSession,
    collector_id: uuid.UUID,
    status_filter: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """Get payouts for a collector with client names, optionally filtered (paginated)."""
    where_clauses = [Payout.collector_id == collector_id]
    if status_filter:
        where_clauses.append(Payout.status == status_filter)

    count_result = await db.execute(
        select(func.count())
        .select_from(Payout)
        .where(*where_clauses)
    )
    total = count_result.scalar_one()

    query = (
        select(Payout, Client.full_name)
        .join(Client, Payout.client_id == Client.id)
        .where(*where_clauses)
        .order_by(Payout.requested_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    items = []
    for payout, client_name in result.all():
        items.append(
            {
                "id": payout.id,
                "client_id": payout.client_id,
                "client_name": client_name,
                "amount": payout.amount,
                "payout_type": payout.payout_type,
                "status": payout.status,
                "reason": payout.reason,
                "requested_at": payout.requested_at,
                "approved_at": payout.approved_at,
                "completed_at": payout.completed_at,
            }
        )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


async def _get_payout_for_collector(
    db: AsyncSession,
    payout_id: uuid.UUID,
    collector_id: uuid.UUID,
) -> Payout:
    """Fetch a payout, enforcing multi-tenant isolation."""
    result = await db.execute(
        select(Payout).where(
            Payout.id == payout_id,
            Payout.collector_id == collector_id,
        )
    )
    payout = result.scalar_one_or_none()
    if payout is None:
        raise ValueError("Payout not found")
    return payout
