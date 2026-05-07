"""Mirra Backend — FastAPI application."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.core.config import settings
from app.core import cache
from app.core.auth_middleware import JWTAuthMiddleware
from app.routers import (
    vto, context, closet, onboarding, profile,
    closet_analytics, proof_cards, outfit_history, style_profile,
    closet_recommendations, skin, outfit, products, glowup,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage Redis connection pool lifecycle."""
    yield
    await cache.close()


app = FastAPI(
    title="Mirra API",
    description="AI Appearance Operator — Backend",
    version="1.0.0",
    lifespan=lifespan,
)


def _cors_middleware_params() -> dict:
    """CORS policy: default wide-open (*), since the SPA sends Authorization Bearer, not cookies."""
    raw = (settings.CORS_ORIGIN or "").strip()
    if raw == "*" or raw == "":
        return {
            "allow_origins": ["*"],
            "allow_origin_regex": None,
            "allow_credentials": False,
        }
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return {
        "allow_origins": origins or ["http://localhost:3000"],
        # Preview / alternate hosts without listing every Vercel deployment explicitly
        "allow_origin_regex": r"https://.*\.vercel\.app|https://.*\.ondigitalocean\.app|http://localhost:\d+",
        "allow_credentials": True,
    }


_cors = _cors_middleware_params()

# JWT auth middleware — validates Bearer token on all non-public REST routes
app.add_middleware(JWTAuthMiddleware)

# CORS: allow all methods/headers; responses (including errors) get Access-Control-Allow-Origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors["allow_origins"],
    allow_origin_regex=_cors["allow_origin_regex"],
    allow_credentials=_cors["allow_credentials"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Outermost: trust X-Forwarded-Proto / Host from the platform load balancer so
# slash redirects and absolute URLs use https (avoids mixed-content on the frontend).
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(skin.router, prefix="/api/skin", tags=["Skin"])
app.include_router(vto.router, prefix="/api/vto", tags=["VTO"])
app.include_router(outfit.router, prefix="/api/outfit", tags=["Outfit"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(glowup.router, prefix="/api/glowup", tags=["GlowUp"])
app.include_router(context.router, prefix="/api/context", tags=["Context"])
app.include_router(closet.router, prefix="/api/closet", tags=["Closet"])
app.include_router(closet_analytics.router)  # Already has prefix="/api/closet"
app.include_router(closet_recommendations.router)  # Already has prefix="/api/closet"
app.include_router(proof_cards.router, prefix="/api/proof-cards", tags=["Proof Cards"])
app.include_router(outfit_history.router, prefix="/api/outfit-history", tags=["Outfit History"])
app.include_router(style_profile.router, prefix="/api/style-profile", tags=["Style Profile"])


@app.get("/")
async def root():
    return {
        "name": "Mirra API",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    redis_status = "disconnected"
    try:
        r = await cache.get_pool()
        redis_ok = await r.ping()
        redis_status = "connected" if redis_ok else "disconnected"
    except Exception:
        pass
    return {
        "status": "ok",
        "version": "1.0.0",
        "redis": redis_status,
    }
