"""
Redis Cache Service — thin wrapper with JSON helpers and graceful fallback.

All cache operations are fire-and-forget safe: if Redis is unreachable the
app continues working (cache miss → DB query).
"""

import json
import logging
from typing import Any

import redis.asyncio as redis

logger = logging.getLogger(__name__)

_pool: redis.Redis | None = None




async def init_redis(url: str = "redis://localhost:6379") -> None:
    """Create the global connection pool (called from lifespan)."""
    global _pool
    try:
        _pool = redis.from_url(url, decode_responses=True)
        await _pool.ping()
        logger.info("Redis connected (%s)", url)
    except Exception as e:
        logger.warning("Redis unavailable — caching disabled: %s", e)
        _pool = None


async def close_redis() -> None:
    """Close the pool (called from lifespan shutdown)."""
    global _pool
    if _pool:
        await _pool.aclose()
        _pool = None


def get_redis() -> redis.Redis | None:
    return _pool




async def get_json(key: str) -> Any | None:
    """Return deserialized JSON or None on miss / error."""
    if not _pool:
        return None
    try:
        raw = await _pool.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.debug("cache get error (%s): %s", key, e)
        return None


async def set_json(key: str, value: Any, ttl: int = 300) -> None:
    """Serialize *value* to JSON and store with *ttl* seconds."""
    if not _pool:
        return
    try:
        await _pool.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception as e:
        logger.debug("cache set error (%s): %s", key, e)


async def delete(key: str) -> None:
    """Delete a single key."""
    if not _pool:
        return
    try:
        await _pool.delete(key)
    except Exception as e:
        logger.debug("cache delete error (%s): %s", key, e)


async def invalidate_pattern(pattern: str) -> None:
    """Delete all keys matching *pattern* (e.g. ``conversations:abc*``)."""
    if not _pool:
        return
    try:
        cursor = None
        while cursor != 0:
            cursor, keys = await _pool.scan(cursor=cursor or 0, match=pattern, count=100)
            if keys:
                await _pool.delete(*keys)
    except Exception as e:
        logger.debug("cache invalidate error (%s): %s", pattern, e)
