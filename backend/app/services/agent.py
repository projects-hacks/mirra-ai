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

SKIN_CONCERN_LABELS = {
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
    "droopy_upper_eyelid": "Upper Eyelid",
    "droopy_lower_eyelid": "Lower Eyelid",
}


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


def _filter_skin_concern_scores(scores: dict[str, Any]) -> dict[str, Any]:
    return {key: scores[key] for key in SKIN_CONCERN_LABELS if key in scores}


class AgentService:
    """Generate structured, explainable responses from upstream tool outputs."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or settings.GOOGLE_AI_STUDIO_KEY

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
    {{"icon": "face|palette|sparkle", "text": "string", "status": "complete"}}
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

    async def generate_skin_insights(
        self,
        scores: dict[str, Any],
        skin_tone: dict[str, Any] | None = None,
        weather: dict[str, Any] | None = None,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Connect skin scores, weather, and history into actionable guidance."""
        concern_scores = _filter_skin_concern_scores(scores)
        if not self.api_key:
            return self._fallback_skin_insights(concern_scores, skin_tone, weather, history)

        prompt = f"""
You are Mirra, an AI appearance operator.
Analyze this skin context and return ONLY valid JSON.

SKIN SCORES:
{json.dumps(concern_scores, indent=2)}

SKIN TONE:
{json.dumps(skin_tone or {{}}, indent=2)}

WEATHER:
{json.dumps(weather or {{}}, indent=2)}

HISTORY:
{json.dumps(history or [], indent=2)}

Return this exact JSON schema:
{{
  "steps": [
    {{"icon": "scan|weather|history", "text": "string", "status": "complete"}}
  ],
  "insight": "string",
  "recommendations": [
    {{
      "title": "string",
      "description": "string",
      "action": "string"
    }}
  ],
  "tool_calls_made": ["skin-analysis", "weather", "history"]
}}

Requirements:
- Keep it concise and practical.
- Connect worst skin scores to weather/history when possible.
- Include 2 to 4 recommendations.
- Use actions such as "/skin", "/skin/simulate", or "/try-on".
- Do not include markdown.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.35,
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
            logger.warning("Gemini skin insight generation failed, using fallback: %s", exc)
            return self._fallback_skin_insights(scores, skin_tone, weather, history)

    async def generate_outfit_reasoning(
        self,
        matches: dict[str, Any],
        gaps: list[Any] | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Explain closet matches and missing pieces for an outfit decision."""
        if not self.api_key:
            return self._fallback_outfit_reasoning(matches, gaps, context)

        prompt = f"""
You are Mirra, an AI appearance operator.
Explain these closet matches and gaps. Return ONLY valid JSON.

MATCHES:
{json.dumps(matches, indent=2)}

GAPS:
{json.dumps(gaps or [], indent=2)}

CONTEXT:
{json.dumps(context or {{}}, indent=2)}

Return this exact JSON schema:
{{
  "steps": [
    {{"icon": "closet|gap|check", "text": "string", "status": "complete"}}
  ],
  "insight": "string",
  "recommendations": [
    {{
      "title": "string",
      "description": "string",
      "action": "string"
    }}
  ],
  "tool_calls_made": ["closet-match", "weather", "products"]
}}

Requirements:
- Explain why the selected closet items work.
- Call out missing pieces plainly when gaps exist.
- Include 2 to 4 recommendations.
- Do not include markdown.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.35,
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
            logger.warning("Gemini outfit reasoning generation failed, using fallback: %s", exc)
            return self._fallback_outfit_reasoning(matches, gaps, context)

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
                {"icon": "face", "text": f"Read your face shape as {face_shape}.", "status": "complete"},
                {"icon": "palette", "text": f"Mapped your coloring to a {undertone} palette.", "status": "complete"},
                {"icon": "sparkle", "text": "Built a glowup plan across makeup, hair, and accessories.", "status": "complete"},
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

    def _fallback_skin_insights(
        self,
        scores: dict[str, Any],
        skin_tone: dict[str, Any] | None,
        weather: dict[str, Any] | None,
        history: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        """Heuristic skin guidance when Gemini is unavailable."""
        def extract_score(value: Any) -> float | None:
            if isinstance(value, int | float):
                return float(value)
            if isinstance(value, dict):
                candidate = value.get("ui_score") or value.get("raw_score") or value.get("score")
                if isinstance(candidate, int | float):
                    return float(candidate)
            return None

        scored = [
            (key, score)
            for key, value in scores.items()
            if (score := extract_score(value)) is not None
        ]
        scored.sort(key=lambda item: item[1])
        top_concern = SKIN_CONCERN_LABELS.get(scored[0][0], scored[0][0].replace("_", " ")) if scored else "skin baseline"
        humidity = weather.get("humidity") if weather else None
        has_history = bool(history)

        return {
            "steps": [
                {"icon": "scan", "text": "Skin scores were loaded and ranked.", "status": "complete"},
                {
                    "icon": "weather",
                    "text": f"Weather context included {humidity}% humidity." if humidity is not None else "Weather context was unavailable.",
                    "status": "complete",
                },
                {
                    "icon": "history",
                    "text": "Compared against previous scan history." if has_history else "No previous scan history found yet.",
                    "status": "complete",
                },
            ],
            "insight": (
                f"Your highest priority is {top_concern}. Keep the routine stable and use the next scan "
                "to confirm whether this score is moving."
            ),
            "recommendations": [
                {
                    "title": "Review Skin Health",
                    "description": f"Open the skin page to inspect {top_concern} and adjacent scores.",
                    "action": "/skin",
                },
                {
                    "title": "Simulate Improvement",
                    "description": "Preview what targeted treatment could change before you shop.",
                    "action": "/skin/simulate",
                },
            ],
            "tool_calls_made": ["skin-analysis", *(["weather"] if weather else []), *(["history"] if has_history else [])],
        }

    def _fallback_outfit_reasoning(
        self,
        matches: dict[str, Any],
        gaps: list[Any] | None,
        context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Heuristic outfit reasoning when Gemini is unavailable."""
        match_count = sum(len(items) for items in matches.values() if isinstance(items, list))
        occasion = (context or {}).get("occasion") or "your occasion"
        gap_count = len(gaps or [])

        return {
            "steps": [
                {"icon": "closet", "text": f"Ranked {match_count} closet items for {occasion}.", "status": "complete"},
                {"icon": "gap", "text": f"Found {gap_count} wardrobe gaps.", "status": "complete"},
                {"icon": "check", "text": "Built the outfit reasoning summary.", "status": "complete"},
            ],
            "insight": (
                f"Your closet has a workable base for {occasion}. "
                "Use the strongest matches first, then fill only the gaps that improve the full look."
            ),
            "recommendations": [
                {
                    "title": "Try This Look",
                    "description": "Preview the matched outfit before committing.",
                    "action": "/try-on",
                },
                {
                    "title": "Fill Wardrobe Gaps",
                    "description": "Shop only the missing pieces that complete the occasion.",
                    "action": "/outfit",
                },
            ],
            "tool_calls_made": ["closet-match", *(["products"] if gaps else [])],
        }


agent_service = AgentService()
