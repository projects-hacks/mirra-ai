from app.tools.makeup_effect_normalize import normalize_makeup_effects


def test_normalize_flattens_pattern_and_adds_palettes():
    raw = [
        {
            "category": "blush",
            "pattern": "soft-lift",
            "color": "#D68C7A",
            "intensity": 0.38,
        }
    ]
    out = normalize_makeup_effects(raw)
    assert out == [
        {
            "category": "blush",
            "pattern": {"name": "soft-lift"},
            "palettes": [
                {"color": "#D68C7A", "texture": "matte", "colorIntensity": 38},
            ],
        }
    ]


def test_normalize_maps_lipstick_category():
    raw = [{"category": "lipstick", "finish": "satin", "color": "#BC6B66", "intensity": 0.46}]
    out = normalize_makeup_effects(raw)
    assert out[0]["category"] == "lip color"
    assert out[0]["pattern"] == {"name": "natural"}


def test_normalize_uses_finish_as_texture():
    raw = [{"category": "foundation", "shade": "warm-beige", "intensity": 0.45}]
    out = normalize_makeup_effects(raw)
    assert out[0]["category"] == "foundation"
    assert out[0]["palettes"][0]["color"] == "#D4A574"
    assert out[0]["palettes"][0]["colorIntensity"] == 45


def test_normalize_eyeliner_style_to_pattern_and_dark_color():
    raw = [{"category": "eyeliner", "style": "winged", "intensity": 0.58}]
    out = normalize_makeup_effects(raw)
    assert out[0]["pattern"] == {"name": "winged"}
    assert out[0]["palettes"][0]["color"] == "#1A1A1A"
    assert out[0]["palettes"][0]["colorIntensity"] == 58


def test_passes_through_provider_shaped_effects():
    raw = [
        {
            "category": "blush",
            "pattern": {"name": "2colors6"},
            "palettes": [{"color": "#FF0000", "texture": "matte", "colorIntensity": 50}],
        }
    ]
    assert normalize_makeup_effects(raw) == raw
