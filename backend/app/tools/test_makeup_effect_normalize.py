from app.tools.makeup_effect_normalize import normalize_makeup_effects


def test_normalize_flattens_blush_with_catalog_pattern():
    raw = [
        {
            "category": "blush",
            "pattern": "soft-lift",
            "color": "#D68C7A",
            "intensity": 0.38,
        }
    ]
    out = normalize_makeup_effects(raw)
    assert out[0]["category"] == "blush"
    assert out[0]["pattern"] == {"name": "1color1"}
    assert out[0]["palettes"][0]["colorIntensity"] == 38
    assert out[0]["palettes"][0]["texture"] == "matte"


def test_normalize_maps_lipstick_to_lip_color_schema():
    raw = [{"category": "lipstick", "finish": "satin", "color": "#BC6B66", "intensity": 0.46}]
    out = normalize_makeup_effects(raw)
    assert out[0]["category"] == "lip_color"
    assert out[0]["shape"] == {"name": "original"}
    assert out[0]["style"] == {"type": "full"}
    assert out[0]["palettes"][0]["texture"] == "satin"
    assert "gloss" not in out[0]["palettes"][0]


def test_normalize_foundation_fills_required_fields():
    raw = [{"category": "foundation", "shade": "warm-beige", "intensity": 0.45}]
    out = normalize_makeup_effects(raw)
    assert out[0]["category"] == "foundation"
    pal = out[0]["palettes"][0]
    assert pal["color"] == "#D4A574"
    assert "coverageIntensity" in pal
    assert "glowIntensity" in pal


def test_normalize_eyeliner_defaults_to_catalog_pattern():
    raw = [{"category": "eyeliner", "style": "winged", "intensity": 0.58}]
    out = normalize_makeup_effects(raw)
    assert out[0]["category"] == "eye_liner"
    assert out[0]["pattern"] == {"name": "Arabic3"}
    assert out[0]["palettes"][0]["color"] == "#1A1A1A"
    assert out[0]["palettes"][0]["colorIntensity"] == 58


def test_passes_through_provider_shaped_with_category_fix():
    raw = [
        {
            "category": "blush",
            "pattern": {"name": "2colors1"},
            "palettes": [
                {"color": "#e19f9f", "texture": "matte", "colorIntensity": 60, "shimmerColor": "#d63252", "shimmerDensity": 50},
                {"color": "#c98a8a", "texture": "satin", "glowStrength": 40, "colorIntensity": 70},
            ],
        }
    ]
    out = normalize_makeup_effects(raw)
    assert out[0]["category"] == "blush"
    assert len(out[0]["palettes"]) == 2
