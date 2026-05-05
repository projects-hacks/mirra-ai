"""Glowup recommendation endpoints that orchestrate analysis + reasoning."""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.validation import ValidationError, validate
from app.services.agent import agent_service
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


@router.post("/recommend")
async def recommend_glowup(selfie: UploadFile = File(...)) -> dict[str, Any]:
    selfie_bytes = await _read_image(selfie)
    face_attrs, skin_tone = await asyncio.gather(
        skin_tools.analyze_face(selfie_bytes),
        skin_tools.analyze_skin_tone(selfie_bytes),
    )
    recommendations = await agent_service.generate_glowup_plan(face_attrs, skin_tone)
    return {
        "face_attributes": face_attrs,
        "skin_tone": skin_tone,
        **recommendations,
    }
