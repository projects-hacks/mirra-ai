"""Skin REST endpoints built directly on top of existing skin tools."""
from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile, status

from app.core.validation import ValidationError, validate
from app.services.supabase_client import supabase
from app.tools import skin_tools

router = APIRouter()


async def _read_image(upload: UploadFile) -> bytes:
    image_bytes = await upload.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Selfie image is required")
    try:
        validate(image_bytes)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return image_bytes


def _resolve_user_id(request: Request, user_id: str | None) -> str | None:
    return user_id or getattr(request.state, "user_id", None)


@router.post("/analyze")
async def analyze_skin(
    request: Request,
    selfie: UploadFile = File(...),
    user_id: str | None = Form(default=None),
) -> dict[str, Any]:
    selfie_bytes = await _read_image(selfie)
    resolved_user_id = _resolve_user_id(request, user_id)
    result = await skin_tools.analyze_skin(selfie_bytes, resolved_user_id)
    scores = result.get("scores", {})
    return {
        "scores": scores,
        "skin_age": scores.get("skin_age"),
        "suggestions": [],
    }


@router.post("/simulate")
async def simulate_skin(
    request: Request,
    selfie: UploadFile = File(...),
    intensities: str | None = Form(default=None),
    user_id: str | None = Form(default=None),
) -> dict[str, Any]:
    selfie_bytes = await _read_image(selfie)
    resolved_user_id = _resolve_user_id(request, user_id)

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

    resolved_user_id = _resolve_user_id(request, user_id)
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
