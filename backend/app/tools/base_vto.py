"""Base VTO operation — shared cache + call + extract pattern for all VTO tools."""
from typing import Any

from app.services import perfectcorp
from app.core import cache
from app.core.constants import CachePrefix


def extract_result_image_url(result: dict[str, Any]) -> str | None:
    """Extract the image URL from common Perfect Corp success shapes."""
    if not isinstance(result, dict):
        return None

    for key in ("image_url", "result_image_url", "url"):
        value = result.get(key)
        if isinstance(value, str) and value:
            return value

    nested_candidates = [
        result.get("results"),
        result.get("result"),
        result.get("data"),
    ]
    for nested in nested_candidates:
        if isinstance(nested, dict):
            nested_url = extract_result_image_url(nested)
            if nested_url:
                return nested_url

    return None


async def execute_vto(
    task_type: str,
    selfie_bytes: bytes,
    ref_image_url: str,
    extra_params: dict[str, Any] | None = None,
    cache_suffix: str = "",
) -> dict:
    """Execute any Perfect Corp VTO call with Redis caching.

    All VTO tasks require a selfie (uploaded as src_file_id) and a
    reference image URL (garment, earring, hairstyle, etc.).
    """
    selfie_hash = cache.hash_bytes(selfie_bytes)
    params_hash = cache.hash_json({
        "ref_image_url": ref_image_url,
        "extra_params": extra_params or {},
        "cache_suffix": cache_suffix,
    })
    cache_key = f"{CachePrefix.VTO}:{task_type}:{selfie_hash}:{params_hash}"

    cached = await cache.get(cache_key)
    if cached:
        return cached

    result = await perfectcorp.call_vto(task_type, selfie_bytes, ref_image_url, extra_params)
    inner = result.get("result", result)
    image_url = extract_result_image_url(result)

    vto_result = {
        "image_url": image_url,
        **{k: v for k, v in inner.items() if k != "result_image_url"},
    }

    await cache.set(cache_key, vto_result, cache.TTL.VTO_RESULT)
    return vto_result
