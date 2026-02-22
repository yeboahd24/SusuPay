import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client, get_current_collector
from app.models.client import Client
from app.models.collector import Collector
from app.schemas.payout import (
    ClientPayoutItem,
    PayoutDeclineRequest,
    PayoutListItem,
    PayoutRequest,
    PayoutResponse,
)
from app.services.payout_service import (
    approve_payout,
    complete_payout,
    decline_payout,
    get_client_payouts,
    get_collector_payouts,
    request_payout,
)
from app.workers.tasks import (
    notify_payout_approved_task,
    notify_payout_declined_task,
    notify_payout_requested_task,
)

router = APIRouter(prefix="/api/v1/payouts", tags=["payouts"])


# --- Client Endpoints ---


@router.post("/request", response_model=PayoutResponse)
async def request_payout_endpoint(
    body: PayoutRequest,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Client requests a payout (balance validated)."""
    try:
        payout = await request_payout(
            db, client, body.amount, body.payout_type, body.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify collector about payout request
    collector = await db.get(Collector, client.collector_id)
    if collector:
        notify_payout_requested_task.delay(
            collector.push_token,
            collector.phone,
            client.full_name,
            float(payout.amount),
        )

    return payout


@router.get("/my-payouts", response_model=list[ClientPayoutItem])
async def my_payouts(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """Client views their own payout history."""
    payouts = await get_client_payouts(db, client.id)
    return payouts


# --- Collector Endpoints ---


@router.get("", response_model=list[PayoutListItem])
async def list_payouts(
    status_filter: str | None = Query(None, alias="status"),
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """List all payouts for collector, optionally filtered by status."""
    items = await get_collector_payouts(db, collector.id, status_filter)
    return items


@router.post("/{payout_id}/approve", response_model=PayoutResponse)
async def approve_payout_endpoint(
    payout_id: uuid.UUID,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Collector approves a REQUESTED payout."""
    try:
        payout = await approve_payout(db, payout_id, collector.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify client about approval
    client_obj = await db.get(Client, payout.client_id)
    if client_obj:
        notify_payout_approved_task.delay(
            client_obj.push_token,
            client_obj.phone,
            float(payout.amount),
        )

    return payout


@router.post("/{payout_id}/decline", response_model=PayoutResponse)
async def decline_payout_endpoint(
    payout_id: uuid.UUID,
    body: PayoutDeclineRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Collector declines a REQUESTED payout with a reason."""
    try:
        payout = await decline_payout(db, payout_id, collector.id, body.reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify client about decline
    client_obj = await db.get(Client, payout.client_id)
    if client_obj:
        notify_payout_declined_task.delay(
            client_obj.push_token,
            client_obj.phone,
            body.reason,
        )

    return payout


@router.post("/{payout_id}/complete", response_model=PayoutResponse)
async def complete_payout_endpoint(
    payout_id: uuid.UUID,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    """Collector marks an APPROVED payout as COMPLETED."""
    try:
        payout = await complete_payout(db, payout_id, collector.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return payout
