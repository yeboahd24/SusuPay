import ssl as ssl_module
from collections.abc import AsyncGenerator
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
import redis.asyncio as aioredis
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import get_db
from app.main import app

_ssl_ctx = ssl_module.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl_module.CERT_NONE


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(loop_scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args={"ssl": _ssl_ctx, "statement_cache_size": 0, "prepared_statement_cache_size": 0})
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        # Truncate all tables before each test to avoid stale data
        await session.execute(
            text(
                "TRUNCATE transactions, payouts, otp_codes, clients, collectors "
                "RESTART IDENTITY CASCADE"
            )
        )
        await session.commit()
        yield session
    await engine.dispose()


@pytest_asyncio.fixture(loop_scope="function", autouse=True)
async def _mock_celery_tasks():
    """Mock all Celery task .delay() calls so they don't need a broker or event loop."""
    from app.workers import tasks

    task_objects = [
        tasks.send_notification_task,
        tasks.notify_payment_submitted_task,
        tasks.notify_payment_confirmed_task,
        tasks.notify_payment_queried_task,
        tasks.notify_duplicate_task,
        tasks.notify_payout_requested_task,
        tasks.notify_payout_approved_task,
        tasks.notify_payout_declined_task,
        tasks.daily_reminder_task,
    ]
    originals = {}
    for task in task_objects:
        originals[task] = task.delay
        task.delay = MagicMock(return_value=None)
    yield
    for task in task_objects:
        task.delay = originals[task]


@pytest_asyncio.fixture(loop_scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture(loop_scope="function")
async def flush_ussd_keys():
    """Flush all ussd:* keys from Redis before each USSD test."""
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        cursor = b"0"
        while cursor:
            cursor, keys = await r.scan(cursor=cursor, match="ussd:*", count=100)
            if keys:
                await r.delete(*keys)
    finally:
        await r.aclose()
