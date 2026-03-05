"""
Viral features router: referrals, achievements, savings goals, leaderboard, sharing.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client, get_current_collector
from app.models.client import Client
from app.models.collector import Collector
from app.schemas.viral import (
    AchievementListResponse,
    LeaderboardResponse,
    ReferralStats,
    SavingsGoalCreate,
    SavingsGoalResponse,
    ShareLinkResponse,
)
from app.services.viral_service import (
    check_and_award_achievements,
    create_savings_goal,
    delete_savings_goal,
    generate_share_links,
    get_client_achievements,
    get_group_leaderboard,
    get_or_create_referral_code,
    get_referral_stats,
    get_savings_goals,
)

router = APIRouter(prefix="/api/v1/viral", tags=["viral"])


# ─── Referrals (collector) ────────────────────────────────────────────────────


@router.get("/referrals", response_model=ReferralStats)
async def get_my_referrals(
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    code = await get_or_create_referral_code(db, collector)
    stats = await get_referral_stats(db, collector.id)
    return ReferralStats(referral_code=code, **stats)


# ─── Share links (collector) ──────────────────────────────────────────────────


@router.get("/share-link", response_model=ShareLinkResponse)
async def get_share_link(
    collector: Collector = Depends(get_current_collector),
):
    return ShareLinkResponse(
        **generate_share_links(collector.invite_code, collector.full_name)
    )


# ─── Achievements (client) ───────────────────────────────────────────────────


@router.get("/achievements", response_model=AchievementListResponse)
async def get_achievements(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    # Check for any new achievements first
    await check_and_award_achievements(db, client.id)
    return await get_client_achievements(db, client.id)


# ─── Savings Goals (client) ──────────────────────────────────────────────────


@router.get("/goals", response_model=list[SavingsGoalResponse])
async def list_goals(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await get_savings_goals(db, client.id)


@router.post("/goals", response_model=SavingsGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    body: SavingsGoalCreate,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    goal = await create_savings_goal(
        db, client.id, body.title, body.target_amount, body.target_date
    )
    # Return with progress info
    goals = await get_savings_goals(db, client.id)
    return next(g for g in goals if g["id"] == goal.id)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_goal(
    goal_id: uuid.UUID,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_savings_goal(db, client.id, goal_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")


# ─── Leaderboard (client) ────────────────────────────────────────────────────


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await get_group_leaderboard(db, client)
