import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CollectorProfile(BaseModel):
    id: uuid.UUID
    full_name: str
    phone: str
    momo_number: str | None
    invite_code: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class CollectorUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=120)
    momo_number: str | None = Field(None, pattern=r"^0\d{9}$")
    push_token: str | None = None


class CollectorDashboard(BaseModel):
    collector_id: uuid.UUID
    total_clients: int
    active_clients: int
    pending_transactions: int
    total_confirmed_today: float
