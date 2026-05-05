"""Curated makeup presets for GlowUp recommendations."""
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


def choose_makeup_presets(undertone: str | None, limit: int = 4) -> list[dict[str, Any]]:
    """Return undertone-aware presets, falling back to the base set."""
    normalized = (undertone or "neutral").strip().lower()
    matching = [
        preset
        for preset in MAKEUP_PRESETS
        if normalized in [tone.lower() for tone in preset.get("best_for", [])]
    ]
    return (matching or MAKEUP_PRESETS)[:limit]
