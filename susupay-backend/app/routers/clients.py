import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client
from app.models.client import Client
from app.models.transaction import Transaction
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
from app.services.balance_service import get_client_balance
from app.services.schedule_service import get_client_schedule_summary, get_rotation_schedule
from app.services.transaction_service import get_client_history

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])


@router.get("/me", response_model=ClientProfile)
async def get_profile(client: Client = Depends(get_current_client)):
    return client


@router.patch("/me", response_model=ClientProfile)
async def update_profile(
    body: ClientUpdateRequest,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        client.full_name = body.full_name
    if body.daily_amount is not None:
        client.daily_amount = body.daily_amount
    if body.push_token is not None:
        client.push_token = body.push_token
    await db.commit()
    await db.refresh(client)
    return client


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


@router.get("/me/group", response_model=list[GroupMemberItem])
async def get_group_members(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    """See all members in your susu group with their balances."""
    # Get all active clients in the same collector group
    clients_result = await db.execute(
        select(Client.id, Client.full_name, Client.daily_amount, Client.payout_position).where(
            Client.collector_id == client.collector_id,
            Client.is_active == True,  # noqa: E712
        )
    )
    clients_map = {
        row.id: {
            "full_name": row.full_name,
            "daily_amount": row.daily_amount,
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

    members = []
    for client_id, info in clients_map.items():
        bal = balances_map.get(client_id, {"total_deposits": 0, "balance": 0})
        members.append(GroupMemberItem(
            id=client_id,
            full_name=info["full_name"],
            daily_amount=info["daily_amount"],
            total_deposits=bal["total_deposits"],
            transaction_count=txn_counts_map.get(client_id, 0),
            balance=bal["balance"],
            payout_position=info["payout_position"],
            payout_date=payout_date_map.get(client_id),
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
    # Verify target member belongs to the same collector group
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
