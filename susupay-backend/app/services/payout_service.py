"""
Payout business logic.

Handles payout requests, approval, decline, and completion.
All queries scoped by collector_id for multi-tenant isolation.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
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
) -> list[Payout]:
    """Get all payouts for a specific client."""
    result = await db.execute(
        select(Payout)
        .where(Payout.client_id == client_id)
        .order_by(Payout.requested_at.desc())
    )
    return list(result.scalars().all())


async def get_collector_payouts(
    db: AsyncSession,
    collector_id: uuid.UUID,
    status_filter: str | None = None,
) -> list[dict]:
    """Get all payouts for a collector with client names, optionally filtered."""
    query = (
        select(Payout, Client.full_name)
        .join(Client, Payout.client_id == Client.id)
        .where(Payout.collector_id == collector_id)
    )
    if status_filter:
        query = query.where(Payout.status == status_filter)
    query = query.order_by(Payout.requested_at.desc())

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
    return items


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
