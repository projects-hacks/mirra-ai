"""Glowup recommendation endpoints that orchestrate analysis + reasoning."""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, File, UploadFile

from app.core.deps import read_image
from app.services.agent import agent_service
from app.tools import skin_tools

router = APIRouter()


@router.post("/recommend")
async def recommend_glowup(selfie: UploadFile = File(...)) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
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
