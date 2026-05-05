"""Glowup recommendation endpoints that orchestrate analysis + reasoning."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.deps import read_image
from app.data.makeup_presets import choose_makeup_presets
from app.services.agent import agent_service
from app.services.perfectcorp import PerfectCorpAPIError
from app.tools import skin_tools

router = APIRouter()
logger = logging.getLogger(__name__)


HAIRSTYLE_REFERENCES: list[dict[str, str]] = [
    {
        "id": "soft-volume",
        "title": "Soft Volume",
        "description": "Clean lift around the crown with movement at the ends.",
        "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    },
    {
        "id": "long-layers",
        "title": "Long Layers",
        "description": "Face-lengthening layers that keep the silhouette light.",
        "image_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80",
    },
    {
        "id": "polished-bob",
        "title": "Polished Bob",
        "description": "Sharp shape with cheekbone emphasis and a smooth finish.",
        "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    },
    {
        "id": "relaxed-waves",
        "title": "Relaxed Waves",
        "description": "Soft width and texture that balances angular features.",
        "image_url": "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=900&q=80",
    },
]


class GlowupRecommendRequest(BaseModel):
    face_attributes: dict[str, Any]
    skin_tone: dict[str, Any]


def _extract_face_shape(face_attrs: dict[str, Any]) -> str:
    return str(face_attrs.get("shape") or face_attrs.get("face_shape") or face_attrs.get("faceshape") or "balanced")


def _extract_undertone(skin_tone: dict[str, Any]) -> str:
    return str(
        skin_tone.get("undertone")
        or skin_tone.get("undertone_name")
        or skin_tone.get("skin_tone")
        or "neutral"
    )


def _build_accessory_queries(face_shape: str, undertone: str) -> dict[str, str]:
    normalized_shape = face_shape.lower()
    normalized_tone = undertone.lower()
    metal = "gold" if "warm" in normalized_tone or "gold" in normalized_tone else "silver"

    earring_style = "drop"
    necklace_style = "layered pendant"

    if "round" in normalized_shape:
        earring_style = "elongated drop"
        necklace_style = "long pendant"
    elif "square" in normalized_shape:
        earring_style = "soft curve hoop"
        necklace_style = "rounded collar"
    elif "heart" in normalized_shape:
        earring_style = "teardrop"
        necklace_style = "delicate collar"
    elif "oval" in normalized_shape:
        earring_style = "sculptural hoop"
        necklace_style = "layered pendant"

    return {
        "earrings": f"{metal} {earring_style} earrings",
        "necklace": f"{metal} {necklace_style} necklace",
    }


def _array_to_string(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if item)
    if isinstance(value, dict):
        return ", ".join(f"{key}: {item}" for key, item in value.items() if item) or None
    return str(value)


def _normalize_face_attrs(face_attrs: dict[str, Any]) -> dict[str, Any]:
    results = face_attrs.get("results") if isinstance(face_attrs.get("results"), dict) else face_attrs
    eyes = results.get("eyes", {}) if isinstance(results, dict) else {}
    lips = results.get("lips", {}) if isinstance(results, dict) else {}
    nose = results.get("nose", {}) if isinstance(results, dict) else {}
    agegender = results.get("agegender", {}) if isinstance(results, dict) else {}

    return {
        "shape": results.get("shape") or results.get("face_shape") or results.get("faceshape"),
        "age": agegender.get("age") if isinstance(agegender, dict) else results.get("age"),
        "gender": agegender.get("gender") if isinstance(agegender, dict) else results.get("gender"),
        "facial_ratios": results.get("facialratio") or results.get("facial_ratios") or {},
        "eye_shape": results.get("eye_shape") or _array_to_string(eyes.get("eyeshape") if isinstance(eyes, dict) else None),
        "eye_size": results.get("eye_size") or (eyes.get("eyesize") if isinstance(eyes, dict) else None),
        "eyelid_type": results.get("eyelid_type") or (eyes.get("eyelid") if isinstance(eyes, dict) else None),
        "lip_shape": results.get("lip_shape") or _array_to_string(lips.get("lipshape") if isinstance(lips, dict) else None),
        "nose_width": results.get("nose_width") or (nose.get("nosewidth") if isinstance(nose, dict) else None),
        "nose_length": results.get("nose_length") or (nose.get("noselength") if isinstance(nose, dict) else None),
    }


def _normalize_skin_tone(skin_tone: dict[str, Any]) -> dict[str, Any]:
    results = skin_tone.get("results") if isinstance(skin_tone.get("results"), dict) else skin_tone
    color = results.get("color", {}) if isinstance(results, dict) else {}
    normalized = dict(color) if isinstance(color, dict) else dict(results)

    if "undertone" not in normalized:
        skin_color = str(normalized.get("skin_color") or normalized.get("hex") or "")
        if skin_color.startswith("#") and len(skin_color) == 7:
            r = int(skin_color[1:3], 16)
            b = int(skin_color[5:7], 16)
            if abs(r - b) <= 12:
                normalized["undertone"] = "neutral"
            elif r > b:
                normalized["undertone"] = "warm"
            else:
                normalized["undertone"] = "cool"

    return normalized


def _enrich_plan(face_attrs: dict[str, Any], skin_tone: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
    face_shape = _extract_face_shape(face_attrs)
    undertone = _extract_undertone(skin_tone)

    return {
        "face_attributes": face_attrs,
        "skin_tone": skin_tone,
        **plan,
        "makeup_presets": choose_makeup_presets(undertone),
        "hairstyles": HAIRSTYLE_REFERENCES,
        "accessory_queries": _build_accessory_queries(face_shape, undertone),
    }


@router.post("/analyze")
async def analyze_glowup(selfie: UploadFile = File(...)) -> dict[str, Any]:
    try:
        selfie_bytes = await read_image(selfie)
        face_attrs, skin_tone = await asyncio.gather(
            skin_tools.analyze_face(selfie_bytes),
            skin_tools.analyze_skin_tone(selfie_bytes),
        )
        return {
            "face_attributes": _normalize_face_attrs(face_attrs),
            "skin_tone": _normalize_skin_tone(skin_tone),
        }
    except PerfectCorpAPIError as exc:
        logger.info(
            "Perfect Corp rejected glowup analysis: %s",
            exc.error_code,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.get_user_message(),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected glowup analyze failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to analyze glowup right now. Please try again.",
        ) from exc


@router.post("/recommend")
async def recommend_glowup(
    selfie: UploadFile | None = File(default=None),
    face_attributes_json: str | None = Form(default=None),
    skin_tone_json: str | None = Form(default=None),
) -> dict[str, Any]:
    try:
        if selfie is not None:
            selfie_bytes = await read_image(selfie)
            face_attrs, skin_tone = await asyncio.gather(
                skin_tools.analyze_face(selfie_bytes),
                skin_tools.analyze_skin_tone(selfie_bytes),
            )
            face_attrs = _normalize_face_attrs(face_attrs)
            skin_tone = _normalize_skin_tone(skin_tone)
        else:
            if not face_attributes_json or not skin_tone_json:
                raise HTTPException(
                    status_code=400,
                    detail="Provide either a selfie or both face_attributes_json and skin_tone_json.",
                )
            try:
                payload = GlowupRecommendRequest(
                    face_attributes=_load_json(face_attributes_json),
                    skin_tone=_load_json(skin_tone_json),
                )
                face_attrs = payload.face_attributes
                skin_tone = payload.skin_tone
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc

        plan = await agent_service.generate_glowup_plan(face_attrs, skin_tone)
        return _enrich_plan(face_attrs, skin_tone, plan)
    except PerfectCorpAPIError as exc:
        logger.info(
            "Perfect Corp rejected glowup recommend analysis: %s",
            exc.error_code,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.get_user_message(),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected glowup recommend failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to build a glowup plan right now. Please try again.",
        ) from exc


def _load_json(raw: str) -> dict[str, Any]:
    import json

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid JSON payload supplied to glowup recommend.") from exc
    if not isinstance(parsed, dict):
        raise ValueError("Glowup recommend payloads must be JSON objects.")
    return parsed
