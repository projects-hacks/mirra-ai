"""Outfit REST endpoints for closet matching and proof card generation."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.deps import resolve_user_id
from app.services.outfit_service import generate_proof_card, match_closet

router = APIRouter()


def _detail(
    category: str,
    message: str,
    *,
    provider_message: str | None = None,
    source: str | None = None,
) -> dict[str, str]:
    detail = {"category": category, "message": message}
    if provider_message:
        detail["provider_message"] = provider_message
    if source:
        detail["source"] = source
    return detail


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
        raise HTTPException(
            status_code=400,
            detail=_detail(
                "invalid_input",
                "Sign in to build an outfit.",
                provider_message="user_id is required",
                source="outfit_match",
            ),
        )
    return await match_closet(
        user_id=resolved_user_id,
        occasion=body.occasion,
        location=body.location,
    )


@router.post("/proof-card")
async def generate_outfit_proof_card(request: Request, body: ProofCardRequest) -> dict[str, Any]:
    resolved_user_id = resolve_user_id(request, body.user_id)
    if not resolved_user_id:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                "invalid_input",
                "Sign in to save this look.",
                provider_message="user_id is required",
                source="outfit_proof_card",
            ),
        )

    result = generate_proof_card(
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
        raise HTTPException(
            status_code=400,
            detail=_detail(
                "invalid_input",
                "Unable to build the proof card.",
                provider_message=str(result["error"]),
                source="outfit_proof_card",
            ),
        )
    return result
