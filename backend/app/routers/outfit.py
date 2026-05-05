"""Outfit REST endpoints for closet matching and proof card generation."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.deps import resolve_user_id
from app.services.tool_executor import _generate_proof_card, _match_closet

router = APIRouter()


class OutfitMatchRequest(BaseModel):
    user_id: str | None = None
    occasion: str | None = None
    location: str = "San Francisco"


class ProofCardRequest(BaseModel):
    user_id: str | None = None
    look_name: str
    selected_items: list[dict[str, Any]]
    occasion: str | None = None
    vto_image_url: str | None = None
    weather: str | None = None
    season: str | None = None


@router.post("/match")
async def match_outfit(request: Request, body: OutfitMatchRequest) -> dict[str, Any]:
    resolved_user_id = resolve_user_id(request, body.user_id)
    if not resolved_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    return await _match_closet(
        user_id=resolved_user_id,
        occasion=body.occasion,
        location=body.location,
    )


@router.post("/proof-card")
async def generate_outfit_proof_card(request: Request, body: ProofCardRequest) -> dict[str, Any]:
    resolved_user_id = resolve_user_id(request, body.user_id)
    if not resolved_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    result = _generate_proof_card(
        user_id=resolved_user_id,
        args={
            "look_name": body.look_name,
            "selected_items": body.selected_items,
            "occasion": body.occasion,
            "vto_image_url": body.vto_image_url,
            "weather": body.weather,
            "season": body.season,
        },
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
