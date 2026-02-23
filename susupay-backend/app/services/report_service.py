"""
Report service: monthly summaries, PDF generation, client statements.

All queries scoped by collector_id for multi-tenant isolation.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select, text, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.payout import Payout
from app.models.transaction import Transaction


async def get_monthly_summary(
    db: AsyncSession,
    collector_id: uuid.UUID,
    year: int,
    month: int,
) -> dict:
    """Get monthly summary aggregated by client for a collector."""
    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    # Deposit aggregation per client
    deposit_q = await db.execute(
        select(
            Client.id.label("client_id"),
            Client.full_name,
            func.coalesce(func.sum(Transaction.amount), 0).label("total_deposits"),
            func.count(Transaction.id).label("deposit_count"),
        )
        .outerjoin(
            Transaction,
            (Transaction.client_id == Client.id)
            & (Transaction.status == "CONFIRMED")
            & (Transaction.confirmed_at >= month_start)
            & (Transaction.confirmed_at < month_end),
        )
        .where(Client.collector_id == collector_id)
        .group_by(Client.id, Client.full_name)
    )
    deposit_rows = {row.client_id: row for row in deposit_q.all()}

    # Payout aggregation per client
    payout_q = await db.execute(
        select(
            Client.id.label("client_id"),
            func.coalesce(func.sum(Payout.amount), 0).label("total_payouts"),
            func.count(Payout.id).label("payout_count"),
        )
        .outerjoin(
            Payout,
            (Payout.client_id == Client.id)
            & (Payout.status == "COMPLETED")
            & (Payout.completed_at >= month_start)
            & (Payout.completed_at < month_end),
        )
        .where(Client.collector_id == collector_id)
        .group_by(Client.id)
    )
    payout_rows = {row.client_id: row for row in payout_q.all()}

    # Merge per-client
    clients = []
    grand_deposits = Decimal("0.00")
    grand_payouts = Decimal("0.00")

    for client_id, dep_row in deposit_rows.items():
        pay_row = payout_rows.get(client_id)
        deposits = Decimal(str(dep_row.total_deposits))
        payouts = Decimal(str(pay_row.total_payouts)) if pay_row else Decimal("0.00")
        dep_count = dep_row.deposit_count
        pay_count = pay_row.payout_count if pay_row else 0

        clients.append(
            {
                "client_id": str(client_id),
                "client_name": dep_row.full_name,
                "total_deposits": deposits,
                "deposit_count": dep_count,
                "total_payouts": payouts,
                "payout_count": pay_count,
                "net_balance": deposits - payouts,
            }
        )
        grand_deposits += deposits
        grand_payouts += payouts

    return {
        "year": year,
        "month": month,
        "total_deposits": grand_deposits,
        "total_payouts": grand_payouts,
        "net_balance": grand_deposits - grand_payouts,
        "client_count": len(clients),
        "clients": clients,
    }


async def generate_pdf_report(
    db: AsyncSession,
    collector_id: uuid.UUID,
    year: int,
    month: int,
) -> bytes:
    """Generate a PDF monthly summary report using WeasyPrint."""
    from weasyprint import HTML

    summary = await get_monthly_summary(db, collector_id, year, month)

    month_name = datetime(year, month, 1).strftime("%B %Y")

    # Build HTML
    client_rows = ""
    for c in summary["clients"]:
        client_rows += (
            f"<tr>"
            f"<td>{c['client_name']}</td>"
            f"<td style='text-align:right'>{c['total_deposits']:.2f}</td>"
            f"<td style='text-align:center'>{c['deposit_count']}</td>"
            f"<td style='text-align:right'>{c['total_payouts']:.2f}</td>"
            f"<td style='text-align:center'>{c['payout_count']}</td>"
            f"<td style='text-align:right'>{c['net_balance']:.2f}</td>"
            f"</tr>"
        )

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<style>
    body {{ font-family: Arial, sans-serif; margin: 20px; }}
    h1 {{ color: #1a5276; }}
    h2 {{ color: #2e86c1; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; font-size: 12px; }}
    th {{ background-color: #1a5276; color: white; }}
    .summary {{ margin: 15px 0; }}
    .summary span {{ font-weight: bold; }}
    .footer {{ margin-top: 20px; font-size: 10px; color: #888; }}
</style>
</head>
<body>
    <h1>SusuPay Monthly Report</h1>
    <h2>{month_name}</h2>

    <div class="summary">
        <p>Total Deposits: <span>GHS {summary['total_deposits']:.2f}</span></p>
        <p>Total Payouts: <span>GHS {summary['total_payouts']:.2f}</span></p>
        <p>Net Balance: <span>GHS {summary['net_balance']:.2f}</span></p>
        <p>Active Clients: <span>{summary['client_count']}</span></p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Client</th>
                <th>Deposits (GHS)</th>
                <th># Deposits</th>
                <th>Payouts (GHS)</th>
                <th># Payouts</th>
                <th>Net (GHS)</th>
            </tr>
        </thead>
        <tbody>
            {client_rows}
        </tbody>
    </table>

    <div class="footer">
        Generated by SusuPay &middot; {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}
    </div>
</body>
</html>"""

    pdf_bytes = HTML(string=html_content).write_pdf()
    return pdf_bytes


