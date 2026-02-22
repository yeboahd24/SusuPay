import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# --- Submission ---


class SMSSubmitRequest(BaseModel):
    client_id: uuid.UUID
    sms_text: str = Field(..., min_length=10, max_length=2000)


class ClientSMSSubmitRequest(BaseModel):
    """Client submits their own SMS — no client_id needed (from JWT)."""
    sms_text: str = Field(..., min_length=10, max_length=2000)


class ScreenshotSubmitRequest(BaseModel):
    client_id: uuid.UUID
    amount: float = Field(..., gt=0)
    # screenshot_key will be set after S3 upload in Phase 4


class ParsedSMSResponse(BaseModel):
    amount: float | None
    recipient_name: str | None
    recipient_phone: str | None
    transaction_id: str | None
    transaction_date: datetime | None
    confidence: str


class SubmitResponse(BaseModel):
    transaction_id: uuid.UUID
    status: str
    trust_level: str
    validation_flags: list[dict] | None = None
    parsed: ParsedSMSResponse | None = None


# --- Feed ---


class TransactionFeedItem(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    client_name: str
    amount: Decimal
    submission_type: str
    trust_level: str
    status: str
    validation_flags: list[dict] | None = None
    submitted_at: datetime
    confirmed_at: datetime | None = None
    collector_note: str | None = None

    model_config = {"from_attributes": True}


# --- Actions ---


class ConfirmRequest(BaseModel):
    pass


class QueryRequest(BaseModel):
    note: str = Field(..., min_length=1, max_length=500)


class RejectRequest(BaseModel):
    note: str = Field(..., min_length=1, max_length=500)


class TransactionActionResponse(BaseModel):
    transaction_id: uuid.UUID
    status: str
    confirmed_at: datetime | None = None


# --- Client history ---


class ClientTransactionItem(BaseModel):
    id: uuid.UUID
    amount: Decimal
    status: str
    trust_level: str
    submitted_at: datetime
    confirmed_at: datetime | None = None
    collector_note: str | None = None

    model_config = {"from_attributes": True}
