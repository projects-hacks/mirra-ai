"""Redis cache — enterprise-grade caching for all services."""
import json
import hashlib
import logging
from typing import Any

import redis.asyncio as redis
from redis.exceptions import RedisError

from app.core.config import settings

_pool: redis.Redis | None = None
logger = logging.getLogger(__name__)


def get_pool() -> redis.Redis:
    """Lazy-init connection pool (singleton)."""
    global _pool
    if _pool is None:
        _pool = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
    return _pool


async def get(key: str) -> Any | None:
    """Get a cached value. Returns None on miss."""
    try:
        r = get_pool()
        val = await r.get(key)
        return json.loads(val) if val else None
    except RedisError as exc:
        logger.warning("Redis get failed for key %s: %s", key, exc)
        return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Set a cached value with TTL in seconds."""
    try:
        r = get_pool()
        await r.set(key, json.dumps(value), ex=ttl)
    except RedisError as exc:
        logger.warning("Redis set failed for key %s: %s", key, exc)

# Backward-compatible alias (shadows built-in `set`)
set = cache_set


async def delete(key: str) -> None:
    """Delete a cached key."""
    try:
        r = get_pool()
        await r.delete(key)
    except RedisError as exc:
        logger.warning("Redis delete failed for key %s: %s", key, exc)


async def invalidate_pattern(pattern: str) -> None:
    """Delete all keys matching a glob pattern."""
    try:
        r = get_pool()
        async for key in r.scan_iter(match=pattern):
            await r.delete(key)
    except RedisError as exc:
        logger.warning("Redis invalidate failed for pattern %s: %s", pattern, exc)


def hash_bytes(data: bytes) -> str:
    """SHA256 hash for binary data (selfie dedup)."""
    return hashlib.sha256(data).hexdigest()[:16]


def hash_json(value: Any) -> str:
    """Stable hash for JSON-serializable payloads."""
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


# Pre-defined TTLs (seconds)
class TTL:
    WEATHER = 1800       # 30 min
    CALENDAR = 300       # 5 min
    BODY_MODEL = 3600    # 1 hour (session-scoped)
    CLOSET = 3600        # 1 hour
    STYLE_PROFILE = 86400  # 24 hours
    VTO_RESULT = 86400   # 24 hours (same selfie + product = same result)
    PRODUCT_CATALOG = 3600  # 1 hour
    PRODUCT_IMAGE = 86400  # 24 hours
    AGENT = 1800  # 30 minutes


async def close() -> None:
    """Close the connection pool on shutdown."""
    global _pool
    if _pool:
        try:
            await _pool.aclose()
        except RedisError as exc:
            logger.warning("Redis close failed: %s", exc)
        _pool = None
