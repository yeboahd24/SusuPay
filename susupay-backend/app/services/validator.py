"""
Three automatic validations for transaction submissions.

1. Duplicate check — MTN Transaction ID must be globally unique
2. Recipient phone — must match collector's registered MoMo number
3. Date window — transaction must be within 48 hours
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collector import Collector
from app.models.transaction import Transaction
from app.services.sms_parser import ParsedSMS


@dataclass
class ValidationResult:
    auto_reject: bool = False
    auto_reject_reason: str | None = None
    flags: list[dict] = field(default_factory=list)
    trust_level: str = "HIGH"


async def validate_submission(
    db: AsyncSession,
    parsed: ParsedSMS,
    collector: Collector,
) -> ValidationResult:
    result = ValidationResult()

    # Validation 1: Duplicate Transaction ID
    if parsed.transaction_id:
        existing = await db.execute(
            select(Transaction).where(Transaction.mtn_txn_id == parsed.transaction_id)
        )
        if existing.scalar_one_or_none() is not None:
            result.auto_reject = True
            result.auto_reject_reason = "This transaction has already been submitted."
            result.trust_level = "AUTO_REJECTED"
            return result

    # Validation 2: Recipient phone matches collector's MoMo number
    if parsed.recipient_phone and parsed.recipient_phone != collector.momo_number:
        result.flags.append(
            {
                "field": "recipient_phone",
                "message": "Recipient number does not match your MoMo number",
                "severity": "HIGH",
            }
        )

    # Validation 3: Transaction date within 48-hour window
    if parsed.transaction_date:
        now = datetime.now(timezone.utc)
        txn_date = parsed.transaction_date
        if txn_date.tzinfo is None:
            txn_date = txn_date.replace(tzinfo=timezone.utc)
        age = now - txn_date
        if age > timedelta(hours=48):
            result.flags.append(
                {
                    "field": "date",
                    "message": f"Transaction is {age.days} day(s) old",
                    "severity": "MEDIUM",
                }
            )

    # Assign trust level based on flags
    if len(result.flags) == 0:
        result.trust_level = "HIGH"
    else:
        result.trust_level = "MEDIUM"

    return result
