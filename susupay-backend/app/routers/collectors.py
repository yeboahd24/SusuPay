from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_collector
from app.models.client import Client
from app.models.collector import Collector
from app.models.transaction import Transaction
from app.schemas.client import ClientListItem
from app.schemas.collector import (
    CollectorDashboard,
    CollectorProfile,
    CollectorUpdateRequest,
    RotationOrderRequest,
    RotationScheduleResponse,
)
from app.services.balance_service import get_all_client_balances
from app.services.schedule_service import get_rotation_schedule, set_rotation_order

router = APIRouter(prefix="/api/v1/collectors", tags=["collectors"])


@router.get("/me", response_model=CollectorProfile)
async def get_profile(collector: Collector = Depends(get_current_collector)):
    return collector


@router.patch("/me", response_model=CollectorProfile)
async def update_profile(
    body: CollectorUpdateRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        collector.full_name = body.full_name
    if body.momo_number is not None:
        collector.momo_number = body.momo_number
    if body.push_token is not None:
        collector.push_token = body.push_token
    if body.cycle_start_date is not None:
        collector.cycle_start_date = body.cycle_start_date
    if body.payout_interval_days is not None:
        collector.payout_interval_days = body.payout_interval_days
    await db.commit()
    await db.refresh(collector)
    return collector


@router.get("/me/dashboard", response_model=CollectorDashboard)
async def get_dashboard(
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    # Total and active client counts
    total_q = await db.execute(
        select(func.count()).select_from(Client).where(Client.collector_id == collector.id)
    )
    active_q = await db.execute(
        select(func.count())
        .select_from(Client)
        .where(Client.collector_id == collector.id, Client.is_active == True)  # noqa: E712
    )

    # Pending transactions
    pending_q = await db.execute(
        select(func.count())
        .select_from(Transaction)
        .where(Transaction.collector_id == collector.id, Transaction.status == "PENDING")
    )

    # Today's confirmed total
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    confirmed_q = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.collector_id == collector.id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at >= today_start,
        )
    )

    # Next payout info from schedule
    next_payout_client = None
    next_payout_date = None
    schedule = await get_rotation_schedule(db, collector.id)
    if schedule:
        today = date.today()
        # Find current or next upcoming entry
        current = next((e for e in schedule["entries"] if e["is_current"]), None)
        if current:
            next_payout_client = current["full_name"]
            next_payout_date = current["payout_date"]
        else:
            upcoming = next((e for e in schedule["entries"] if e["payout_date"] >= today), None)
            if upcoming:
                next_payout_client = upcoming["full_name"]
                next_payout_date = upcoming["payout_date"]

    return CollectorDashboard(
        collector_id=collector.id,
        total_clients=total_q.scalar_one(),
        active_clients=active_q.scalar_one(),
        pending_transactions=pending_q.scalar_one(),
        total_confirmed_today=float(confirmed_q.scalar_one()),
        next_payout_client=next_payout_client,
        next_payout_date=next_payout_date,
    )


@router.get("/me/clients", response_model=list[ClientListItem])
async def list_clients(
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client)
        .where(Client.collector_id == collector.id)
        .order_by(Client.full_name)
    )
    clients = result.scalars().all()

    # Get balances for all clients
    balances = await get_all_client_balances(db, collector.id)
    balance_map = {b["client_id"]: b["balance"] for b in balances}

    return [
        ClientListItem(
            id=c.id,
            full_name=c.full_name,
            phone=c.phone,
            daily_amount=c.daily_amount,
            is_active=c.is_active,
            joined_at=c.joined_at,
            balance=balance_map.get(c.id, 0),
            payout_position=c.payout_position,
        )
        for c in clients
    ]


@router.get("/me/schedule", response_model=RotationScheduleResponse)
async def get_schedule(
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    schedule = await get_rotation_schedule(db, collector.id)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No rotation schedule configured. Set a cycle start date and assign positions first.",
        )
    return schedule


@router.put("/me/schedule")
async def update_schedule(
    body: RotationOrderRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    try:
        await set_rotation_order(
            db, collector.id, [p.model_dump() for p in body.positions]
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"detail": "Rotation order updated"}


@router.patch("/me/clients/{client_id}", response_model=ClientListItem)
async def update_client(
    client_id: str,
    body: CollectorUpdateRequest,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.collector_id == collector.id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    if body.full_name is not None:
        client.full_name = body.full_name
    await db.commit()
    await db.refresh(client)

    return ClientListItem(
        id=client.id,
        full_name=client.full_name,
        phone=client.phone,
        daily_amount=client.daily_amount,
        is_active=client.is_active,
        joined_at=client.joined_at,
    )


@router.delete("/me/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_client(
    client_id: str,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.collector_id == collector.id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    client.is_active = False
    await db.commit()
