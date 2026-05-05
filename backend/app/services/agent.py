"""Agent reasoning service for structured lifestyle insights."""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.core.llm_config import (
    GEMINI_API_BASE_URL,
    GEMINI_MODEL_NAME,
    GEMINI_TIMEOUT_SECONDS,
)

logger = logging.getLogger(__name__)


class AgentServiceError(Exception):
    """Raised when the agent service cannot generate a structured response."""


def _extract_text(response_json: dict[str, Any]) -> str:
    candidates = response_json.get("candidates") or []
    if not candidates:
        raise AgentServiceError("Gemini returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
    if not text.strip():
        raise AgentServiceError("Gemini returned an empty response")
    return text


def _safe_json_loads(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.replace("json\n", "", 1)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AgentServiceError(f"Invalid JSON from Gemini: {exc}") from exc


class AgentService:
    """Generate structured, explainable responses from upstream tool outputs."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.GOOGLE_AI_STUDIO_KEY

    async def generate_glowup_plan(
        self,
        face_attrs: dict[str, Any],
        skin_tone: dict[str, Any],
    ) -> dict[str, Any]:
        """Recommend makeup, hair, and accessories with a visible reasoning trace."""
        if not self.api_key:
            return self._fallback_glowup_plan(face_attrs, skin_tone)

        prompt = f"""
You are Mirra, an AI appearance operator.
Analyze the following face and skin tone data, then return ONLY valid JSON.

FACE ATTRIBUTES:
{json.dumps(face_attrs, indent=2)}

SKIN TONE:
{json.dumps(skin_tone, indent=2)}

Return this exact JSON schema:
{{
  "steps": [
    {{"emoji": "string", "text": "string", "status": "complete"}}
  ],
  "insight": "string",
  "recommendations": [
    {{
      "category": "makeup|hair|accessories",
      "title": "string",
      "why": "string"
    }}
  ],
  "tool_calls_made": ["analyze_face", "analyze_skin_tone"]
}}

Requirements:
- Keep it concise, premium, and practical.
- Give 3 to 5 recommendations total.
- Base recommendations on face shape, facial features, and coloring.
- Do not include markdown.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.4,
                "topP": 0.95,
                "topK": 40,
                "maxOutputTokens": 1024,
                "responseMimeType": "application/json",
            },
        }

        url = f"{GEMINI_API_BASE_URL}/models/{GEMINI_MODEL_NAME}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    url,
                    params={"key": self.api_key},
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                response.raise_for_status()
                content = _extract_text(response.json())
                return _safe_json_loads(content)
        except Exception as exc:
            logger.warning("Gemini glowup generation failed, using fallback: %s", exc)
            return self._fallback_glowup_plan(face_attrs, skin_tone)

    def _fallback_glowup_plan(
        self,
        face_attrs: dict[str, Any],
        skin_tone: dict[str, Any],
    ) -> dict[str, Any]:
        """Heuristic fallback so the endpoint still works without Gemini."""
        face_shape = str(face_attrs.get("shape") or face_attrs.get("face_shape") or "balanced").lower()
        eye_shape = str(face_attrs.get("eye_shape") or "defined").lower()
        lip_shape = str(face_attrs.get("lip_shape") or "natural").lower()
        undertone = str(
            skin_tone.get("undertone")
            or skin_tone.get("undertone_name")
            or skin_tone.get("skin_tone")
            or "neutral"
        ).lower()

        hair_title = "Soft volume around the crown"
        if "round" in face_shape:
            hair_title = "Long layers with vertical lift"
        elif "square" in face_shape:
            hair_title = "Soft waves to relax the jawline"
        elif "heart" in face_shape:
            hair_title = "Chin-level fullness for balance"

        makeup_tone = "rose-beige"
        if "warm" in undertone or "gold" in undertone:
            makeup_tone = "peach-gold"
        elif "cool" in undertone or "pink" in undertone:
            makeup_tone = "berry-rose"

        eyeliner_note = "Lift the outer corners with a soft wing"
        if "round" in eye_shape:
            eyeliner_note = "Elongate the eye shape with a tapered liner"

        lip_note = "Use a softly defined satin lip"
        if "full" in lip_shape:
            lip_note = "Keep lips polished with a blurred satin finish"

        return {
            "steps": [
                {"emoji": "📐", "text": f"Read your face shape as {face_shape}.", "status": "complete"},
                {"emoji": "🎨", "text": f"Mapped your coloring to a {undertone} palette.", "status": "complete"},
                {"emoji": "✨", "text": "Built a glowup plan across makeup, hair, and accessories.", "status": "complete"},
            ],
            "insight": (
                f"Your strongest lane is balanced enhancement: use {makeup_tone} tones, "
                f"shape-focused hair, and accessories that reinforce facial symmetry."
            ),
            "recommendations": [
                {"category": "makeup", "title": f"{makeup_tone.title()} complexion accents", "why": "Supports your undertone and brightens the face."},
                {"category": "makeup", "title": eyeliner_note, "why": "Adds definition without overwhelming your features."},
                {"category": "makeup", "title": lip_note, "why": "Keeps the look polished and proportionate."},
                {"category": "hair", "title": hair_title, "why": f"Works especially well for a {face_shape} face shape."},
                {"category": "accessories", "title": "Choose refined, face-framing jewelry", "why": "Keeps attention near the eyes and cheekbones."},
            ],
            "tool_calls_made": ["analyze_face", "analyze_skin_tone"],
        }


agent_service = AgentService()
