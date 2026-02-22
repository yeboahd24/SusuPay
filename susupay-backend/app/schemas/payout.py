import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# --- Request schemas ---


class PayoutRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payout_type: str = Field(..., pattern="^(SCHEDULED|EMERGENCY)$")
    reason: str | None = None


class PayoutDeclineRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


# --- Response schemas ---


class PayoutResponse(BaseModel):
    id: uuid.UUID
    collector_id: uuid.UUID
    client_id: uuid.UUID
    amount: Decimal
    payout_type: str
    status: str
    reason: str | None = None
    requested_at: datetime
    approved_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class PayoutListItem(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    client_name: str
    amount: Decimal
    payout_type: str
    status: str
    reason: str | None = None
    requested_at: datetime
    approved_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class ClientPayoutItem(BaseModel):
    id: uuid.UUID
    amount: Decimal
    payout_type: str
    status: str
    reason: str | None = None
    requested_at: datetime
    approved_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}
