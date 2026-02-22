"""
MTN Ghana MoMo SMS Parser.

Extracts transaction details from MTN confirmation SMS text using regex.
Returns a ParsedSMS with confidence: HIGH | PARTIAL | FAILED.

Example SMS:
    You have sent GHS 20.00 to Ama Owusu (0244123456).
    Transaction ID: 8675309ABC
    Date: 22/02/2025 10:34 AM
    Your new balance is GHS 130.00
"""

import re
from dataclasses import dataclass
from datetime import datetime

PATTERNS = {
    "amount": r"sent\s+GHS\s?([\d,]+\.?\d*)",
    "recipient_name": r"sent\s+GHS[\d.,\s]+to\s+([A-Za-z\s]+?)\s*\(",
    "recipient_phone": r"to\s+[^(]+\((0\d{9})\)",
    "transaction_id": r"Transaction\s+ID[:\s]+([A-Za-z0-9]+)",
    "date": r"Date[:\s]+(\d{2}/\d{2}/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)",
}

DATE_FORMAT = "%d/%m/%Y %I:%M %p"


@dataclass
class ParsedSMS:
    amount: float | None = None
    recipient_name: str | None = None
    recipient_phone: str | None = None
    transaction_id: str | None = None
    transaction_date: datetime | None = None
    raw_text: str = ""
    confidence: str = "FAILED"


def parse_mtn_sms(text: str) -> ParsedSMS:
    result = ParsedSMS(raw_text=text)

    # Amount
    match = re.search(PATTERNS["amount"], text, re.IGNORECASE)
    if match:
        result.amount = float(match.group(1).replace(",", ""))

    # Recipient name
    match = re.search(PATTERNS["recipient_name"], text, re.IGNORECASE)
    if match:
        result.recipient_name = match.group(1).strip()

    # Recipient phone
    match = re.search(PATTERNS["recipient_phone"], text, re.IGNORECASE)
    if match:
        result.recipient_phone = match.group(1)

    # Transaction ID
    match = re.search(PATTERNS["transaction_id"], text, re.IGNORECASE)
    if match:
        result.transaction_id = match.group(1)

    # Date
    match = re.search(PATTERNS["date"], text, re.IGNORECASE)
    if match:
        try:
            result.transaction_date = datetime.strptime(match.group(1), DATE_FORMAT)
        except ValueError:
            pass

    # Confidence: count non-None fields (excluding raw_text and confidence)
    filled = sum(
        1
        for v in [
            result.amount,
            result.recipient_name,
            result.recipient_phone,
            result.transaction_id,
            result.transaction_date,
        ]
        if v is not None
    )
    result.confidence = "HIGH" if filled == 5 else "PARTIAL" if filled >= 3 else "FAILED"

    return result
