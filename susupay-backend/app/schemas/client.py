import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ClientProfile(BaseModel):
    id: uuid.UUID
    collector_id: uuid.UUID
    full_name: str
    phone: str
    is_active: bool
    joined_at: datetime
    contribution_amount: Decimal = Decimal("0.00")
    contribution_frequency: str = "DAILY"

    model_config = {"from_attributes": True}


class ClientUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    push_token: str | None = None


class ClientBalance(BaseModel):
    client_id: uuid.UUID
    full_name: str
    total_deposits: Decimal
    total_payouts: Decimal
    balance: Decimal


class ClientListItem(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    is_active: bool
    joined_at: datetime
    balance: Decimal = Decimal("0.00")
    payout_position: int | None = None
    period_paid: Decimal = Decimal("0.00")
    period_expected: Decimal = Decimal("0.00")
    period_status: str = "UNPAID"

    model_config = {"from_attributes": True}


class GroupMemberItem(BaseModel):
    """What group members can see about each other — no phone for privacy."""
    id: uuid.UUID
    full_name: str
    total_deposits: Decimal
    transaction_count: int
    balance: Decimal
    payout_position: int | None = None
    payout_date: date | None = None
    period_paid: Decimal = Decimal("0.00")
    period_status: str = "UNPAID"


class ClientScheduleSummary(BaseModel):
    has_schedule: bool
    my_position: int | None = None
    my_payout_date: date | None = None
    days_until_my_payout: int | None = None
    current_recipient_name: str | None = None
    next_recipient_name: str | None = None
    total_positions: int
    payout_interval_days: int
