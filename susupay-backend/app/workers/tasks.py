"""
Celery tasks for async processing.

Tasks:
- send_notification_task: dispatch push/SMS notification
- daily_reminder_task: remind unpaid clients at 8 AM daily
"""

import asyncio
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.workers.celery_app import celery

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _get_session() -> AsyncSession:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return factory(), engine


@celery.task(name="app.workers.tasks.send_notification_task")
def send_notification_task(
    push_token: str | None,
    phone: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> str:
    """Send a notification via push or SMS fallback."""
    from app.services.notification_service import notify

    channel = _run_async(notify(push_token, phone, title, body, data))
    logger.info("Notification sent via %s to %s: %s", channel, phone[-4:].rjust(10, "*"), title)
    return channel


@celery.task(name="app.workers.tasks.notify_payment_submitted_task")
def notify_payment_submitted_task(
    collector_push_token: str | None,
    collector_phone: str,
    client_name: str,
    amount: float,
) -> str:
    from app.services.notification_service import notify_payment_submitted

    return _run_async(
        notify_payment_submitted(collector_push_token, collector_phone, client_name, amount)
    )


@celery.task(name="app.workers.tasks.notify_payment_confirmed_task")
def notify_payment_confirmed_task(
    client_push_token: str | None,
    client_phone: str,
    amount: float,
    balance: float,
) -> str:
    from app.services.notification_service import notify_payment_confirmed

    return _run_async(
        notify_payment_confirmed(client_push_token, client_phone, amount, balance)
    )


@celery.task(name="app.workers.tasks.notify_payment_queried_task")
def notify_payment_queried_task(
    client_push_token: str | None,
    client_phone: str,
    note: str,
) -> str:
    from app.services.notification_service import notify_payment_queried

    return _run_async(notify_payment_queried(client_push_token, client_phone, note))


@celery.task(name="app.workers.tasks.notify_duplicate_task")
def notify_duplicate_task(
    client_push_token: str | None,
    client_phone: str,
) -> str:
    from app.services.notification_service import notify_duplicate_submission

    return _run_async(notify_duplicate_submission(client_push_token, client_phone))


@celery.task(name="app.workers.tasks.notify_payout_requested_task")
def notify_payout_requested_task(
    collector_push_token: str | None,
    collector_phone: str,
    client_name: str,
    amount: float,
) -> str:
    from app.services.notification_service import notify_payout_requested

    return _run_async(
        notify_payout_requested(collector_push_token, collector_phone, client_name, amount)
    )


@celery.task(name="app.workers.tasks.notify_payout_approved_task")
def notify_payout_approved_task(
    client_push_token: str | None,
    client_phone: str,
    amount: float,
) -> str:
    from app.services.notification_service import notify_payout_approved

    return _run_async(notify_payout_approved(client_push_token, client_phone, amount))


@celery.task(name="app.workers.tasks.notify_payout_declined_task")
def notify_payout_declined_task(
    client_push_token: str | None,
    client_phone: str,
    reason: str,
) -> str:
    from app.services.notification_service import notify_payout_declined

    return _run_async(notify_payout_declined(client_push_token, client_phone, reason))


@celery.task(name="app.workers.tasks.daily_reminder_task")
def daily_reminder_task() -> int:
    """
    Send daily reminders to active clients who haven't paid today.
    Runs at 8 AM Africa/Accra via Celery Beat.
    Returns the number of reminders sent.
    """
    return _run_async(_daily_reminder_async())


async def _daily_reminder_async() -> int:
    from app.services.notification_service import notify_daily_reminder

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as session:
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(
            tzinfo=timezone.utc
        )

        # Find active clients who have NOT submitted a payment today
        result = await session.execute(
            text("""
                SELECT c.id, c.phone, c.push_token, c.daily_amount,
                       co.full_name AS collector_name
                FROM clients c
                JOIN collectors co ON co.id = c.collector_id
                WHERE c.is_active = true
                AND NOT EXISTS (
                    SELECT 1 FROM transactions t
                    WHERE t.client_id = c.id
                    AND t.submitted_at >= :today_start
                )
            """),
            {"today_start": today_start},
        )
        rows = result.all()

    await engine.dispose()

    count = 0
    for row in rows:
        await notify_daily_reminder(
            row.push_token,
            row.phone,
            row.collector_name,
            float(row.daily_amount),
        )
        count += 1

    logger.info("Sent %d daily reminders", count)
    return count
