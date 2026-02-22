import uuid
from decimal import Decimal

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_client_balance(db: AsyncSession, client_id: uuid.UUID) -> dict:
    """Fetch balance from the client_balances view."""
    result = await db.execute(
        text(
            "SELECT client_id, full_name, total_deposits, total_payouts, balance "
            "FROM client_balances WHERE client_id = :client_id"
        ),
        {"client_id": client_id},
    )
    row = result.first()
    if row is None:
        return {
            "client_id": client_id,
            "full_name": "",
            "total_deposits": Decimal("0.00"),
            "total_payouts": Decimal("0.00"),
            "balance": Decimal("0.00"),
        }
    return {
        "client_id": row.client_id,
        "full_name": row.full_name,
        "total_deposits": row.total_deposits,
        "total_payouts": row.total_payouts,
        "balance": row.balance,
    }


async def get_all_client_balances(
    db: AsyncSession, collector_id: uuid.UUID
) -> list[dict]:
    """Fetch all client balances for a collector."""
    result = await db.execute(
        text(
            "SELECT client_id, full_name, total_deposits, total_payouts, balance "
            "FROM client_balances WHERE collector_id = :collector_id"
        ),
        {"collector_id": collector_id},
    )
    return [
        {
            "client_id": row.client_id,
            "full_name": row.full_name,
            "total_deposits": row.total_deposits,
            "total_payouts": row.total_payouts,
            "balance": row.balance,
        }
        for row in result.all()
    ]
