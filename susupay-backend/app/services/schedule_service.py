import uuid
from datetime import date, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.collector import Collector


async def get_rotation_schedule(db: AsyncSession, collector_id: uuid.UUID) -> dict | None:
    """Compute the full rotation schedule for a collector's group."""
    result = await db.execute(
        select(Collector.cycle_start_date, Collector.payout_interval_days).where(
            Collector.id == collector_id
        )
    )
    row = result.first()
    if row is None or row.cycle_start_date is None:
        return None

    cycle_start = row.cycle_start_date
    interval = row.payout_interval_days

    # Get active clients with assigned positions
    clients_result = await db.execute(
        select(Client.id, Client.full_name, Client.payout_position)
        .where(
            Client.collector_id == collector_id,
            Client.is_active == True,  # noqa: E712
            Client.payout_position.isnot(None),
        )
        .order_by(Client.payout_position)
    )
    positioned_clients = clients_result.all()

    if not positioned_clients:
        return None

    n = len(positioned_clients)
    cycle_length = n * interval
    today = date.today()

    # Determine current cycle number (0-indexed)
    if today < cycle_start:
        current_cycle = 0
    else:
        days_elapsed = (today - cycle_start).days
        current_cycle = days_elapsed // cycle_length

    # Compute current cycle's start date
    current_cycle_start = cycle_start + timedelta(days=current_cycle * cycle_length)

    entries = []
    for client_row in positioned_clients:
        pos = client_row.payout_position
        payout_date = current_cycle_start + timedelta(days=(pos - 1) * interval)
        is_completed = payout_date < today
        is_current = payout_date <= today < payout_date + timedelta(days=interval)
        entries.append({
            "client_id": client_row.id,
            "full_name": client_row.full_name,
            "payout_position": pos,
            "payout_date": payout_date,
            "is_current": is_current,
            "is_completed": is_completed and not is_current,
        })

    return {
        "cycle_start_date": cycle_start,
        "payout_interval_days": interval,
        "cycle_length_days": cycle_length,
        "current_cycle": current_cycle,
        "entries": entries,
    }


async def get_client_schedule_summary(db: AsyncSession, client: Client) -> dict:
    """Get a personalized schedule summary for a single client."""
    schedule = await get_rotation_schedule(db, client.collector_id)

    if schedule is None or client.payout_position is None:
        return {
            "has_schedule": False,
            "my_position": None,
            "my_payout_date": None,
            "days_until_my_payout": None,
            "current_recipient_name": None,
            "next_recipient_name": None,
            "total_positions": 0,
            "payout_interval_days": 7,
        }

    entries = schedule["entries"]
    today = date.today()

    my_entry = next((e for e in entries if e["client_id"] == client.id), None)
    current_entry = next((e for e in entries if e["is_current"]), None)

    # Find next recipient (first entry whose payout_date is in the future after current)
    future_entries = [e for e in entries if e["payout_date"] > today]
    next_entry = future_entries[0] if future_entries else None

    my_payout_date = my_entry["payout_date"] if my_entry else None
    days_until = (my_payout_date - today).days if my_payout_date and my_payout_date >= today else None

    return {
        "has_schedule": True,
        "my_position": client.payout_position,
        "my_payout_date": my_payout_date,
        "days_until_my_payout": days_until,
        "current_recipient_name": current_entry["full_name"] if current_entry else None,
        "next_recipient_name": next_entry["full_name"] if next_entry else None,
        "total_positions": len(entries),
        "payout_interval_days": schedule["payout_interval_days"],
    }


async def set_rotation_order(
    db: AsyncSession, collector_id: uuid.UUID, positions: list[dict]
) -> None:
    """Bulk set rotation positions for a collector's clients.

    positions: list of {"client_id": UUID, "position": int}
    """
    if not positions:
        # Clear all positions
        await db.execute(
            update(Client)
            .where(Client.collector_id == collector_id)
            .values(payout_position=None)
        )
        await db.commit()
        return

    # Validate contiguous 1..N
    pos_values = sorted(p["position"] for p in positions)
    expected = list(range(1, len(positions) + 1))
    if pos_values != expected:
        raise ValueError(f"Positions must be contiguous 1..{len(positions)}, got {pos_values}")

    # Check for duplicate positions
    if len(set(pos_values)) != len(pos_values):
        raise ValueError("Duplicate positions are not allowed")

    # Verify all clients belong to this collector
    client_ids = [p["client_id"] for p in positions]
    result = await db.execute(
        select(Client.id).where(
            Client.collector_id == collector_id,
            Client.id.in_(client_ids),
        )
    )
    found_ids = {row[0] for row in result.all()}
    missing = set(client_ids) - found_ids
    if missing:
        raise ValueError(f"Clients not found in your group: {missing}")

    # Clear existing positions first (avoids unique constraint conflicts)
    await db.execute(
        update(Client)
        .where(Client.collector_id == collector_id)
        .values(payout_position=None)
    )
    await db.flush()

    # Set new positions
    for p in positions:
        await db.execute(
            update(Client)
            .where(Client.id == p["client_id"], Client.collector_id == collector_id)
            .values(payout_position=p["position"])
        )

    await db.commit()
