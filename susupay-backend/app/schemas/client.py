import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ClientProfile(BaseModel):
    id: uuid.UUID
    collector_id: uuid.UUID
    full_name: str
    phone: str
    daily_amount: Decimal
    is_active: bool
    joined_at: datetime

    model_config = {"from_attributes": True}


class ClientUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    daily_amount: float | None = Field(None, gt=0)
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
    daily_amount: Decimal
    is_active: bool
    joined_at: datetime
    balance: Decimal = Decimal("0.00")

    model_config = {"from_attributes": True}


class GroupMemberItem(BaseModel):
    """What group members can see about each other — no phone for privacy."""
    id: uuid.UUID
    full_name: str
    daily_amount: Decimal
    total_deposits: Decimal
    transaction_count: int
    balance: Decimal
