import pytest

from app.tools import beauty_tools
from app.tools.base_vto import execute_vto, extract_result_image_url


def test_extract_result_image_url_accepts_nested_perfectcorp_shapes():
    assert extract_result_image_url({"image_url": "https://cdn.example/image.jpg"}) == "https://cdn.example/image.jpg"
    assert extract_result_image_url({"result_image_url": "https://cdn.example/result.jpg"}) == "https://cdn.example/result.jpg"
    assert extract_result_image_url({"url": "https://cdn.example/url.jpg"}) == "https://cdn.example/url.jpg"
    assert extract_result_image_url({"results": {"url": "https://cdn.example/results.jpg"}}) == "https://cdn.example/results.jpg"
    assert extract_result_image_url({"result": {"url": "https://cdn.example/result-nested.jpg"}}) == "https://cdn.example/result-nested.jpg"
    assert extract_result_image_url({"data": {"url": "https://cdn.example/data.jpg"}}) == "https://cdn.example/data.jpg"


@pytest.mark.asyncio
async def test_makeup_cache_key_includes_effects(monkeypatch):
    seen_keys: list[str] = []

    async def fake_get(key: str):
        seen_keys.append(key)
        return None

    async def fake_set(key: str, value, ttl: int):
        return None

    async def fake_call_api(task_type, selfie_bytes, params):
        first = params["effects"][0]
        label = first.get("id") or first.get("category", "x")
        return {"results": {"url": f"https://cdn.example/{label}.jpg"}}

    monkeypatch.setattr(beauty_tools.cache, "get", fake_get)
    monkeypatch.setattr(beauty_tools.cache, "set", fake_set)
    monkeypatch.setattr(beauty_tools.perfectcorp, "call_api", fake_call_api)

    selfie = b"same-selfie"
    await beauty_tools.try_on_makeup(
        selfie,
        [{"id": "natural", "category": "lipstick", "color": "#B86C66", "intensity": 0.3}],
    )
    await beauty_tools.try_on_makeup(
        selfie,
        [{"id": "bold", "category": "lipstick", "color": "#9F375D", "intensity": 0.72}],
    )

    assert len(seen_keys) == 2
    assert seen_keys[0] != seen_keys[1]


@pytest.mark.asyncio
async def test_vto_cache_key_includes_reference_url_and_params(monkeypatch):
    from app.tools import base_vto

    seen_keys: list[str] = []

    async def fake_get(key: str):
        seen_keys.append(key)
        return None

    async def fake_set(key: str, value, ttl: int):
        return None

    async def fake_call_vto(task_type, selfie_bytes, ref_image_url, extra_params):
        return {"results": {"url": f"https://cdn.example/{extra_params['garment_category']}.jpg"}}

    monkeypatch.setattr(base_vto.cache, "get", fake_get)
    monkeypatch.setattr(base_vto.cache, "set", fake_set)
    monkeypatch.setattr(base_vto.perfectcorp, "call_vto", fake_call_vto)

    selfie = b"same-selfie"
    await execute_vto(
        "cloth-v3",
        selfie,
        "https://cdn.example/same-product.jpg",
        {"garment_category": "upper_body"},
    )
    await execute_vto(
        "cloth-v3",
        selfie,
        "https://cdn.example/same-product.jpg",
        {"garment_category": "lower_body"},
    )
    await execute_vto(
        "cloth-v3",
        selfie,
        "https://cdn.example/other-product.jpg",
        {"garment_category": "upper_body"},
    )

    assert len(seen_keys) == 3
    assert len(set(seen_keys)) == 3
