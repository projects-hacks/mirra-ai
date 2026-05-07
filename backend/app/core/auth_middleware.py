"""JWT authentication middleware for FastAPI.

Validates the Supabase JWT Bearer token on every REST API request.
WebSocket routes (/ws/*) are excluded — they use selfie-based auth.
Public routes (/health, /api/onboarding/init) are also excluded.
"""
from __future__ import annotations

import logging
import time
from typing import Set

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from redis.exceptions import RedisError
from starlette.middleware.base import BaseHTTPMiddleware

from app.core import cache
from app.core.config import settings

logger = logging.getLogger(__name__)

# Shared HTTP client — reuses TCP connections across requests
_http_client: httpx.AsyncClient | None = None


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(timeout=5.0)
    return _http_client

# ── Routes that don't require authentication ──────────
PUBLIC_PATHS: Set[str] = {
    "/",
    "/health",
    "/ready",
    "/docs",
    "/openapi.json",
    "/redoc",
    # Browsers / clients probe these without Bearer tokens; do not 401.
    "/favicon.ico",
    "/robots.txt",
    "/api/onboarding/init",         # first call after OAuth
    "/api/onboarding/analyze",      # called during onboarding before api.ts is wired
    "/api/onboarding/seed-closet",  # called from CompletionScreen inline
    "/api/onboarding/complete",     # called from CompletionScreen inline
}

# Prefixes that bypass auth entirely (WebSocket handled separately)
PUBLIC_PREFIXES = ("/ws/",)

PAID_ROUTE_PREFIXES = (
    "/api/skin/",
    "/api/vto/",
    "/api/products/",
    "/api/glowup/",
)
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 60


def _is_paid_route(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in PAID_ROUTE_PREFIXES)


async def _is_rate_limited(request: Request, user_id: str) -> bool:
    """Return True when a paid route exceeds the per-user minute budget.

    Redis failures must not take the product down, so rate limiting is fail-open
    and logged. Auth remains the primary cost-control boundary.
    """
    path = request.url.path
    if not _is_paid_route(path):
        return False

    route_family = next((prefix.strip("/").replace("/", ":") for prefix in PAID_ROUTE_PREFIXES if path.startswith(prefix)), "api")
    key = f"rate:{route_family}:{user_id}:{int(time.time() // RATE_LIMIT_WINDOW_SECONDS)}"

    try:
        r = cache.get_pool()
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, RATE_LIMIT_WINDOW_SECONDS)
        return count > RATE_LIMIT_MAX_REQUESTS
    except RedisError as exc:
        logger.warning("Rate limit check failed for %s: %s", path, exc)
        return False


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """Validate Supabase JWT on every non-public REST request."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Let CORS preflight requests pass through untouched.
        if request.method == "OPTIONS":
            return await call_next(request)

        # ── Bypass: public paths & WebSocket ─────────
        if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return await call_next(request)

        # ── Extract Bearer token ──────────────────────
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header"},
            )

        token = auth_header[len("Bearer "):]

        # ── Validate token with Supabase ──────────────
        try:
            verified_user_id = await _verify_supabase_jwt(token)
        except Exception as exc:
            logger.warning("JWT validation failed: %s", exc)
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired session token"},
            )

        if not verified_user_id:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid session token"},
            )

        # ── Attach verified user_id to request state ──
        request.state.user_id = verified_user_id

        if await _is_rate_limited(request, verified_user_id):
            return JSONResponse(
                status_code=429,
                content={
                    "detail": {
                        "category": "rate_limited",
                        "message": "Too many visual or AI requests. Please wait a moment and retry.",
                        "source": "rate_limit",
                    }
                },
            )

        return await call_next(request)


async def _verify_supabase_jwt(token: str) -> str | None:
    """Call Supabase /auth/v1/user to verify the token and return user_id."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.debug("Supabase not configured — skipping JWT validation")
        return "anonymous"

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
    }

    client = _get_http_client()
    resp = await client.get(url, headers=headers)

    if resp.status_code == 200:
        data = resp.json()
        return data.get("id")

    snippet = (resp.text or "")[:400].replace("\n", " ")
    logger.warning(
        "Supabase /auth/v1/user returned %s during token verify: %s",
        resp.status_code,
        snippet or "(empty body)",
    )
    return None
