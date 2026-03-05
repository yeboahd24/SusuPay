"""
Announcements and ratings router.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_client, get_current_collector
from app.models.client import Client
from app.models.collector import Collector
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementUpdate,
    CollectorRatingSummary,
    RatingCreate,
    RatingResponse,
)
from app.services.announcement_service import (
    create_announcement,
    create_rating,
    delete_announcement,
    get_collector_ratings,
    list_announcements,
    update_announcement,
)

router = APIRouter(prefix="/api/v1/announcements", tags=["announcements"])


# ─── Collector: CRUD announcements ──────────────────────────────────────────


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def post_announcement(
    body: AnnouncementCreate,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    return await create_announcement(
        db, collector.id, body.title, body.body, body.is_pinned
    )


@router.get("", response_model=list[AnnouncementResponse])
async def get_announcements_collector(
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    return await list_announcements(db, collector.id)


@router.patch("/{announcement_id}", response_model=AnnouncementResponse)
async def patch_announcement(
    announcement_id: uuid.UUID,
    body: AnnouncementUpdate,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    updated = await update_announcement(
        db, collector.id, announcement_id,
        title=body.title, body=body.body, is_pinned=body.is_pinned,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return updated


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_announcement(
    announcement_id: uuid.UUID,
    collector: Collector = Depends(get_current_collector),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_announcement(db, collector.id, announcement_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")


# ─── Client: read announcements from their collector ─────────────────────────


@router.get("/feed", response_model=list[AnnouncementResponse])
async def get_announcements_client(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await list_announcements(db, client.collector_id)


# ─── Client: rate collector ──────────────────────────────────────────────────


@router.post("/ratings", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def rate_collector(
    body: RatingCreate,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await create_rating(db, client.collector_id, client.id, body.score, body.comment)


# ─── Anyone: view collector ratings ──────────────────────────────────────────


@router.get("/ratings/{collector_id}", response_model=CollectorRatingSummary)
async def get_ratings(
    collector_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await get_collector_ratings(db, collector_id)


# ─── Client: view own collector's ratings ────────────────────────────────────


@router.get("/ratings", response_model=CollectorRatingSummary)
async def get_my_collector_ratings(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await get_collector_ratings(db, client.collector_id)
