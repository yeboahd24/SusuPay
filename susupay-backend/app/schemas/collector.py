import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CollectorProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    momo_number: str | None
    invite_code: str
    cycle_start_date: date | None = None
    payout_interval_days: int
    contribution_amount: Decimal
    contribution_frequency: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CollectorUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    momo_number: str | None = Field(None, pattern=r"^0\d{9}$")
    push_token: str | None = None
    cycle_start_date: date | None = None
    payout_interval_days: int | None = Field(None, ge=1, le=365)
    contribution_amount: float | None = Field(None, ge=0)
    contribution_frequency: str | None = Field(None, pattern=r"^(DAILY|WEEKLY|MONTHLY)$")


class CollectorDashboard(BaseModel):
    collector_id: uuid.UUID
    total_clients: int
    active_clients: int
    pending_transactions: int
    total_confirmed_today: float
    next_payout_client: str | None = None
    next_payout_date: date | None = None
    contribution_amount: Decimal = Decimal("0.00")
    contribution_frequency: str = "DAILY"
    period_label: str = ""
    paid_count: int = 0
    partial_count: int = 0
    unpaid_count: int = 0
    amount_collected: Decimal = Decimal("0.00")
    amount_expected: Decimal = Decimal("0.00")
    collection_rate: float = 0.0


class RotationPositionItem(BaseModel):
    client_id: uuid.UUID
    position: int = Field(ge=1)


class RotationOrderRequest(BaseModel):
    positions: list[RotationPositionItem]


class ScheduleEntry(BaseModel):
    client_id: uuid.UUID
    full_name: str
    payout_position: int
    payout_date: date
    is_current: bool
    is_completed: bool


class RotationScheduleResponse(BaseModel):
    cycle_start_date: date
    payout_interval_days: int
    cycle_length_days: int
    current_cycle: int
    entries: list[ScheduleEntry]
