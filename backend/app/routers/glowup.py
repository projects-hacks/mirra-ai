"""Glowup recommendation endpoints that orchestrate analysis + reasoning."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.deps import read_image
from app.data.makeup_presets import choose_makeup_presets, normalize_persona
from app.services.agent import agent_service
from app.services.perfectcorp import PerfectCorpAPIError
from app.tools import skin_tools

router = APIRouter()
logger = logging.getLogger(__name__)


_MASCULINE_HAIRSTYLES: list[dict[str, str]] = [
    {
        "id": "textured-crop",
        "title": "Textured Crop",
        "description": "Short structured shape with light volume on top — clean, modern silhouette.",
        "image_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1024&q=80&fm=jpg",
    },
    {
        "id": "side-part",
        "title": "Classic Side Part",
        "description": "Polished side part — good for a balanced or oval face shape.",
        "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1024&q=80&fm=jpg",
    },
]

_FEMININE_HAIRSTYLES: list[dict[str, str]] = [
    {
        "id": "soft-layers",
        "title": "Soft Layers",
        "description": "Face-framing layers with gentle movement around the cheekbones.",
        "image_url": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1024&q=80&fm=jpg",
    },
    {
        "id": "natural-curls",
        "title": "Natural Curls",
        "description": "Defined curl pattern with volume — pair with a clear, front-facing selfie.",
        "image_url": "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1024&q=80&fm=jpg",
    },
]


def _hairstyles_for(persona: str) -> list[dict[str, str]]:
    if persona == "masculine":
        return _MASCULINE_HAIRSTYLES
    if persona == "feminine":
        return _FEMININE_HAIRSTYLES
    # Neutral / unknown — show one of each so the user can self-select.
    return [_MASCULINE_HAIRSTYLES[0], _FEMININE_HAIRSTYLES[0]]


# Kept for backwards-compatibility with anything still importing the constant.
HAIRSTYLE_REFERENCES: list[dict[str, str]] = _hairstyles_for("neutral")


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


def _extract_gender(face_attrs: dict[str, Any]) -> str | None:
    """Pull a gender label out of either the normalized or raw face payload."""
    direct = face_attrs.get("gender")
    if direct:
        return str(direct)
    results = face_attrs.get("results") if isinstance(face_attrs.get("results"), dict) else None
    if isinstance(results, dict):
        agegender = results.get("agegender")
        if isinstance(agegender, dict) and agegender.get("gender"):
            return str(agegender["gender"])
    return None


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
    gender = _extract_gender(face_attrs)
    persona = normalize_persona(gender)

    return {
        "face_attributes": face_attrs,
        "skin_tone": skin_tone,
        **plan,
        "persona": persona,
        "makeup_presets": choose_makeup_presets(undertone, gender),
        "hairstyles": _hairstyles_for(persona),
        "accessory_queries": _build_accessory_queries(face_shape, undertone),
    }


@router.post("/analyze")
async def analyze_glowup(selfie: UploadFile = File(...)) -> dict[str, Any]:
    try:
        selfie_bytes = await read_image(selfie)
        analysis_results = await asyncio.gather(
            skin_tools.analyze_face(selfie_bytes),
            skin_tools.analyze_skin_tone(selfie_bytes),
            return_exceptions=True,
        )

        face_result, tone_result = analysis_results
        warnings: list[str] = []

        if isinstance(face_result, Exception):
            logger.warning("Glowup face analysis degraded to fallback: %s", face_result)
            face_attrs = {
                "shape": "Balanced",
                "eye_shape": "Defined",
                "lip_shape": "Natural",
            }
            warnings.append("face_analysis_unavailable")
        else:
            face_attrs = _normalize_face_attrs(face_result)

        if isinstance(tone_result, Exception):
            logger.warning("Glowup skin tone analysis degraded to fallback: %s", tone_result)
            skin_tone = {
                "undertone": "neutral",
            }
            warnings.append("skin_tone_unavailable")
        else:
            skin_tone = _normalize_skin_tone(tone_result)

        return {
            "face_attributes": face_attrs,
            "skin_tone": skin_tone,
            "warnings": warnings,
            "degraded": bool(warnings),
        }
    except PerfectCorpAPIError as exc:
        raise _provider_error_to_http(exc, "glowup_analysis") from exc
    except Exception as exc:
        logger.exception("Unexpected glowup analyze failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=_detail(
                "provider_internal",
                "Unable to analyze GlowUp right now. Please try again.",
                provider_message=str(exc),
                source="glowup_analysis",
            ),
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
                    detail=_detail(
                        "invalid_input",
                        "Provide either a selfie or saved face analysis before building GlowUp.",
                        provider_message="Provide either a selfie or both face_attributes_json and skin_tone_json.",
                        source="glowup_recommend",
                    ),
                )
            try:
                payload = GlowupRecommendRequest(
                    face_attributes=_load_json(face_attributes_json),
                    skin_tone=_load_json(skin_tone_json),
                )
                face_attrs = payload.face_attributes
                skin_tone = payload.skin_tone
            except ValueError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=_detail(
                        "invalid_input",
                        "GlowUp analysis data is invalid. Run face analysis again.",
                        provider_message=str(exc),
                        source="glowup_recommend",
                    ),
                ) from exc

        plan = await agent_service.generate_glowup_plan(face_attrs, skin_tone)
        return _enrich_plan(face_attrs, skin_tone, plan)
    except PerfectCorpAPIError as exc:
        raise _provider_error_to_http(exc, "glowup_recommend") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected glowup recommend failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=_detail(
                "provider_internal",
                "Unable to build a GlowUp plan right now. Please try again.",
                provider_message=str(exc),
                source="glowup_recommend",
            ),
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
