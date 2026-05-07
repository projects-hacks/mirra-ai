"""Curated makeup presets for GlowUp recommendations.

The chooser is gender + undertone aware so masculine-presenting users see
grooming-style polish (skin smoothing, brows, lip tint) instead of full
"glam" looks. Effects are still mapped through ``makeup_effect_normalize``
before being sent to Perfect Corp's makeup-vto endpoint.
"""
from __future__ import annotations

from typing import Any


MAKEUP_PRESETS: list[dict[str, Any]] = [
    {
        "id": "natural-glow",
        "title": "Natural Glow",
        "description": "Soft skin polish with lifted eyes and a fresh lip.",
        "best_for": ["warm", "neutral", "cool"],
        "effects": [
            {"category": "foundation", "shade": "warm-beige", "intensity": 0.45},
            {"category": "blush", "pattern": "soft-lift", "color": "#D68C7A", "intensity": 0.38},
            {"category": "lipstick", "finish": "satin", "color": "#BC6B66", "intensity": 0.46},
            {"category": "eyeshadow", "finish": "matte", "color": "#8C6A58", "intensity": 0.28},
        ],
    },
    {
        "id": "evening-glam",
        "title": "Evening Glam",
        "description": "Higher contrast with sculpted cheeks and defined eyes.",
        "best_for": ["warm", "neutral"],
        "effects": [
            {"category": "foundation", "shade": "golden-honey", "intensity": 0.52},
            {"category": "blush", "pattern": "draped", "color": "#B85F6F", "intensity": 0.5},
            {"category": "lipstick", "finish": "velvet", "color": "#8A3246", "intensity": 0.62},
            {"category": "eyeshadow", "finish": "shimmer", "color": "#7A4A3A", "intensity": 0.48},
            {"category": "eyeliner", "style": "winged", "intensity": 0.58},
        ],
    },
    {
        "id": "bold-lip",
        "title": "Bold Lip",
        "description": "Clean skin with the focus pushed to lip definition.",
        "best_for": ["cool", "neutral"],
        "effects": [
            {"category": "foundation", "shade": "neutral-ivory", "intensity": 0.4},
            {"category": "blush", "pattern": "minimal", "color": "#C4899A", "intensity": 0.24},
            {"category": "lipstick", "finish": "cream", "color": "#9F375D", "intensity": 0.72},
            {"category": "eyeshadow", "finish": "matte", "color": "#6F6470", "intensity": 0.22},
        ],
    },
    {
        "id": "smoky-eye",
        "title": "Smoky Eye",
        "description": "Soft drama around the eye with a quieter lip finish.",
        "best_for": ["cool", "neutral", "warm"],
        "effects": [
            {"category": "foundation", "shade": "neutral-beige", "intensity": 0.44},
            {"category": "blush", "pattern": "temple-lift", "color": "#A66C68", "intensity": 0.3},
            {"category": "lipstick", "finish": "satin", "color": "#936C70", "intensity": 0.34},
            {"category": "eyeshadow", "finish": "smoky", "color": "#4A4650", "intensity": 0.66},
            {"category": "eyeliner", "style": "smudged", "intensity": 0.63},
        ],
    },
]


# Subtle, grooming-oriented presets surfaced when the analyzed face reads
# masculine. We avoid bold lip / smoky eye combos and lean on foundation,
# skin smoothing, brow definition, and the lightest lip tint.
MASCULINE_MAKEUP_PRESETS: list[dict[str, Any]] = [
    {
        "id": "fresh-skin",
        "title": "Fresh Skin",
        "description": "Even tone with light skin polish — looks like you, just well-rested.",
        "best_for": ["warm", "neutral", "cool"],
        "effects": [
            {"category": "skin-smoothing", "intensity": 0.55, "color_intensity": 0.4},
            {"category": "foundation", "shade": "neutral-beige", "intensity": 0.18},
        ],
    },
    {
        "id": "defined-brows",
        "title": "Defined Brows",
        "description": "Sharper brow shape with a clean, neutral complexion.",
        "best_for": ["warm", "neutral", "cool"],
        "effects": [
            {"category": "skin-smoothing", "intensity": 0.45},
            {"category": "foundation", "shade": "neutral-beige", "intensity": 0.16},
            {"category": "eyebrows", "color": "#3F2E22", "intensity": 0.55, "texture": "matte"},
        ],
    },
    {
        "id": "even-undereye",
        "title": "Even Under-Eye",
        "description": "Softens shadows below the eye without looking made-up.",
        "best_for": ["warm", "neutral", "cool"],
        "effects": [
            {"category": "skin-smoothing", "intensity": 0.5},
            {"category": "concealer", "color": "#D6B89C", "intensity": 0.35},
        ],
    },
    {
        "id": "lip-tint",
        "title": "Lip Tint",
        "description": "Hydrated lip with the most subtle warm shift.",
        "best_for": ["warm", "neutral", "cool"],
        "effects": [
            {"category": "skin-smoothing", "intensity": 0.4},
            {"category": "foundation", "shade": "neutral-beige", "intensity": 0.14},
            {"category": "lipstick", "finish": "sheer", "color": "#9B6A60", "intensity": 0.18},
        ],
    },
]


_MASCULINE_TOKENS = {"male", "man", "masculine", "m"}
_FEMININE_TOKENS = {"female", "woman", "feminine", "f"}


def normalize_persona(gender: Any) -> str:
    """Map a Perfect Corp gender label to ``"masculine" | "feminine" | "neutral"``."""
    if not gender:
        return "neutral"
    raw = str(gender).strip().lower()
    if not raw:
        return "neutral"
    if raw in _FEMININE_TOKENS or "female" in raw or raw.startswith("woman"):
        return "feminine"
    if raw in _MASCULINE_TOKENS or raw.startswith("man") or "male" in raw:
        return "masculine"
    return "neutral"


def choose_makeup_presets(
    undertone: str | None,
    gender: str | None = None,
    limit: int = 4,
) -> list[dict[str, Any]]:
    """Return persona-aware presets, falling back to the universal set.

    - Masculine-presenting → grooming presets (skin polish / brows / under-eye).
    - Feminine or unknown → the original glam-leaning catalog.
    - Undertone is used as a soft filter; we never return an empty list.
    """
    persona = normalize_persona(gender)
    catalog = MASCULINE_MAKEUP_PRESETS if persona == "masculine" else MAKEUP_PRESETS

    normalized_tone = (undertone or "neutral").strip().lower()
    matching = [
        preset
        for preset in catalog
        if normalized_tone in [tone.lower() for tone in preset.get("best_for", [])]
    ]
    return (matching or catalog)[:limit]
