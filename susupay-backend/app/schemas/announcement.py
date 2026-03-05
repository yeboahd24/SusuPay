import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=2000)
    is_pinned: bool = False


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=120)
    body: str | None = Field(None, min_length=1, max_length=2000)
    is_pinned: bool | None = None


class AnnouncementResponse(BaseModel):
    id: uuid.UUID
    collector_id: uuid.UUID
    title: str
    body: str
    is_pinned: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RatingCreate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=500)


class RatingResponse(BaseModel):
    id: uuid.UUID
    collector_id: uuid.UUID
    client_id: uuid.UUID
    score: int
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CollectorRatingSummary(BaseModel):
    average_score: float
    total_ratings: int
    ratings: list[RatingResponse]
