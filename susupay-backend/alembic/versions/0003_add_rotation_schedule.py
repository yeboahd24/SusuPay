"""Add rotation schedule fields

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("collectors", sa.Column("cycle_start_date", sa.Date(), nullable=True))
    op.add_column(
        "collectors",
        sa.Column("payout_interval_days", sa.Integer(), server_default="7", nullable=False),
    )
    op.add_column("clients", sa.Column("payout_position", sa.Integer(), nullable=True))
    op.create_index(
        "ix_clients_collector_payout_position",
        "clients",
        ["collector_id", "payout_position"],
        unique=True,
        postgresql_where=sa.text("payout_position IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_clients_collector_payout_position", table_name="clients")
    op.drop_column("clients", "payout_position")
    op.drop_column("collectors", "payout_interval_days")
    op.drop_column("collectors", "cycle_start_date")
