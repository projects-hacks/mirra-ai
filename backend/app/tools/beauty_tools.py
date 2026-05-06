"""Beauty tools — makeup VTO via Perfect Corp makeup-vto endpoint."""
from typing import Any

from app.services import perfectcorp
from app.core import cache
from app.core.constants import VTOTaskType, CachePrefix
from app.tools.base_vto import extract_result_image_url


async def try_on_makeup(selfie_bytes: bytes, effects: list[dict[str, Any]]) -> dict:
    """Apply makeup effects to selfie.

    Makeup VTO is special — it doesn't use ref_file_url.
    Instead it takes an effects array with category, pattern, palettes.
    """
    selfie_hash = cache.hash_bytes(selfie_bytes)
    effects_hash = cache.hash_json({"effects": effects, "version": "1.0"})
    cache_key = f"{CachePrefix.VTO}:{VTOTaskType.MAKEUP}:{selfie_hash}:{effects_hash}"

    cached = await cache.get(cache_key)
    if cached:
        return cached

    result = await perfectcorp.call_api(
        VTOTaskType.MAKEUP,
        selfie_bytes,
        {"effects": effects, "version": "1.0"},
    )
    inner = result.get("result", result)
    image_url = extract_result_image_url(result)
    vto_result = {
        "image_url": image_url,
        **{k: v for k, v in inner.items() if k != "result_image_url"},
    }

    await cache.set(cache_key, vto_result, cache.TTL.VTO_RESULT)
    return vto_result
