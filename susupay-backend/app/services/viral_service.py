"""
Viral features service: referrals, achievements, savings goals, leaderboard.
"""

import secrets
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from urllib.parse import quote

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import Achievement
from app.models.client import Client
from app.models.collector import Collector
from app.models.referral import Referral
from app.models.savings_goal import SavingsGoal
from app.models.transaction import Transaction


# ─── Achievement definitions ─────────────────────────────────────────────────

ACHIEVEMENT_DEFS = [
    {
        "type": "FIRST_DEPOSIT",
        "title": "First Step",
        "description": "Made your first deposit",
        "icon": "star",
    },
    {
        "type": "STREAK_3",
        "title": "Getting Consistent",
        "description": "3 consecutive on-time payments",
        "icon": "fire",
    },
    {
        "type": "STREAK_7",
        "title": "On Fire",
        "description": "7 consecutive on-time payments",
        "icon": "fire",
    },
    {
        "type": "STREAK_14",
        "title": "Unstoppable",
        "description": "14 consecutive on-time payments",
        "icon": "fire",
    },
    {
        "type": "STREAK_30",
        "title": "Savings Legend",
        "description": "30 consecutive on-time payments",
        "icon": "trophy",
    },
    {
        "type": "SAVED_100",
        "title": "First Hundred",
        "description": "Saved a total of GHS 100",
        "icon": "coins",
    },
    {
        "type": "SAVED_500",
        "title": "Half a Grand",
        "description": "Saved a total of GHS 500",
        "icon": "coins",
    },
    {
        "type": "SAVED_1000",
        "title": "Thousandaire",
        "description": "Saved a total of GHS 1,000",
        "icon": "coins",
    },
    {
        "type": "SAVED_5000",
        "title": "Big Saver",
        "description": "Saved a total of GHS 5,000",
        "icon": "gem",
    },
    {
        "type": "EARLY_BIRD",
        "title": "Early Bird",
        "description": "Paid before 9 AM",
        "icon": "sunrise",
    },
    {
        "type": "PERFECT_MONTH",
        "title": "Perfect Month",
        "description": "Paid every period in a calendar month",
        "icon": "calendar-check",
    },
    {
        "type": "GROUP_CHAMPION",
        "title": "Group Champion",
        "description": "Highest total deposits in your group this month",
        "icon": "crown",
    },
]

ACHIEVEMENT_MAP = {d["type"]: d for d in ACHIEVEMENT_DEFS}


# ─── Referral helpers ─────────────────────────────────────────────────────────


def generate_referral_code(full_name: str) -> str:
    slug = full_name.lower().strip().replace(" ", "-")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    slug = slug[:20].strip("-")
    suffix = secrets.token_hex(3)
    return f"ref-{slug}-{suffix}"


async def get_or_create_referral_code(db: AsyncSession, collector: Collector) -> str:
    if collector.referral_code:
        return collector.referral_code
    code = generate_referral_code(collector.full_name)
    collector.referral_code = code
    await db.commit()
    return code


async def get_referral_stats(db: AsyncSession, collector_id: uuid.UUID) -> dict:
    result = await db.execute(
        select(Referral, Collector.full_name)
        .join(Collector, Collector.id == Referral.referred_id)
        .where(Referral.referrer_id == collector_id)
        .order_by(Referral.created_at.desc())
    )
    rows = result.all()
    return {
        "total_referrals": len(rows),
        "referral_names": [row.full_name for row in rows],
    }


async def record_referral(
    db: AsyncSession, referrer_code: str, referred_collector_id: uuid.UUID
) -> bool:
    """Record a referral. Returns True if successfully recorded."""
    # Find referrer
    result = await db.execute(
        select(Collector).where(Collector.referral_code == referrer_code)
    )
    referrer = result.scalar_one_or_none()
    if not referrer or referrer.id == referred_collector_id:
        return False

    # Check if already referred
    existing = await db.execute(
        select(Referral).where(Referral.referred_id == referred_collector_id)
    )
    if existing.scalar_one_or_none():
        return False

    referral = Referral(
        referrer_id=referrer.id,
        referred_id=referred_collector_id,
        referral_code=referrer_code,
    )
    db.add(referral)
    await db.commit()
    return True


