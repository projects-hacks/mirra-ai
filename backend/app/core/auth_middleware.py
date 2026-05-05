"""JWT authentication middleware for FastAPI.

Validates the Supabase JWT Bearer token on every REST API request.
WebSocket routes (/ws/*) are excluded — they use selfie-based auth.
Public routes (/health, /api/onboarding/init) are also excluded.
"""
from __future__ import annotations

import logging
from typing import Set

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

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
    "/health",
    "/ready",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/onboarding/init",         # first call after OAuth
    "/api/onboarding/analyze",      # called during onboarding before api.ts is wired
    "/api/onboarding/seed-closet",  # called from CompletionScreen inline
    "/api/onboarding/complete",     # called from CompletionScreen inline
    "/api/skin/analyze",
    "/api/skin/simulate",
    "/api/vto/clothes",
    "/api/vto/makeup",
    "/api/vto/earrings",
    "/api/vto/necklace",
    "/api/vto/hair",
    "/api/products/search",
    "/api/glowup/recommend",
}

# Prefixes that bypass auth entirely (WebSocket handled separately)
PUBLIC_PREFIXES = ("/ws/",)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    """Validate Supabase JWT on every non-public REST request."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

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

        return await call_next(request)


async def _verify_supabase_jwt(token: str) -> str | None:
    """Call Supabase /auth/v1/user to verify the token and return user_id."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        # If Supabase is not configured (e.g. local dev without env), skip validation
        logger.debug("Supabase not configured — skipping JWT validation")
        return "anonymous"

    url = f"{settings.SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
    }

    client = _get_http_client()
    resp = await client.get(url, headers=headers)

    if resp.status_code == 200:
        data = resp.json()
        return data.get("id")

    return None
