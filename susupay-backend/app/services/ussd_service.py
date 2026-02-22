"""
USSD feature phone fallback via Hubtel.

Session state stored in Redis with 5-minute TTL.
Only clients use USSD — phone number is identity (no PIN).
"""

import json
import uuid
from decimal import Decimal, InvalidOperation

import redis.asyncio as aioredis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.client import Client
from app.models.collector import Collector
from app.schemas.ussd import USSDRequest, USSDResponse
from app.services.balance_service import get_client_balance
from app.services.payout_service import request_payout
from app.services.transaction_service import get_client_history

SESSION_TTL = 300  # 5 minutes


async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


def normalize_phone(phone: str) -> str:
    """Convert international format 233244... to local 0244..."""
    if phone.startswith("233") and len(phone) >= 12:
        return "0" + phone[3:]
    return phone


def _session_key(session_id: str) -> str:
    return f"ussd:{session_id}"


async def _save_session(
    r: aioredis.Redis, session_id: str, data: dict
) -> None:
    await r.set(_session_key(session_id), json.dumps(data), ex=SESSION_TTL)


async def _load_session(r: aioredis.Redis, session_id: str) -> dict | None:
    raw = await r.get(_session_key(session_id))
    if raw is None:
        return None
    return json.loads(raw)


async def _delete_session(r: aioredis.Redis, session_id: str) -> None:
    await r.delete(_session_key(session_id))


def _release(session_id: str, message: str) -> USSDResponse:
    return USSDResponse(SessionId=session_id, Type="Release", Message=message)


def _respond(session_id: str, message: str) -> USSDResponse:
    return USSDResponse(SessionId=session_id, Type="Response", Message=message)


MAIN_MENU = (
    "Welcome to SusuPay\n"
    "1. Check Balance\n"
    "2. Payment History\n"
    "3. Request Payout\n"
    "4. Collector Info\n"
    "0. Exit"
)


async def handle_ussd(db: AsyncSession, request: USSDRequest) -> USSDResponse:
    r = await _get_redis()
    try:
        if request.Type == "Initiation":
            return await _handle_initiation(db, r, request)
        elif request.Type == "Response":
            return await _handle_response(db, r, request)
        elif request.Type in ("Release", "Timeout"):
            await _delete_session(r, request.SessionId)
            return _release(request.SessionId, "")
        else:
            return _release(request.SessionId, "Invalid request")
    finally:
        await r.aclose()


async def _handle_initiation(
    db: AsyncSession, r: aioredis.Redis, request: USSDRequest
) -> USSDResponse:
    phone = normalize_phone(request.PhoneNumber)

    result = await db.execute(select(Client).where(Client.phone == phone))
    client = result.scalar_one_or_none()

    if client is None:
        return _release(
            request.SessionId,
            "Phone not registered. Contact your susu collector to join.",
        )

    session_data = {
        "phone": phone,
        "stage": "MAIN_MENU",
        "client_id": str(client.id),
        "collector_id": str(client.collector_id),
    }
    await _save_session(r, request.SessionId, session_data)
    return _respond(request.SessionId, MAIN_MENU)


async def _handle_response(
    db: AsyncSession, r: aioredis.Redis, request: USSDRequest
) -> USSDResponse:
    session = await _load_session(r, request.SessionId)
    if session is None:
        return _release(request.SessionId, "Session expired. Please dial again.")

    stage = session["stage"]
    choice = request.Message.strip()

    if stage == "MAIN_MENU":
        return await _handle_main_menu(db, r, request, session, choice)
    elif stage == "PAYOUT_AMOUNT":
        return await _handle_payout_amount(db, r, request, session, choice)
    else:
        return _release(request.SessionId, "Invalid session. Please dial again.")


async def _handle_main_menu(
    db: AsyncSession,
    r: aioredis.Redis,
    request: USSDRequest,
    session: dict,
    choice: str,
) -> USSDResponse:
    client_id = uuid.UUID(session["client_id"])

    if choice == "1":
        # Check balance
        balance_info = await get_client_balance(db, client_id)
        balance = balance_info["balance"]
        name = balance_info["full_name"]
        return _release(
            request.SessionId,
            f"{name}, your balance is GHS {balance:.2f}",
        )

    elif choice == "2":
        # Payment history (last 5 confirmed)
        txns = await get_client_history(db, client_id)
        confirmed = [t for t in txns if t.status == "CONFIRMED"][:5]
        if not confirmed:
            return _release(request.SessionId, "No transactions found.")
        lines = []
        for t in confirmed:
            date_str = t.submitted_at.strftime("%d/%m/%Y")
            lines.append(f"GHS {t.amount:.2f} on {date_str}")
        return _release(
            request.SessionId,
            "Recent payments:\n" + "\n".join(lines),
        )

    elif choice == "3":
        # Request payout — prompt for amount
        session["stage"] = "PAYOUT_AMOUNT"
        await _save_session(r, request.SessionId, session)
        return _respond(request.SessionId, "Enter payout amount (GHS):")

    elif choice == "4":
        # Collector info
        collector_id = uuid.UUID(session["collector_id"])
        result = await db.execute(
            select(Collector).where(Collector.id == collector_id)
        )
        collector = result.scalar_one_or_none()
        if collector is None:
            return _release(request.SessionId, "Collector not found.")
        return _release(
            request.SessionId,
            f"Collector: {collector.full_name}\nPhone: {collector.phone}",
        )

    elif choice == "0":
        await _delete_session(r, request.SessionId)
        return _release(request.SessionId, "Goodbye! Thank you for using SusuPay.")

    else:
        # Invalid option — show menu again
        return _respond(request.SessionId, "Invalid option.\n" + MAIN_MENU)


async def _handle_payout_amount(
    db: AsyncSession,
    r: aioredis.Redis,
    request: USSDRequest,
    session: dict,
    amount_str: str,
) -> USSDResponse:
    # Parse amount
    try:
        amount = Decimal(amount_str)
    except (InvalidOperation, ValueError):
        return _release(request.SessionId, "Invalid amount. Please dial again.")

    if amount <= 0:
        return _release(request.SessionId, "Amount must be greater than zero.")

    client_id = uuid.UUID(session["client_id"])

    # Check balance
    balance_info = await get_client_balance(db, client_id)
    available = balance_info["balance"]

    if amount > available:
        return _release(
            request.SessionId,
            f"Insufficient balance. Available: GHS {available:.2f}",
        )

    # Load client object for request_payout
    result = await db.execute(select(Client).where(Client.id == client_id))
    client_obj = result.scalar_one_or_none()
    if client_obj is None:
        return _release(request.SessionId, "Client not found.")

    try:
        payout = await request_payout(
            db, client_obj, amount, "EMERGENCY", "USSD request"
        )
    except ValueError as e:
        return _release(request.SessionId, str(e))

    await _delete_session(r, request.SessionId)
    return _release(
        request.SessionId,
        f"Payout of GHS {amount:.2f} requested. Your collector will be notified.",
    )
