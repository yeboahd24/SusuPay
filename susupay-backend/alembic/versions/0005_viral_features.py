"""Add referrals, achievements, and savings_goals tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add referral_code column to collectors
    op.add_column(
        "collectors",
        sa.Column("referral_code", sa.String(50), unique=True, nullable=True),
    )
    # Backfill referral codes from invite_code
    op.execute(
        "UPDATE collectors SET referral_code = 'ref-' || LEFT(invite_code, 30) "
        "WHERE referral_code IS NULL"
    )

    # Referrals table
    op.create_table(
        "referrals",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("referrer_id", UUID(as_uuid=True), sa.ForeignKey("collectors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referred_id", UUID(as_uuid=True), sa.ForeignKey("collectors.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("referral_code", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Achievements table
    op.create_table(
        "achievements",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("achievement_type", sa.String(50), nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Savings goals table
    op.create_table(
        "savings_goals",
        sa.Column("id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("target_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("savings_goals")
    op.drop_table("achievements")
    op.drop_table("referrals")
    op.drop_column("collectors", "referral_code")