# ─── Achievement helpers ─────────────────────────────────────────────────────


async def get_client_achievements(db: AsyncSession, client_id: uuid.UUID) -> dict:
    """Get all achievements for a client, both earned and available."""
    result = await db.execute(
        select(Achievement)
        .where(Achievement.client_id == client_id)
        .order_by(Achievement.earned_at.desc())
    )
    earned = result.scalars().all()
    earned_types = {a.achievement_type: a.earned_at for a in earned}

    earned_list = []
    available_list = []

    for d in ACHIEVEMENT_DEFS:
        item = {
            "achievement_type": d["type"],
            "title": d["title"],
            "description": d["description"],
            "icon": d["icon"],
        }
        if d["type"] in earned_types:
            item["earned"] = True
            item["earned_at"] = earned_types[d["type"]]
            earned_list.append(item)
        else:
            item["earned"] = False
            item["earned_at"] = None
            available_list.append(item)

    return {
        "earned": earned_list,
        "available": available_list,
        "total_earned": len(earned_list),
        "total_available": len(ACHIEVEMENT_DEFS),
    }


async def check_and_award_achievements(
    db: AsyncSession, client_id: uuid.UUID
) -> list[str]:
    """Check all achievement conditions and award any newly earned ones.
    Returns list of newly awarded achievement types."""
    # Get already earned
    result = await db.execute(
        select(Achievement.achievement_type).where(Achievement.client_id == client_id)
    )
    earned = {row[0] for row in result.all()}

    newly_awarded = []

    # Get total confirmed deposits
    total_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.client_id == client_id,
            Transaction.status == "CONFIRMED",
        )
    )
    total_saved = Decimal(str(total_result.scalar_one()))

    # Get transaction count
    count_result = await db.execute(
        select(func.count()).select_from(Transaction).where(
            Transaction.client_id == client_id,
            Transaction.status == "CONFIRMED",
        )
    )
    txn_count = count_result.scalar_one()

    # FIRST_DEPOSIT
    if "FIRST_DEPOSIT" not in earned and txn_count >= 1:
        newly_awarded.append("FIRST_DEPOSIT")

    # Savings milestones
    milestones = [
        ("SAVED_100", 100),
        ("SAVED_500", 500),
        ("SAVED_1000", 1000),
        ("SAVED_5000", 5000),
    ]
    for achievement_type, threshold in milestones:
        if achievement_type not in earned and total_saved >= threshold:
            newly_awarded.append(achievement_type)

    # Streak achievements — get from client analytics
    client_result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = client_result.scalar_one_or_none()
    if client:
        collector_result = await db.execute(
            select(Collector).where(Collector.id == client.collector_id)
        )
        collector = collector_result.scalar_one_or_none()
        if collector:
            from app.services.analytics_service import get_client_analytics
            analytics = await get_client_analytics(db, client)
            streak = analytics.get("payment_streak", 0)

            streak_milestones = [
                ("STREAK_3", 3),
                ("STREAK_7", 7),
                ("STREAK_14", 14),
                ("STREAK_30", 30),
            ]
            for achievement_type, threshold in streak_milestones:
                if achievement_type not in earned and streak >= threshold:
                    newly_awarded.append(achievement_type)

    # Award new achievements
    for achievement_type in newly_awarded:
        achievement = Achievement(
            client_id=client_id,
            achievement_type=achievement_type,
        )
        db.add(achievement)

    if newly_awarded:
        await db.commit()

    return newly_awarded


# ─── Savings goals helpers ────────────────────────────────────────────────────


