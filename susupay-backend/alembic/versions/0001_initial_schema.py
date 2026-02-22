"""Initial schema: all tables + client_balances view

Revision ID: 0001
Revises:
Create Date: 2026-02-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- collectors ---
    op.create_table(
        "collectors",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("momo_number", sa.String(15), nullable=True),
        sa.Column("pin_hash", sa.String(255), nullable=True),
        sa.Column("invite_code", sa.String(50), nullable=False),
        sa.Column("push_token", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone"),
        sa.UniqueConstraint("invite_code"),
    )

    # --- clients ---
    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("collector_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("daily_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("push_token", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["collector_id"], ["collectors.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("collector_id", "phone", name="uq_clients_collector_phone"),
    )

    # --- transactions ---
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("collector_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("mtn_txn_id", sa.String(50), nullable=True),
        sa.Column("submission_type", sa.String(20), nullable=False),
        sa.Column("trust_level", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'PENDING'")),
        sa.Column("validation_flags", postgresql.JSONB(), nullable=True),
        sa.Column("raw_sms_text", sa.Text(), nullable=True),
        sa.Column("screenshot_key", sa.String(500), nullable=True),
        sa.Column("collector_note", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["collector_id"], ["collectors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_transactions_collector_status", "transactions", ["collector_id", "status"]
    )
    op.create_index(
        "ix_transactions_client_submitted", "transactions", ["client_id", "submitted_at"]
    )
    op.create_index(
        "ix_transactions_mtn_txn_id",
        "transactions",
        ["mtn_txn_id"],
        unique=True,
        postgresql_where=sa.text("mtn_txn_id IS NOT NULL"),
    )

    # --- payouts ---
    op.create_table(
        "payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("collector_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payout_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default=sa.text("'REQUESTED'")),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["collector_id"], ["collectors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
    )

    # --- otp_codes ---
    op.create_table(
        "otp_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("code_hash", sa.String(255), nullable=False),
        sa.Column("purpose", sa.String(30), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_otp_codes_phone_expires", "otp_codes", ["phone", "expires_at"])

    # --- client_balances view ---
    op.execute("""
        CREATE OR REPLACE VIEW client_balances AS
        SELECT
            c.id AS client_id,
            c.collector_id,
            c.full_name,
            c.phone,
            COALESCE(t.total_confirmed, 0) AS total_deposits,
            COALESCE(p.total_completed, 0) AS total_payouts,
            COALESCE(t.total_confirmed, 0) - COALESCE(p.total_completed, 0) AS balance
        FROM clients c
        LEFT JOIN (
            SELECT client_id, SUM(amount) AS total_confirmed
            FROM transactions
            WHERE status = 'CONFIRMED'
            GROUP BY client_id
        ) t ON t.client_id = c.id
        LEFT JOIN (
            SELECT client_id, SUM(amount) AS total_completed
            FROM payouts
            WHERE status = 'COMPLETED'
            GROUP BY client_id
        ) p ON p.client_id = c.id
        WHERE c.is_active = true;
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS client_balances;")
    op.drop_table("otp_codes")
    op.drop_table("payouts")
    op.drop_table("transactions")
    op.drop_table("clients")
    op.drop_table("collectors")
