from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class ClientSummaryItem(BaseModel):
    client_name: str
    total_deposits: Decimal
    deposit_count: int
    total_payouts: Decimal
    payout_count: int
    net_balance: Decimal


class MonthlySummary(BaseModel):
    year: int
    month: int
    total_deposits: Decimal
    total_payouts: Decimal
    net_balance: Decimal
    client_count: int
    clients: list[ClientSummaryItem]


class ClientStatementItem(BaseModel):
    date: datetime
    type: str  # DEPOSIT | PAYOUT
    description: str
    amount: Decimal
    running_balance: Decimal


class ClientStatement(BaseModel):
    client_name: str
    year: int
    month: int
    opening_balance: Decimal
    closing_balance: Decimal
    items: list[ClientStatementItem]
