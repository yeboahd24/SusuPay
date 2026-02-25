"""
Rate limiter — in-memory fallback when Redis is unavailable.

Client submissions: 5/hour per client.
"""

import uuid
from collections import defaultdict
from datetime import datetime, timezone

# In-memory store: {client_id: [timestamp, ...]}
_store: dict[str, list[float]] = defaultdict(list)


async def check_submission_rate_limit(client_id: uuid.UUID) -> bool:
    """
    Returns True if the client is under the rate limit (5 submissions/hour).
    Returns False if the limit is exceeded.
    """
    key = str(client_id)
    now = datetime.now(timezone.utc).timestamp()
    cutoff = now - 3600  # 1 hour ago

    # Prune old entries
    _store[key] = [ts for ts in _store[key] if ts > cutoff]

    return len(_store[key]) < 5


async def increment_submission_count(client_id: uuid.UUID) -> None:
    """Increment the submission counter for a client."""
    key = str(client_id)
    now = datetime.now(timezone.utc).timestamp()
    _store[key].append(now)
