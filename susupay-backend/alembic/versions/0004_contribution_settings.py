"""Add contribution settings to collectors, remove daily_amount from clients

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add contribution settings to collectors
    op.add_column(
        "collectors",
        sa.Column("contribution_amount", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "collectors",
        sa.Column(
            "contribution_frequency",
            sa.String(10),
            server_default="DAILY",
            nullable=False,
        ),
    )

    # Backfill contribution_amount from clients' most common daily_amount
    op.execute("""
        UPDATE collectors co SET contribution_amount = sub.amount
        FROM (
            SELECT DISTINCT ON (c.collector_id) c.collector_id, c.daily_amount AS amount
            FROM clients c WHERE c.is_active = true
            GROUP BY c.collector_id, c.daily_amount
            ORDER BY c.collector_id, COUNT(*) DESC, c.daily_amount DESC
        ) sub WHERE co.id = sub.collector_id
    """)

    # Default for collectors with no clients yet
    op.execute("UPDATE collectors SET contribution_amount = 0 WHERE contribution_amount IS NULL")

    # Make NOT NULL after backfill
    op.alter_column("collectors", "contribution_amount", nullable=False)

    # Drop daily_amount from clients
    op.drop_column("clients", "daily_amount")


def downgrade() -> None:
    # Re-add daily_amount to clients
    op.add_column(
        "clients",
        sa.Column("daily_amount", sa.Numeric(10, 2), nullable=True),
    )
    # Backfill from collector's contribution_amount
    op.execute("""
        UPDATE clients cl SET daily_amount = co.contribution_amount
        FROM collectors co WHERE co.id = cl.collector_id
    """)
    op.execute("UPDATE clients SET daily_amount = 0 WHERE daily_amount IS NULL")
    op.alter_column("clients", "daily_amount", nullable=False)

    # Drop contribution columns from collectors
    op.drop_column("collectors", "contribution_frequency")
    op.drop_column("collectors", "contribution_amount")
