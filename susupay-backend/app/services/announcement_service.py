"""
Announcement and rating services.
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.announcement import Announcement
from app.models.rating import Rating


# ─── Announcements ───────────────────────────────────────────────────────────


async def create_announcement(
    db: AsyncSession,
    collector_id: uuid.UUID,
    title: str,
    body: str,
    is_pinned: bool = False,
) -> Announcement:
    announcement = Announcement(
        collector_id=collector_id,
        title=title,
        body=body,
        is_pinned=is_pinned,
    )
    db.add(announcement)
    await db.commit()
    await db.refresh(announcement)
    return announcement


async def list_announcements(
    db: AsyncSession, collector_id: uuid.UUID, limit: int = 50
) -> list[Announcement]:
    result = await db.execute(
        select(Announcement)
        .where(Announcement.collector_id == collector_id)
        .order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def update_announcement(
    db: AsyncSession,
    collector_id: uuid.UUID,
    announcement_id: uuid.UUID,
    **kwargs: object,
) -> Announcement | None:
    result = await db.execute(
        select(Announcement).where(
            Announcement.id == announcement_id,
            Announcement.collector_id == collector_id,
        )
    )
    announcement = result.scalar_one_or_none()
    if not announcement:
        return None
    for key, value in kwargs.items():
        if value is not None:
            setattr(announcement, key, value)
    await db.commit()
    await db.refresh(announcement)
    return announcement


async def delete_announcement(
    db: AsyncSession, collector_id: uuid.UUID, announcement_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(Announcement).where(
            Announcement.id == announcement_id,
            Announcement.collector_id == collector_id,
        )
    )
    announcement = result.scalar_one_or_none()
    if not announcement:
        return False
    await db.delete(announcement)
    await db.commit()
    return True


# ─── Ratings ─────────────────────────────────────────────────────────────────


async def create_rating(
    db: AsyncSession,
    collector_id: uuid.UUID,
    client_id: uuid.UUID,
    score: int,
    comment: str | None = None,
) -> Rating:
    rating = Rating(
        collector_id=collector_id,
        client_id=client_id,
        score=score,
        comment=comment,
    )
    db.add(rating)
    await db.commit()
    await db.refresh(rating)
    return rating


async def get_collector_ratings(
    db: AsyncSession, collector_id: uuid.UUID
) -> dict:
    result = await db.execute(
        select(Rating)
        .where(Rating.collector_id == collector_id)
        .order_by(Rating.created_at.desc())
    )
    ratings = list(result.scalars().all())

    avg_result = await db.execute(
        select(func.avg(Rating.score)).where(Rating.collector_id == collector_id)
    )
    avg = avg_result.scalar_one()

    return {
        "average_score": round(float(avg), 1) if avg else 0.0,
        "total_ratings": len(ratings),
        "ratings": ratings,
    }
