"""
Notification service: Web Push (VAPID) primary, Hubtel SMS fallback.

Notification types:
- payment_submitted: collector notified when client submits payment
- payment_confirmed: client notified when collector confirms
- payment_queried: client notified when collector queries (with note)
- payment_rejected: client notified when collector rejects
- payout_requested: collector notified of payout request
- payout_approved: client notified of payout approval
- payout_declined: client notified of payout decline
- daily_reminder: unpaid clients reminded at 8 AM
"""

import json
import logging

from pywebpush import WebPushException, webpush

from app.config import settings
from app.services.sms_service import send_sms

logger = logging.getLogger(__name__)


async def send_push_notification(
    push_token: str | None,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """
    Send a Web Push notification via VAPID.
    Returns True if successful, False otherwise.
    """
    if not push_token:
        return False

    if not settings.VAPID_PRIVATE_KEY:
        logger.info("Push (dev): [%s] %s", title, body)
        return True

    try:
        subscription_info = json.loads(push_token)
        payload = json.dumps({"title": title, "body": body, "data": data or {}})
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"},
        )
        return True
    except (WebPushException, Exception) as e:
        logger.warning("Web Push failed: %s", e)
        return False


async def notify(
    push_token: str | None,
    phone: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> str:
    """
    Send notification: try Web Push first, fall back to SMS.
    Returns the delivery channel used: 'push', 'sms', or 'none'.
    """
    # Try Web Push first
    if push_token:
        pushed = await send_push_notification(push_token, title, body, data)
        if pushed:
            return "push"

    # Fallback to SMS
    sms_body = f"{title}: {body}"
    sent = await send_sms(phone, sms_body)
    if sent:
        return "sms"

    return "none"


# --- Convenience functions for specific notification types ---


async def notify_payment_submitted(
    collector_push_token: str | None,
    collector_phone: str,
    client_name: str,
    amount: float,
) -> str:
    return await notify(
        collector_push_token,
        collector_phone,
        "New Payment",
        f"{client_name} submitted GHS {amount:.2f} — tap to review",
    )


async def notify_payment_confirmed(
    client_push_token: str | None,
    client_phone: str,
    amount: float,
    balance: float,
) -> str:
    return await notify(
        client_push_token,
        client_phone,
        "Payment Confirmed",
        f"Your GHS {amount:.2f} payment confirmed. Balance: GHS {balance:.2f}",
    )


async def notify_payment_queried(
    client_push_token: str | None,
    client_phone: str,
    note: str,
) -> str:
    return await notify(
        client_push_token,
        client_phone,
        "Submission Queried",
        f"Submission queried: '{note}'",
    )


async def notify_payment_rejected(
    client_push_token: str | None,
    client_phone: str,
    note: str,
) -> str:
    return await notify(
        client_push_token,
        client_phone,
        "Submission Rejected",
        f"Submission rejected: '{note}'",
    )


async def notify_duplicate_submission(
    client_push_token: str | None,
    client_phone: str,
) -> str:
    return await notify(
        client_push_token,
        client_phone,
        "Duplicate Submission",
        "This transaction has already been submitted.",
    )


async def notify_payout_requested(
    collector_push_token: str | None,
    collector_phone: str,
    client_name: str,
    amount: float,
) -> str:
    return await notify(
        collector_push_token,
        collector_phone,
        "Payout Request",
        f"{client_name} requests GHS {amount:.2f} emergency payout",
    )


async def notify_payout_approved(
    client_push_token: str | None,
    client_phone: str,
    amount: float,
) -> str:
    return await notify(
        client_push_token,
        client_phone,
        "Payout Approved",
        f"Your payout of GHS {amount:.2f} has been approved",
    )


async def notify_payout_declined(
    client_push_token: str | None,
    client_phone: str,
    reason: str,
) -> str:
    return await notify(
        client_push_token,
        client_phone,
        "Payout Declined",
        f"Payout declined: '{reason}'",
    )


async def notify_daily_reminder(
    client_push_token: str | None,
    client_phone: str,
    collector_name: str,
    contribution_amount: float,
) -> str:
    return await notify(
        client_push_token,
        client_phone,
        "Daily Reminder",
        f"Remember to send GHS {contribution_amount:.2f} to {collector_name} today",
    )
