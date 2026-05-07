"""Map Mirra UI makeup presets to Perfect Corp makeup-vto effect objects.

Spec: Perfect Corp AI Makeup task — categories are snake_case (e.g. ``lip_color``, ``eye_shadow``).
Pattern ``name`` values must match labels in the public pattern JSON catalogs.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

# UI aliases → API ``category`` strings (snake_case).
_CATEGORY_ALIASES: dict[str, str] = {
    "lipstick": "lip_color",
    "lip color": "lip_color",
    "eyeshadow": "eye_shadow",
    "eye shadow": "eye_shadow",
    "eyeliner": "eye_liner",
    "eye liner": "eye_liner",
    "brows": "eyebrows",
    "skin-smoothing": "skin_smooth",
    "skin_smoothing": "skin_smooth",
    "skin smoothing": "skin_smooth",
    "skin_smooth": "skin_smooth",
    "lip liner": "lip_liner",
}

# Known catalogs — use safe single-palette defaults when UI pattern is not a valid label.
_DEFAULT_PATTERN: dict[str, str] = {
    "blush": "1color1",
    "bronzer": "Bronzer1",
    "contour": "OvalFace6",
    "eyebrows": "SoftArch1",
    "eye_liner": "Arabic3",
    "eye_shadow": "1color1",
    "eyelashes": "Natural1",
    "highlighter": "OvalFace2",
    "lip_liner": "Natural1",
}

_FOUNDATION_SHADE_HEX: dict[str, str] = {
    "warm-beige": "#D4A574",
    "golden-honey": "#C49860",
    "neutral-ivory": "#E8D4C4",
    "neutral-beige": "#D9B896",
    "neutral": "#D4B89A",
}

_DEFAULT_COLOR_BY_CATEGORY: dict[str, str] = {
    "eye_liner": "#1A1A1A",
    "eyebrows": "#4A3728",
    "eyelashes": "#1A1A1A",
}

# UI finish → API palette (varies by category).
_LIP_TEXTURE_ALIASES: dict[str, str] = {
    "velvet": "satin",
    "cream": "satin",
    "crème": "satin",
    "creme": "satin",
    "smoky": "matte",
}

_BLUSH_TEXTURE_ALIASES: dict[str, str] = {
    "gloss": "satin",
    "cream": "satin",
    "velvet": "matte",
}


def _normalize_category(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return "blush"
    key = raw.lower().replace("-", "_")
    key_spaces = raw.lower().strip()
    if key_spaces in _CATEGORY_ALIASES:
        return _CATEGORY_ALIASES[key_spaces]
    return _CATEGORY_ALIASES.get(key, key if "_" in key else raw.lower().replace(" ", "_"))


def _float_to_intensity(intensity: Any, default: int = 50) -> int:
    if intensity is None:
        return default
    try:
        v = float(intensity)
    except (TypeError, ValueError):
        return default
    if v <= 1.0:
        return max(0, min(100, int(round(v * 100))))
    return max(0, min(100, int(round(v))))


def _pattern_name(effect: dict[str, Any], category: str, *, flattened: bool) -> dict[str, Any]:
    """Flattened Mirra presets use cosmetic names, not catalog labels — always use defaults."""
    if flattened:
        return {"name": _DEFAULT_PATTERN.get(category, "1color1")}
    raw = effect.get("pattern")
    if isinstance(raw, dict) and isinstance(raw.get("name"), str) and raw["name"].strip():
        return {"name": raw["name"].strip()}
    return {"name": _DEFAULT_PATTERN.get(category, "1color1")}


def _resolve_texture(raw: Any, aliases: dict[str, str], allowed: set[str], fallback: str) -> str:
    t = str(raw or fallback).lower().strip()
    t = aliases.get(t, t)
    return t if t in allowed else fallback


def _hex_color(effect: dict[str, Any], category: str) -> str:
    c = effect.get("color")
    if c:
        return str(c)
    if effect.get("shade"):
        shade_key = str(effect["shade"]).lower().strip()
        return _FOUNDATION_SHADE_HEX.get(shade_key, "#D4B89A")
    return _DEFAULT_COLOR_BY_CATEGORY.get(category, "#B87A6A")


def _skin_smooth(effect: dict[str, Any]) -> dict[str, Any]:
    return {
        "category": "skin_smooth",
        "skinSmoothStrength": _float_to_intensity(effect.get("strength", effect.get("intensity", 0.5))),
        "skinSmoothColorIntensity": _float_to_intensity(
            effect.get("color_intensity", effect.get("skinSmoothColorIntensity", 0.45))
        ),
    }


def _palette_blush(color: str, ci: int, texture: str) -> dict[str, Any]:
    texture = _resolve_texture(texture, _BLUSH_TEXTURE_ALIASES, {"matte", "satin", "shimmer"}, "matte")
    p: dict[str, Any] = {"color": color, "texture": texture, "colorIntensity": ci}
    if texture == "satin":
        p["glowStrength"] = max(1, min(100, ci + 10))
    if texture == "shimmer":
        p["shimmerColor"] = color
        p["shimmerDensity"] = max(30, min(100, ci))
    return p


def _palette_eye_shadow_liner(color: str, ci: int, texture: str) -> dict[str, Any]:
    allowed = {"matte", "shimmer", "metallic"}
    texture = _resolve_texture(texture, _LIP_TEXTURE_ALIASES, allowed, "matte")
    p: dict[str, Any] = {"color": color, "texture": texture, "colorIntensity": ci}
    if texture in ("shimmer", "metallic"):
        p["shimmerColor"] = color
        p["shimmerIntensity"] = max(40, min(100, ci))
    if texture == "metallic":
        p["metallicIntensity"] = max(35, min(100, ci))
    return p


def _palette_lip(color: str, ci: int, texture: str) -> dict[str, Any]:
    allowed = {"matte", "gloss", "holographic", "metallic", "satin", "sheer", "shimmer"}
    texture = _resolve_texture(texture, _LIP_TEXTURE_ALIASES, allowed, "satin")
    p: dict[str, Any] = {"color": color, "texture": texture, "colorIntensity": ci}
    if texture in ("gloss", "holographic", "metallic", "sheer", "shimmer"):
        p["gloss"] = 75 if texture == "gloss" else 62
    if texture in ("gloss", "sheer", "shimmer"):
        p["transparencyIntensity"] = 45
    if texture in ("holographic", "metallic", "shimmer"):
        p["shimmerColor"] = color
        p["shimmerIntensity"] = max(45, min(100, ci))
        p["shimmerDensity"] = 50
        p["shimmerSize"] = 50
    return p


def _palette_foundation(color: str, ci: int) -> dict[str, Any]:
    return {
        "color": color,
        "colorIntensity": ci,
        "glowIntensity": max(20, min(80, 55)),
        "coverageIntensity": max(25, min(90, ci + 5)),
    }


def _palette_concealer(color: str, ci: int) -> dict[str, Any]:
    return {
        "color": color,
        "colorIntensity": ci,
        "colorUnderEyeIntensity": max(20, min(90, ci - 5)),
        "coverageLevel": max(30, min(90, ci)),
    }


def _palette_highlighter(color: str, ci: int) -> dict[str, Any]:
    return {
        "color": color,
        "glowIntensity": max(35, min(100, ci + 15)),
        "shimmerIntensity": max(30, min(100, ci)),
        "shimmerDensity": 50,
        "shimmerSize": 50,
        "colorIntensity": ci,
    }


def _palette_lip_liner(color: str, ci: int, texture: str) -> dict[str, Any]:
    t = _resolve_texture(texture, {}, {"matte", "satin"}, "matte")
    return {
        "color": color,
        "texture": t,
        "colorIntensity": ci,
        "thickness": max(30, min(100, ci)),
        "smoothness": 50,
    }


def _palette_eyebrows(color: str, ci: int, texture: str) -> dict[str, Any]:
    t = _resolve_texture(texture, {}, {"matte", "shimmer"}, "matte")
    p: dict[str, Any] = {
        "color": color,
        "colorIntensity": ci,
        "texture": t,
    }
    if t == "shimmer":
        p["shimmerColor"] = color
        p["shimmerIntensity"] = 50
        p["shimmerSize"] = 50
        p["shimmerDensity"] = 50
    return p


def _normalize_one(effect: dict[str, Any]) -> dict[str, Any]:
    category = _normalize_category(effect.get("category"))
    finish = effect.get("texture") or effect.get("finish")
    ci = _float_to_intensity(effect.get("intensity", 0.5))

    if category == "skin_smooth":
        return _skin_smooth(effect)

    color = _hex_color(effect, category)

    if category == "foundation":
        return {"category": "foundation", "palettes": [_palette_foundation(color, ci)]}

    if category == "concealer":
        return {"category": "concealer", "palettes": [_palette_concealer(color, ci)]}

    if category == "bronzer":
        pat = _pattern_name(effect, category, flattened=True)
        return {"category": "bronzer", "pattern": pat, "palettes": [{"color": color, "colorIntensity": ci}]}

    if category == "blush":
        pat = _pattern_name(effect, category, flattened=True)
        return {
            "category": "blush",
            "pattern": pat,
            "palettes": [_palette_blush(color, ci, str(finish or "matte"))],
        }

    if category == "contour":
        pat = _pattern_name(effect, category, flattened=True)
        return {"category": "contour", "pattern": pat, "palettes": [{"color": color, "colorIntensity": ci}]}

    if category == "highlighter":
        pat = _pattern_name(effect, category, flattened=True)
        return {"category": "highlighter", "pattern": pat, "palettes": [_palette_highlighter(color, ci)]}

    if category == "eyelashes":
        pat = _pattern_name(effect, category, flattened=True)
        return {"category": "eyelashes", "pattern": pat, "palettes": [{"color": color, "colorIntensity": ci}]}

    if category == "eyebrows":
        pat = effect.get("pattern") if isinstance(effect.get("pattern"), dict) else None
        if not isinstance(pat, dict):
            pat = {
                "type": "shape",
                "name": _DEFAULT_PATTERN["eyebrows"],
                "curvature": 0,
                "thickness": _float_to_intensity(effect.get("thickness", 0)),
                "definition": ci,
            }
        else:
            pat = dict(pat)
            pat.setdefault("type", "shape")
            pat.setdefault("name", _DEFAULT_PATTERN["eyebrows"])
            pat.setdefault("curvature", 0)
            pat.setdefault("thickness", 0)
            pat.setdefault("definition", ci)
        return {
            "category": "eyebrows",
            "pattern": pat,
            "palettes": [_palette_eyebrows(color, ci, str(finish or "matte"))],
        }

    if category == "eye_shadow":
        pat = _pattern_name(effect, category, flattened=True)
        return {
            "category": "eye_shadow",
            "pattern": pat,
            "palettes": [_palette_eye_shadow_liner(color, ci, str(finish or "matte"))],
        }

    if category == "eye_liner":
        pat = _pattern_name(effect, category, flattened=True)
        return {
            "category": "eye_liner",
            "pattern": pat,
            "palettes": [_palette_eye_shadow_liner(color, ci, str(finish or "matte"))],
        }

    if category == "lip_color":
        shape = effect.get("shape") if isinstance(effect.get("shape"), dict) else {"name": "original"}
        shape = dict(shape)
        shape.setdefault("name", "original")
        morph = effect.get("morphology") if isinstance(effect.get("morphology"), dict) else {}
        morph = {"fullness": _float_to_intensity(morph.get("fullness", 0), 0), "wrinkless": _float_to_intensity(morph.get("wrinkless", 0), 0)}
        lip_style = effect.get("style") if isinstance(effect.get("style"), dict) else {"type": "full"}
        lip_style = dict(lip_style)
        lip_style.setdefault("type", "full")
        return {
            "category": "lip_color",
            "shape": shape,
            "morphology": morph,
            "style": lip_style,
            "palettes": [_palette_lip(color, ci, str(finish or "satin"))],
        }

    if category == "lip_liner":
        pat = _pattern_name(effect, category, flattened=True)
        return {
            "category": "lip_liner",
            "pattern": pat,
            "palettes": [_palette_lip_liner(color, ci, str(finish or "matte"))],
        }

    # Unknown category — treat as blush for safety
    return {
        "category": "blush",
        "pattern": {"name": _DEFAULT_PATTERN["blush"]},
        "palettes": [_palette_blush(color, ci, "matte")],
    }


def _sanitize_provider_effect(effect: dict[str, Any]) -> dict[str, Any]:
    """Fix category casing and merge missing required palette fields for known categories."""
    out = deepcopy(effect)
    cat = _normalize_category(out.get("category"))
    out["category"] = cat
    pals = out.get("palettes")
    if not isinstance(pals, list) or not pals:
        return out
    # Minimal fixes: normalize lip palette gloss fields, foundation coverage, etc.
    first = pals[0] if isinstance(pals[0], dict) else {}
    ci = _float_to_intensity(first.get("colorIntensity", 50))
    color = str(first.get("color") or "#B87A6A")

    if cat == "foundation" and isinstance(pals[0], dict):
        pals[0] = {**_palette_foundation(color, ci), **pals[0]}
    elif cat == "lip_color" and isinstance(pals[0], dict):
        tex = str(pals[0].get("texture") or "satin")
        base = _palette_lip(color, ci, tex)
        pals[0] = {**base, **pals[0]}
        if "shape" not in out:
            out["shape"] = {"name": "original"}
        if "style" not in out:
            out["style"] = {"type": "full"}
    elif cat == "blush" and isinstance(pals[0], dict):
        tex = str(pals[0].get("texture") or "matte")
        pals[0] = {**_palette_blush(color, ci, tex), **pals[0]}

    return out


def normalize_makeup_effects(effects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for e in effects:
        if not isinstance(e, dict):
            continue
        pals = e.get("palettes")
        if (
            isinstance(pals, list)
            and pals
            and isinstance(pals[0], dict)
            and "colorIntensity" in pals[0]
            and "color" in pals[0]
        ):
            out.append(_sanitize_provider_effect(e))
        else:
            out.append(_normalize_one(e))
    return out
