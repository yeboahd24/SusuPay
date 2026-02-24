import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client
from app.models.client import Client
from app.models.collector import Collector
from app.models.transaction import Transaction
from app.schemas.analytics import ClientAnalytics
from app.schemas.client import (
    ClientBalance,
    ClientProfile,
    ClientScheduleSummary,
    ClientUpdateRequest,
    GroupMemberItem,
)
from app.schemas.collector import RotationScheduleResponse
from app.schemas.pagination import PaginatedResponse
from app.schemas.transaction import ClientTransactionItem
from app.services.analytics_service import (
    classify_payment,
    get_current_period,
    get_period_payments,
)
from app.services.balance_service import get_client_balance
from app.services.schedule_service import get_client_schedule_summary, get_rotation_schedule
from app.services.transaction_service import get_client_history

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


@router.get("/me", response_model=ClientProfile)
async def get_profile(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    # Enrich with collector's contribution settings
    result = await db.execute(
        select(Collector.contribution_amount, Collector.contribution_frequency).where(
            Collector.id == client.collector_id
        )
    )
    row = result.one()
    return ClientProfile(
        id=client.id,
        collector_id=client.collector_id,
        full_name=client.full_name,
        phone=client.phone,
        is_active=client.is_active,
        joined_at=client.joined_at,
        contribution_amount=Decimal(str(row.contribution_amount)),
        contribution_frequency=row.contribution_frequency,
    )


@router.patch("/me", response_model=ClientProfile)
async def update_profile(
    body: ClientUpdateRequest,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        client.full_name = body.full_name
    if body.push_token is not None:
        client.push_token = body.push_token
    await db.commit()
    await db.refresh(client)

    # Enrich with collector's contribution settings
    result = await db.execute(
        select(Collector.contribution_amount, Collector.contribution_frequency).where(
            Collector.id == client.collector_id
        )
    )
    row = result.one()
    return ClientProfile(
        id=client.id,
        collector_id=client.collector_id,
        full_name=client.full_name,
        phone=client.phone,
        is_active=client.is_active,
        joined_at=client.joined_at,
        contribution_amount=Decimal(str(row.contribution_amount)),
        contribution_frequency=row.contribution_frequency,
    )


@router.get("/me/balance", response_model=ClientBalance)
async def get_balance(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    balance_data = await get_client_balance(db, client.id)
    if not balance_data["full_name"]:
        balance_data["full_name"] = client.full_name
    return ClientBalance(**balance_data)


@router.get("/me/schedule", response_model=ClientScheduleSummary)
async def get_my_schedule(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await get_client_schedule_summary(db, client)


@router.get("/me/analytics", response_model=ClientAnalytics)
async def get_client_analytics_endpoint(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    from app.services.analytics_service import get_client_analytics

    return await get_client_analytics(db, client)


@router.get("/me/group", response_model=list[GroupMemberItem])
async def get_group_members(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """See all members in your susu group with their balances."""
    # Get collector's contribution settings
    coll_result = await db.execute(
        select(Collector.contribution_amount, Collector.contribution_frequency).where(
            Collector.id == client.collector_id
        )
    )
    coll_row = coll_result.one()
    expected = Decimal(str(coll_row.contribution_amount))
    frequency = coll_row.contribution_frequency

    # Get all active clients in the same collector group
    clients_result = await db.execute(
        select(Client.id, Client.full_name, Client.payout_position).where(
            Client.collector_id == client.collector_id,
            Client.is_active == True,  # noqa: E712
        )
    )
    clients_map = {
        row.id: {
            "full_name": row.full_name,
            "payout_position": row.payout_position,
        }
        for row in clients_result.all()
    }

    # Get balances from the view
    balances_result = await db.execute(
        text(
            "SELECT client_id, total_deposits, balance "
            "FROM client_balances WHERE collector_id = :collector_id"
        ),
        {"collector_id": client.collector_id},
    )
    balances_map = {
        row.client_id: {"total_deposits": row.total_deposits, "balance": row.balance}
        for row in balances_result.all()
    }

    # Get confirmed transaction counts per client
    client_ids = list(clients_map.keys())
    txn_counts_result = await db.execute(
        select(Transaction.client_id, func.count(Transaction.id))
        .where(
            Transaction.client_id.in_(client_ids),
            Transaction.status == "CONFIRMED",
        )
        .group_by(Transaction.client_id)
    )
    txn_counts_map = {row[0]: row[1] for row in txn_counts_result.all()}

    # Get payout dates from schedule if available
    schedule = await get_rotation_schedule(db, client.collector_id)
    payout_date_map: dict[uuid.UUID, object] = {}
    if schedule:
        for entry in schedule["entries"]:
            payout_date_map[entry["client_id"]] = entry["payout_date"]

    # Period payments
    start, end, _ = get_current_period(frequency)
    payments = await get_period_payments(db, client.collector_id, start, end)

    members = []
    for client_id, info in clients_map.items():
        bal = balances_map.get(client_id, {"total_deposits": 0, "balance": 0})
        paid = payments.get(client_id, Decimal("0.00"))
        members.append(GroupMemberItem(
            id=client_id,
            full_name=info["full_name"],
            total_deposits=bal["total_deposits"],
            transaction_count=txn_counts_map.get(client_id, 0),
            balance=bal["balance"],
            payout_position=info["payout_position"],
            payout_date=payout_date_map.get(client_id),
            period_paid=paid,
            period_status=classify_payment(paid, expected),
        ))

    # Sort by name
    members.sort(key=lambda m: m.full_name)
    return members


@router.get("/me/group/schedule", response_model=RotationScheduleResponse)
async def get_group_schedule(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    schedule = await get_rotation_schedule(db, client.collector_id)
    if schedule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No rotation schedule configured for your group yet.",
        )
    return schedule


@router.get("/me/group/{member_id}/history", response_model=PaginatedResponse[ClientTransactionItem])
async def get_member_history(
    member_id: uuid.UUID,
    status_filter: str | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """View a group member's transaction history (same collector group only)."""
    result = await db.execute(
        select(Client).where(
            Client.id == member_id,
            Client.collector_id == client.collector_id,
            Client.is_active == True,  # noqa: E712
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your group")

    return await get_client_history(
        db, member_id, status_filter=status_filter, skip=skip, limit=limit
    )
