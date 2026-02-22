"""
Rate limiter using Redis.

Client submissions: 5/hour per client.
"""

import uuid

import redis.asyncio as aioredis

from app.config import settings


async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def check_submission_rate_limit(client_id: uuid.UUID) -> bool:
    """
    Returns True if the client is under the rate limit (5 submissions/hour).
    Returns False if the limit is exceeded.
    """
    r = await _get_redis()
    try:
        key = f"rate:submit:{client_id}"
        count = await r.get(key)
        if count is not None and int(count) >= 5:
            return False
        return True
    finally:
        await r.aclose()


async def increment_submission_count(client_id: uuid.UUID) -> None:
    """Increment the submission counter for a client. Expires after 1 hour."""
    r = await _get_redis()
    try:
        key = f"rate:submit:{client_id}"
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.expire(key, 3600)
        await pipe.execute()
    finally:
        await r.aclose()
