"""Skin REST endpoints built directly on top of existing skin tools."""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile, status

from app.core.deps import read_image, resolve_user_id
from app.models.perfectcorp_types import SkinAnalyzeResponseModel, SkinSimulateResponseModel
from app.services.agent import agent_service
from app.services.perfectcorp import PerfectCorpAPIError
from app.services.supabase_client import supabase
from app.services.weather import get_weather
from app.tools import skin_tools

router = APIRouter()
logger = logging.getLogger(__name__)

SKIN_CONCERN_LABELS: dict[str, str] = {
    "moisture": "Moisture",
    "acne": "Acne",
    "wrinkle": "Wrinkles",
    "pore": "Pores",
    "redness": "Redness",
    "dark_circle_v2": "Dark Circles",
    "dark_circle": "Dark Circles",
    "eye_bag": "Eye Bags",
    "firmness": "Firmness",
    "oiliness": "Oiliness",
    "texture": "Texture",
    "radiance": "Radiance",
    "age_spot": "Spots",
}

SKIN_CONCERN_SUGGESTIONS: dict[str, str] = {
    "moisture": "Use a hydrating serum and lock it with a barrier moisturizer.",
    "acne": "Use a gentle salicylic acid cleanser and avoid over-exfoliating.",
    "wrinkle": "Use retinoid at night and consistent SPF during the day.",
    "pore": "Use niacinamide and keep exfoliation regular but gentle.",
    "redness": "Use calming ingredients like centella and reduce harsh actives.",
    "dark_circle_v2": "Prioritize sleep consistency and use a caffeine eye product.",
    "dark_circle": "Prioritize sleep consistency and use a caffeine eye product.",
    "eye_bag": "Reduce salt at night and apply a cooling eye gel in the morning.",
    "firmness": "Add peptide-based products and daily SPF protection.",
    "oiliness": "Use lightweight, non-comedogenic hydration and balance cleansing.",
    "texture": "Add a low-frequency AHA/BHA exfoliant and hydrate well.",
    "radiance": "Add vitamin C in the morning and maintain hydration.",
    "age_spot": "Use dark-spot targeting ingredients and strict sun protection.",
}


def _detail(
    category: str,
    message: str,
    *,
    provider_message: str | None = None,
    provider_code: str | None = None,
    source: str | None = None,
) -> dict[str, str]:
    detail = {"category": category, "message": message}
    if provider_message:
        detail["provider_message"] = provider_message
    if provider_code:
        detail["provider_code"] = provider_code
    if source:
        detail["source"] = source
    return detail


def _provider_error_to_http(exc: PerfectCorpAPIError, source: str) -> HTTPException:
    logger.info("Perfect Corp rejected %s: %s", source, exc.error_code)
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            **exc.to_detail(),
            "source": source,
        },
    )


def _extract_ui_score(value: Any) -> float | None:
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, dict):
        candidate = value.get("ui_score") or value.get("score") or value.get("raw_score")
        if isinstance(candidate, int | float):
            return float(candidate)
    return None


def _build_skin_suggestions(scores: dict[str, Any]) -> list[dict[str, Any]]:
    scored: list[tuple[str, float]] = []
    for key, value in scores.items():
        numeric = _extract_ui_score(value)
        if numeric is None:
            continue
        if key == "all":
            continue
        scored.append((key, numeric))

    scored.sort(key=lambda item: item[1])
    top = scored[:3]
    suggestions: list[dict[str, Any]] = []
    for key, score in top:
        label = SKIN_CONCERN_LABELS.get(key, key.replace("_", " ").title())
        suggestions.append(
            {
                "concern": key,
                "label": label,
                "score": round(score),
                "priority": "high" if score < 60 else "medium",
                "tip": SKIN_CONCERN_SUGGESTIONS.get(key, "Keep this concern in your daily routine."),
            }
        )
    return suggestions


@router.post("/analyze", response_model=SkinAnalyzeResponseModel)
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
            "suggestions": _build_skin_suggestions(scores),
        }
    except PerfectCorpAPIError as exc:
        raise _provider_error_to_http(exc, "skin_analysis") from exc


@router.post("/simulate", response_model=SkinSimulateResponseModel)
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
            raise HTTPException(
                status_code=400,
                detail=_detail(
                    "invalid_input",
                    "The skin simulation controls could not be read.",
                    provider_message="Invalid intensities JSON",
                    source="skin_simulation",
                ),
            ) from exc

    result = await skin_tools.simulate_skin(
        selfie_bytes,
        intensities=parsed_intensities,
        user_id=resolved_user_id,
    )
    simulation_url = result.get("simulation_url")
    if isinstance(simulation_url, str) and simulation_url:
        result["image_url"] = simulation_url
    return result


@router.get("/history")
async def get_skin_history(
    request: Request,
    user_id: str | None = Query(default=None),
) -> dict[str, Any]:
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=_detail(
                "service_unavailable",
                "Skin history is unavailable right now.",
                provider_message="Supabase is not configured",
                source="skin_history",
            ),
        )

    resolved_user_id = resolve_user_id(request, user_id)
    if not resolved_user_id:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                "invalid_input",
                "Sign in to view skin history.",
                provider_message="user_id is required",
                source="skin_history",
            ),
        )

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
            detail=_detail(
                "service_unavailable",
                "Skin insights are unavailable right now.",
                provider_message="Supabase is not configured",
                source="skin_insights",
            ),
        )

    resolved_user_id = resolve_user_id(request, user_id)
    if not resolved_user_id:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                "invalid_input",
                "Sign in to load skin insights.",
                provider_message="user_id is required",
                source="skin_insights",
            ),
        )

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
        raise HTTPException(
            status_code=404,
            detail=_detail(
                "missing_scan",
                "Capture a skin scan before requesting insights.",
                provider_message="No skin scans found",
                source="skin_insights",
            ),
        )

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