async def get_client_statement(
    db: AsyncSession,
    client_id: uuid.UUID,
    collector_id: uuid.UUID,
    year: int,
    month: int,
) -> dict:
    """Get a per-client statement with opening balance and line items."""
    # Verify client belongs to collector
    result = await db.execute(
        select(Client).where(
            Client.id == client_id,
            Client.collector_id == collector_id,
        )
    )
    client_obj = result.scalar_one_or_none()
    if client_obj is None:
        raise ValueError("Client not found in your group")

    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    # Opening balance: all confirmed deposits - completed payouts before month_start
    deposits_before = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.client_id == client_id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at < month_start,
        )
    )
    payouts_before = await db.execute(
        select(func.coalesce(func.sum(Payout.amount), 0)).where(
            Payout.client_id == client_id,
            Payout.status == "COMPLETED",
            Payout.completed_at < month_start,
        )
    )
    opening_balance = Decimal(str(deposits_before.scalar())) - Decimal(
        str(payouts_before.scalar())
    )

    # Line items: deposits in month
    dep_result = await db.execute(
        select(Transaction.confirmed_at, Transaction.amount)
        .where(
            Transaction.client_id == client_id,
            Transaction.status == "CONFIRMED",
            Transaction.confirmed_at >= month_start,
            Transaction.confirmed_at < month_end,
        )
        .order_by(Transaction.confirmed_at.asc())
    )
    deposit_items = [
        {"date": row.confirmed_at, "type": "DEPOSIT", "amount": Decimal(str(row.amount))}
        for row in dep_result.all()
    ]

    # Line items: payouts in month
    pay_result = await db.execute(
        select(Payout.completed_at, Payout.amount)
        .where(
            Payout.client_id == client_id,
            Payout.status == "COMPLETED",
            Payout.completed_at >= month_start,
            Payout.completed_at < month_end,
        )
        .order_by(Payout.completed_at.asc())
    )
    payout_items = [
        {"date": row.completed_at, "type": "PAYOUT", "amount": Decimal(str(row.amount))}
        for row in pay_result.all()
    ]

    # Merge and sort chronologically
    all_items = sorted(deposit_items + payout_items, key=lambda x: x["date"])

    # Build running balance
    running = opening_balance
    statement_items = []
    for item in all_items:
        if item["type"] == "DEPOSIT":
            running += item["amount"]
            description = "Payment deposit"
        else:
            running -= item["amount"]
            description = "Payout withdrawal"

        statement_items.append(
            {
                "date": item["date"],
                "type": item["type"],
                "description": description,
                "amount": item["amount"],
                "running_balance": running,
            }
        )

    return {
        "client_name": client_obj.full_name,
        "year": year,
        "month": month,
        "opening_balance": opening_balance,
        "closing_balance": running,
        "items": statement_items,
    }
