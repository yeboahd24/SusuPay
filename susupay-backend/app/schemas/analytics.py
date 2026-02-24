import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PeriodClientStatus(BaseModel):
    client_id: uuid.UUID
    full_name: str
    expected: Decimal
    paid: Decimal
    remaining: Decimal
    status: str  # PAID | PARTIAL | UNPAID | OVERPAID


class DailyCollectionPoint(BaseModel):
    date: date
    amount: Decimal


class TrustDistribution(BaseModel):
    high: int = 0
    medium: int = 0
    low: int = 0


class TopContributor(BaseModel):
    client_id: uuid.UUID
    full_name: str
    total_deposits: Decimal
    transaction_count: int


class CollectorAnalytics(BaseModel):
    # Period progress
    period_label: str
    period_start: date
    period_end: date
    contribution_amount: Decimal
    contribution_frequency: str
    paid_count: int
    partial_count: int
    unpaid_count: int
    overpaid_count: int = 0
    amount_collected: Decimal
    amount_expected: Decimal
    collection_rate: float

    # Defaulter + partial lists
    defaulters: list[PeriodClientStatus]
    partial_payers: list[PeriodClientStatus]

    # Daily trend (last 30 days)
    daily_trend: list[DailyCollectionPoint]

    # Trust distribution (month-to-date)
    trust_distribution: TrustDistribution

    # Top contributors (month-to-date, top 5)
    top_contributors: list[TopContributor]

    # Group health score 0-100
    group_health_score: int


class ClientPeriodStatus(BaseModel):
    period_label: str
    expected: Decimal
    paid: Decimal
    remaining: Decimal
    status: str  # PAID | PARTIAL | UNPAID | OVERPAID


class ClientAnalytics(BaseModel):
    # Period status
    period_status: ClientPeriodStatus

    # Payment streak
    payment_streak: int

    # Monthly summary
    monthly_deposits: Decimal
    monthly_expected: Decimal
    monthly_compliance: float

    # Group progress
    group_paid_count: int
    group_total_count: int
