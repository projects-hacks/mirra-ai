"""Mirra Backend — FastAPI application."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core import cache
from app.routers import voice, vto, context, closet


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

def _cors_origins() -> list[str]:
    origins = [o.strip() for o in settings.CORS_ORIGIN.split(",")]
    origins.append("http://localhost:3000")
    origins.append("http://localhost:3001")
    return list(set(origins))


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vto.router, prefix="/api/vto", tags=["VTO"])
app.include_router(context.router, prefix="/api/context", tags=["Context"])
app.include_router(closet.router, prefix="/api/closet", tags=["Closet"])
app.add_api_websocket_route("/ws/voice", voice.voice_websocket)


@app.get("/health")
async def health():
    r = await cache.get_pool()
    redis_ok = await r.ping()
    return {
        "status": "ok" if redis_ok else "degraded",
        "version": "1.0.0",
        "mocks": settings.USE_MOCKS,
        "redis": "connected" if redis_ok else "disconnected",
    }
