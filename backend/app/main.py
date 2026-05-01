"""Mirra Backend — FastAPI application."""
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import voice, vto, context, closet


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print(f"🪞 Mirra backend starting (mocks={'ON' if settings.USE_MOCKS else 'OFF'})")
    yield
    print("🪞 Mirra backend shutting down")


app = FastAPI(
    title="Mirra API",
    description="AI Appearance Operator — Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(vto.router, prefix="/api/vto", tags=["VTO"])
app.include_router(context.router, prefix="/api/context", tags=["Context"])
app.include_router(closet.router, prefix="/api/closet", tags=["Closet"])

# WebSocket route
app.add_api_websocket_route("/ws/voice", voice.voice_websocket)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0", "mocks": settings.USE_MOCKS}
