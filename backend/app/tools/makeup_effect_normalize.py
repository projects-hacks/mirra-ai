"""Map Mirra UI makeup presets to Perfect Corp makeup-vto effect objects.

Perfect Corp expects objects shaped like:
``{"category": "blush", "pattern": {"name": "2colors6"}, "palettes": [...]}``

Mirra presets use a flattened form (string pattern, top-level color/intensity/shade).
"""
from __future__ import annotations

from typing import Any

# Docs: docs/PERFECT_CORP_API_SOURCE_OF_TRUTH.md — category names use spaces.
_CATEGORY_ALIASES: dict[str, str] = {
    "lipstick": "lip color",
    "lip_color": "lip color",
    "eyeshadow": "eye shadow",
    "eye_shadow": "eye shadow",
    "brows": "eyebrows",
    "skin-smoothing": "skin smoothing",
    "skin_smoothing": "skin smoothing",
}

_FOUNDATION_SHADE_HEX: dict[str, str] = {
    "warm-beige": "#D4A574",
    "golden-honey": "#C49860",
    "neutral-ivory": "#E8D4C4",
    "neutral-beige": "#D9B896",
    "neutral": "#D4B89A",
}

# When a preset omits ``color`` (e.g. eyeliner), avoid using a skin-tone default.
_DEFAULT_COLOR_BY_CATEGORY: dict[str, str] = {
    "eyeliner": "#1A1A1A",
    "eyebrows": "#4A3728",
}


def _normalize_category(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "blush"
    key = raw.lower().replace("-", "_")
    return _CATEGORY_ALIASES.get(key, raw)


def _float_to_color_intensity(intensity: Any) -> int:
    if intensity is None:
        return 50
    try:
        v = float(intensity)
    except (TypeError, ValueError):
        return 50
    if v <= 1.0:
        return max(1, min(100, int(round(v * 100))))
    return max(1, min(100, int(round(v))))


def _effect_already_provider_shaped(effect: dict[str, Any]) -> bool:
    palettes = effect.get("palettes")
    if not isinstance(palettes, list) or not palettes:
        return False
    first = palettes[0]
    if not isinstance(first, dict):
        return False
    if "color" not in first:
        return False
    if "colorIntensity" not in first:
        return False
    pat = effect.get("pattern")
    if pat is not None and not isinstance(pat, dict):
        return False
    return True


def _normalize_one(effect: dict[str, Any]) -> dict[str, Any]:
    if _effect_already_provider_shaped(effect):
        return {
            "category": _normalize_category(effect.get("category")),
            "pattern": effect.get("pattern") or {"name": "natural"},
            "palettes": effect["palettes"],
        }

    category = _normalize_category(effect.get("category"))

    pattern_src = effect.get("pattern")
    if pattern_src is None and effect.get("style"):
        pattern_src = effect.get("style")

    if isinstance(pattern_src, dict):
        pattern = dict(pattern_src)
    elif isinstance(pattern_src, str) and pattern_src.strip():
        pattern = {"name": pattern_src.strip()}
    else:
        pattern = {"name": "natural"}

    color = effect.get("color")
    if not color and effect.get("shade"):
        shade_key = str(effect["shade"]).lower().strip()
        color = _FOUNDATION_SHADE_HEX.get(shade_key)
    if not color:
        color = _DEFAULT_COLOR_BY_CATEGORY.get(category.lower(), "#B87A6A")

    texture = str(effect.get("texture") or effect.get("finish") or "matte").lower()
    ci = _float_to_color_intensity(effect.get("intensity", 0.5))

    return {
        "category": category,
        "pattern": pattern,
        "palettes": [{"color": str(color), "texture": texture, "colorIntensity": ci}],
    }


def normalize_makeup_effects(effects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [_normalize_one(e) for e in effects if isinstance(e, dict)]
