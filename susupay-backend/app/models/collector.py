import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Collector(Base):
    __tablename__ = "collectors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    momo_number: Mapped[str | None] = mapped_column(String(15))
    pin_hash: Mapped[str | None] = mapped_column(String(255))
    invite_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    push_token: Mapped[str | None] = mapped_column(String(500))
    cycle_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    payout_interval_days: Mapped[int] = mapped_column(Integer, server_default="7", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    clients: Mapped[list["Client"]] = relationship(back_populates="collector")  # noqa: F821
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="collector")  # noqa: F821
    payouts: Mapped[list["Payout"]] = relationship(back_populates="collector")  # noqa: F821
