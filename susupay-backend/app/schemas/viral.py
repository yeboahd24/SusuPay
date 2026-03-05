import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# --- Referral Schemas ---

class ReferralStats(BaseModel):
    referral_code: str
    total_referrals: int
    referral_names: list[str]


# --- Achievement Schemas ---

class AchievementDefinition(BaseModel):
    type: str
    title: str
    description: str
    icon: str


class AchievementItem(BaseModel):
    achievement_type: str
    title: str
    description: str
    icon: str
    earned_at: datetime | None = None
    earned: bool = False


class AchievementListResponse(BaseModel):
    earned: list[AchievementItem]
    available: list[AchievementItem]
    total_earned: int
    total_available: int


# --- Savings Goal Schemas ---

class SavingsGoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    target_amount: Decimal = Field(gt=0)
    target_date: date | None = None


class SavingsGoalResponse(BaseModel):
    id: uuid.UUID
    title: str
    target_amount: Decimal
    current_amount: Decimal = Decimal("0.00")
    progress_percent: float = 0.0
    target_date: date | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Leaderboard Schemas ---

class LeaderboardEntry(BaseModel):
    rank: int
    client_id: uuid.UUID
    full_name: str
    streak: int
    total_deposits: Decimal
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    period_label: str
    entries: list[LeaderboardEntry]
    my_rank: int | None = None


# --- Share Link Schema ---

class ShareLinkResponse(BaseModel):
    invite_url: str
    whatsapp_url: str
    message: str
