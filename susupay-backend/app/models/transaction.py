import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_collector_status", "collector_id", "status"),
        Index("ix_transactions_client_submitted", "client_id", "submitted_at"),
        Index(
            "ix_transactions_mtn_txn_id",
            "mtn_txn_id",
            unique=True,
            postgresql_where="mtn_txn_id IS NOT NULL",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    collector_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("collectors.id", ondelete="CASCADE"), nullable=False
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    mtn_txn_id: Mapped[str | None] = mapped_column(String(50))
    submission_type: Mapped[str] = mapped_column(
        String(20), nullable=False  # SMS_TEXT | SCREENSHOT
    )
    trust_level: Mapped[str] = mapped_column(
        String(20), nullable=False  # HIGH | MEDIUM | LOW | AUTO_REJECTED
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING"  # PENDING | CONFIRMED | QUERIED | REJECTED | AUTO_REJECTED
    )
    validation_flags: Mapped[dict | None] = mapped_column(JSONB)
    raw_sms_text: Mapped[str | None] = mapped_column(Text)
    screenshot_key: Mapped[str | None] = mapped_column(String(500))
    collector_note: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    collector: Mapped["Collector"] = relationship(back_populates="transactions")  # noqa: F821
    client: Mapped["Client"] = relationship(back_populates="transactions")  # noqa: F821
