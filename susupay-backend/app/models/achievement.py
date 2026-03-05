import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    achievement_type: Mapped[str] = mapped_column(
        String(50), nullable=False
        # FIRST_DEPOSIT, STREAK_3, STREAK_7, STREAK_14, STREAK_30,
        # SAVED_100, SAVED_500, SAVED_1000, SAVED_5000,
        # EARLY_BIRD, PERFECT_MONTH, GROUP_CHAMPION
    )
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