async def get_savings_goals(db: AsyncSession, client_id: uuid.UUID) -> list[dict]:
    """Get all active savings goals for a client with progress."""
    result = await db.execute(
        select(SavingsGoal)
        .where(SavingsGoal.client_id == client_id, SavingsGoal.is_active == True)  # noqa: E712
        .order_by(SavingsGoal.created_at.desc())
    )
    goals = result.scalars().all()

    # Get total balance (deposits - payouts)
    balance_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.client_id == client_id,
            Transaction.status == "CONFIRMED",
        )
    )
    total_saved = Decimal(str(balance_result.scalar_one()))

    goal_list = []
    for goal in goals:
        target = Decimal(str(goal.target_amount))
        progress = min(float(total_saved / target * 100), 100.0) if target > 0 else 0.0
        goal_list.append({
            "id": goal.id,
            "title": goal.title,
            "target_amount": target,
            "current_amount": min(total_saved, target),
            "progress_percent": round(progress, 1),
            "target_date": goal.target_date,
            "is_active": goal.is_active,
            "created_at": goal.created_at,
        })

    return goal_list


async def create_savings_goal(
    db: AsyncSession, client_id: uuid.UUID, title: str, target_amount: Decimal, target_date: date | None
) -> SavingsGoal:
    goal = SavingsGoal(
        client_id=client_id,
        title=title,
        target_amount=target_amount,
        target_date=target_date,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


async def delete_savings_goal(
    db: AsyncSession, client_id: uuid.UUID, goal_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(SavingsGoal).where(
            SavingsGoal.id == goal_id, SavingsGoal.client_id == client_id
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        return False
    goal.is_active = False
    await db.commit()
    return True


# ─── Leaderboard helpers ─────────────────────────────────────────────────────


async def get_group_leaderboard(
    db: AsyncSession, client: Client
) -> dict:
    """Get the group leaderboard sorted by total deposits this month."""
    # Get all active clients in the group
    clients_result = await db.execute(
        select(Client.id, Client.full_name).where(
            Client.collector_id == client.collector_id,
            Client.is_active == True,  # noqa: E712
        )
    )
    clients_map = {row.id: row.full_name for row in clients_result.all()}

    # Month-to-date deposits
    month_start = datetime.combine(
        date.today().replace(day=1), datetime.min.time()
    ).replace(tzinfo=timezone.utc)

    deposits_result = await db.execute(
        select(Transaction.client_id, func.sum(Transaction.amount))
        .where(
            Transaction.collector_id == client.collector_id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at >= month_start,
        )
        .group_by(Transaction.client_id)
        .order_by(func.sum(Transaction.amount).desc())
    )

    entries = []
    rank = 0
    my_rank = None
    for row in deposits_result.all():
        cid = row[0]
        if cid not in clients_map:
            continue
        rank += 1
        is_me = cid == client.id
        if is_me:
            my_rank = rank
        entries.append({
            "rank": rank,
            "client_id": cid,
            "full_name": clients_map[cid],
            "streak": 0,  # Will be enriched if needed
            "total_deposits": Decimal(str(row[1])),
            "is_current_user": is_me,
        })

    # Add clients with no deposits this month
    deposited_ids = {e["client_id"] for e in entries}
    for cid, name in clients_map.items():
        if cid not in deposited_ids:
            rank += 1
            is_me = cid == client.id
            if is_me:
                my_rank = rank
            entries.append({
                "rank": rank,
                "client_id": cid,
                "full_name": name,
                "streak": 0,
                "total_deposits": Decimal("0.00"),
                "is_current_user": is_me,
            })

    return {
        "period_label": date.today().strftime("%B %Y"),
        "entries": entries,
        "my_rank": my_rank,
    }


# ─── Share link helpers ───────────────────────────────────────────────────────


def generate_share_links(invite_code: str, collector_name: str) -> dict:
    """Generate invite URL and WhatsApp share link."""
    from app.config import settings

    base = settings.FRONTEND_URL.rstrip("/")
    invite_url = f"{base}/join/{invite_code}"
    message = (
        f"Join my susu group on SusuPay! "
        f"I'm {collector_name} and I use SusuPay to manage our savings group digitally. "
        f"No more paper notebooks — automatic payment verification and scheduled payouts. "
        f"Join here: {invite_url}"
    )
    whatsapp_url = f"https://wa.me/?text={quote(message)}"

    return {
        "invite_url": invite_url,
        "whatsapp_url": whatsapp_url,
        "message": message,
    }
