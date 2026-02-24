"""
Analytics service — period tracking, collection rates, defaulters, trends, health score.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.collector import Collector
from app.models.transaction import Transaction


def get_current_period(
    frequency: str, ref_date: date | None = None
) -> tuple[datetime, datetime, str]:
    """
    Return (period_start, period_end, label) based on frequency.
    All datetimes are UTC-aware.
    """
    d = ref_date or date.today()

    if frequency == "WEEKLY":
        # Monday 00:00 → next Monday 00:00
        monday = d - timedelta(days=d.weekday())
        start = datetime.combine(monday, datetime.min.time()).replace(tzinfo=timezone.utc)
        end = start + timedelta(days=7)
        end_date = (monday + timedelta(days=6))
        label = f"This Week ({monday.strftime('%d %b')} - {end_date.strftime('%d %b')})"
    elif frequency == "MONTHLY":
        start = datetime.combine(d.replace(day=1), datetime.min.time()).replace(tzinfo=timezone.utc)
        # First day of next month
        if d.month == 12:
            next_month = d.replace(year=d.year + 1, month=1, day=1)
        else:
            next_month = d.replace(month=d.month + 1, day=1)
        end = datetime.combine(next_month, datetime.min.time()).replace(tzinfo=timezone.utc)
        label = d.strftime("%B %Y")
    else:
        # DAILY (default)
        start = datetime.combine(d, datetime.min.time()).replace(tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        label = "Today"

    return start, end, label


async def get_period_payments(
    db: AsyncSession,
    collector_id: uuid.UUID,
    start: datetime,
    end: datetime,
) -> dict[uuid.UUID, Decimal]:
    """
    Sum of CONFIRMED transaction amounts per client within the period.
    Uses confirmed_at for timing.
    """
    result = await db.execute(
        select(Transaction.client_id, func.sum(Transaction.amount))
        .where(
            Transaction.collector_id == collector_id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at >= start,
            Transaction.confirmed_at < end,
        )
        .group_by(Transaction.client_id)
    )
    return {row[0]: Decimal(str(row[1])) for row in result.all()}


def classify_payment(paid: Decimal, expected: Decimal) -> str:
    """Classify a payment relative to expected amount."""
    if expected <= 0:
        return "PAID" if paid > 0 else "UNPAID"
    if paid <= 0:
        return "UNPAID"
    if paid >= expected:
        return "OVERPAID" if paid > expected else "PAID"
    return "PARTIAL"


async def get_collector_analytics(db: AsyncSession, collector: Collector) -> dict:
    """Full analytics dict for a collector."""
    expected = Decimal(str(collector.contribution_amount))
    frequency = collector.contribution_frequency
    start, end, label = get_current_period(frequency)

    # Active clients
    result = await db.execute(
        select(Client.id, Client.full_name).where(
            Client.collector_id == collector.id,
            Client.is_active == True,  # noqa: E712
        )
    )
    active_clients = result.all()
    client_map = {row.id: row.full_name for row in active_clients}

    # Period payments
    payments = await get_period_payments(db, collector.id, start, end)

    # Classify each client
    paid_count = 0
    partial_count = 0
    unpaid_count = 0
    overpaid_count = 0
    defaulters = []
    partial_payers = []
    total_collected = Decimal("0.00")

    for cid, name in client_map.items():
        paid = payments.get(cid, Decimal("0.00"))
        total_collected += paid
        status = classify_payment(paid, expected)

        if status == "PAID":
            paid_count += 1
        elif status == "OVERPAID":
            overpaid_count += 1
            paid_count += 1  # Overpaid counts as paid
        elif status == "PARTIAL":
            partial_count += 1
            partial_payers.append({
                "client_id": cid,
                "full_name": name,
                "expected": expected,
                "paid": paid,
                "remaining": expected - paid,
                "status": "PARTIAL",
            })
        else:
            unpaid_count += 1
            defaulters.append({
                "client_id": cid,
                "full_name": name,
                "expected": expected,
                "paid": paid,
                "remaining": expected - paid,
                "status": "UNPAID",
            })

    total_clients = len(client_map)
    amount_expected = expected * total_clients
    collection_rate = (
        float(total_collected / amount_expected * 100) if amount_expected > 0 else 0.0
    )

    # Daily trend (last 30 days)
    thirty_days_ago = datetime.combine(
        date.today() - timedelta(days=29), datetime.min.time()
    ).replace(tzinfo=timezone.utc)
    trend_result = await db.execute(
        text("""
            SELECT DATE(confirmed_at AT TIME ZONE 'UTC') AS d, SUM(amount) AS total
            FROM transactions
            WHERE collector_id = :cid AND status = 'CONFIRMED'
              AND confirmed_at >= :start
            GROUP BY d ORDER BY d
        """),
        {"cid": collector.id, "start": thirty_days_ago},
    )
    daily_trend = [
        {"date": row.d, "amount": Decimal(str(row.total))}
        for row in trend_result.all()
    ]

    # Trust distribution (month-to-date)
    month_start = datetime.combine(
        date.today().replace(day=1), datetime.min.time()
    ).replace(tzinfo=timezone.utc)
    trust_result = await db.execute(
        select(Transaction.trust_level, func.count())
        .where(
            Transaction.collector_id == collector.id,
            Transaction.submitted_at >= month_start,
            Transaction.trust_level.in_(["HIGH", "MEDIUM", "LOW"]),
        )
        .group_by(Transaction.trust_level)
    )
    trust_dist = {"high": 0, "medium": 0, "low": 0}
    for row in trust_result.all():
        trust_dist[row[0].lower()] = row[1]

    # Top 5 contributors (month-to-date, by confirmed deposits)
    top_result = await db.execute(
        select(
            Transaction.client_id,
            func.sum(Transaction.amount).label("total"),
            func.count().label("cnt"),
        )
        .where(
            Transaction.collector_id == collector.id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at >= month_start,
        )
        .group_by(Transaction.client_id)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
    )
    top_contributors = []
    for row in top_result.all():
        name = client_map.get(row.client_id, "Unknown")
        top_contributors.append({
            "client_id": row.client_id,
            "full_name": name,
            "total_deposits": Decimal(str(row.total)),
            "transaction_count": row.cnt,
        })

    # Group health score: 50% collection rate + 30% non-defaulter rate + 20% streak
    non_defaulter_rate = (
        ((total_clients - unpaid_count) / total_clients * 100)
        if total_clients > 0
        else 100.0
    )
    # Streak component: ratio of fully-paid clients
    streak_ratio = (
        (paid_count / total_clients * 100) if total_clients > 0 else 100.0
    )
    health = int(
        min(collection_rate, 100) * 0.5
        + min(non_defaulter_rate, 100) * 0.3
        + min(streak_ratio, 100) * 0.2
    )
    health = max(0, min(100, health))

    return {
        "period_label": label,
        "period_start": start.date(),
        "period_end": end.date(),
        "contribution_amount": expected,
        "contribution_frequency": frequency,
        "paid_count": paid_count,
        "partial_count": partial_count,
        "unpaid_count": unpaid_count,
        "overpaid_count": overpaid_count,
        "amount_collected": total_collected,
        "amount_expected": amount_expected,
        "collection_rate": round(collection_rate, 1),
        "defaulters": defaulters,
        "partial_payers": partial_payers,
        "daily_trend": daily_trend,
        "trust_distribution": trust_dist,
        "top_contributors": top_contributors,
        "group_health_score": health,
    }


async def get_client_analytics(db: AsyncSession, client: Client) -> dict:
    """Analytics for a single client."""
    # Get collector for contribution settings
    result = await db.execute(
        select(Collector).where(Collector.id == client.collector_id)
    )
    collector = result.scalar_one()
    expected = Decimal(str(collector.contribution_amount))
    frequency = collector.contribution_frequency

    start, end, label = get_current_period(frequency)

    # Period payment for this client
    pay_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.client_id == client.id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at >= start,
            Transaction.confirmed_at < end,
        )
    )
    paid = Decimal(str(pay_result.scalar_one()))
    remaining = max(Decimal("0.00"), expected - paid)
    status = classify_payment(paid, expected)

    period_status = {
        "period_label": label,
        "expected": expected,
        "paid": paid,
        "remaining": remaining,
        "status": status,
    }

    # Payment streak — consecutive full-payment periods walking backward
    streak = 0
    check_date = date.today()
    for _ in range(90):
        # Step back one period
        if frequency == "WEEKLY":
            check_date = check_date - timedelta(days=7)
        elif frequency == "MONTHLY":
            if check_date.month == 1:
                check_date = check_date.replace(year=check_date.year - 1, month=12, day=1)
            else:
                check_date = check_date.replace(month=check_date.month - 1, day=1)
        else:
            check_date = check_date - timedelta(days=1)

        p_start, p_end, _ = get_current_period(frequency, check_date)
        p_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.client_id == client.id,
                Transaction.status == "CONFIRMED",
                Transaction.confirmed_at >= p_start,
                Transaction.confirmed_at < p_end,
            )
        )
        p_paid = Decimal(str(p_result.scalar_one()))
        if expected > 0 and p_paid >= expected:
            streak += 1
        else:
            break

    # Monthly summary
    month_start = datetime.combine(
        date.today().replace(day=1), datetime.min.time()
    ).replace(tzinfo=timezone.utc)
    if date.today().month == 12:
        next_month = date.today().replace(year=date.today().year + 1, month=1, day=1)
    else:
        next_month = date.today().replace(month=date.today().month + 1, day=1)
    month_end = datetime.combine(next_month, datetime.min.time()).replace(tzinfo=timezone.utc)
    days_in_month = (next_month - date.today().replace(day=1)).days

    monthly_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.client_id == client.id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at >= month_start,
            Transaction.confirmed_at < month_end,
        )
    )
    monthly_deposits = Decimal(str(monthly_result.scalar_one()))

    if frequency == "DAILY":
        monthly_expected = expected * days_in_month
    elif frequency == "WEEKLY":
        monthly_expected = expected * Decimal("4")
    else:
        monthly_expected = expected

    monthly_compliance = (
        float(monthly_deposits / monthly_expected * 100) if monthly_expected > 0 else 0.0
    )

    # Group progress: how many members paid this period
    active_result = await db.execute(
        select(func.count()).select_from(Client).where(
            Client.collector_id == client.collector_id,
            Client.is_active == True,  # noqa: E712
        )
    )
    group_total = active_result.scalar_one()

    payments = await get_period_payments(db, client.collector_id, start, end)
    group_paid = sum(
        1 for cid, amt in payments.items()
        if classify_payment(amt, expected) in ("PAID", "OVERPAID")
    )

    return {
        "period_status": period_status,
        "payment_streak": streak,
        "monthly_deposits": monthly_deposits,
        "monthly_expected": monthly_expected,
        "monthly_compliance": round(monthly_compliance, 1),
        "group_paid_count": group_paid,
        "group_total_count": group_total,
    }
