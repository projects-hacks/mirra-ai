"""Skin REST endpoints built directly on top of existing skin tools."""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile, status

from app.core.deps import read_image, resolve_user_id
from app.services.agent import agent_service
from app.services.perfectcorp import PerfectCorpAPIError
from app.services.supabase_client import supabase
from app.services.weather import get_weather
from app.tools import skin_tools

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze")
async def analyze_skin(
    request: Request,
    selfie: UploadFile = File(...),
    user_id: str | None = Form(default=None),
) -> dict[str, Any]:
    try:
        selfie_bytes = await read_image(selfie)
        resolved_user_id = resolve_user_id(request, user_id)
        result = await skin_tools.analyze_skin(selfie_bytes, resolved_user_id)
        scores = result.get("scores", {})
        return {
            "scores": scores,
            "skin_age": scores.get("skin_age"),
            "suggestions": [],
        }
    except PerfectCorpAPIError as exc:
        logger.info(
            "Perfect Corp rejected skin analysis for user %s: %s",
            user_id,
            exc.error_code,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.get_user_message(),
        ) from exc


@router.post("/simulate")
async def simulate_skin(
    request: Request,
    selfie: UploadFile = File(...),
    intensities: str | None = Form(default=None),
    user_id: str | None = Form(default=None),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    resolved_user_id = resolve_user_id(request, user_id)

    parsed_intensities: dict[str, Any] | None = None
    if intensities:
        try:
            parsed_intensities = json.loads(intensities)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid intensities JSON") from exc

    return await skin_tools.simulate_skin(
        selfie_bytes,
        intensities=parsed_intensities,
        user_id=resolved_user_id,
    )


@router.get("/history")
async def get_skin_history(
    request: Request,
    user_id: str | None = Query(default=None),
) -> dict[str, Any]:
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured",
        )

    resolved_user_id = resolve_user_id(request, user_id)
    if not resolved_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    result = (
        supabase.table("skin_scans")
        .select("*")
        .eq("user_id", resolved_user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"history": result.data or []}


@router.post("/insights")
async def get_skin_insights(
    request: Request,
    user_id: str | None = Form(default=None),
) -> dict[str, Any]:
    """Generate AI skin reasoning from latest scan, weather, and scan history."""
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured",
        )

    resolved_user_id = resolve_user_id(request, user_id)
    if not resolved_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    scans_result = (
        supabase.table("skin_scans")
        .select("*")
        .eq("user_id", resolved_user_id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
    )
    scans = scans_result.data or []
    if not scans:
        raise HTTPException(status_code=404, detail="No skin scans found")

    body_model_result = (
        supabase.table("body_model")
        .select("skin_tone")
        .eq("user_id", resolved_user_id)
        .limit(1)
        .execute()
    )
    body_model_rows = body_model_result.data or []
    skin_tone = body_model_rows[0].get("skin_tone") if body_model_rows else None

    latest_scan = scans[0]
    scan_weather = latest_scan.get("weather_at_scan")
    if not scan_weather:
        location = latest_scan.get("location_at_scan") or "San Francisco"
        try:
            scan_weather = await get_weather(location)
        except Exception:
            scan_weather = None

    return await agent_service.generate_skin_insights(
        scores=latest_scan.get("scores") or {},
        skin_tone=skin_tone,
        weather=scan_weather,
        history=scans[1:],
    )
