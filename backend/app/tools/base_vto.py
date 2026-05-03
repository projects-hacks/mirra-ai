"""Base VTO operation — shared cache + call + extract pattern for all VTO tools."""
from typing import Any

from app.services import perfectcorp
from app.core import cache
from app.core.constants import CachePrefix


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
    cache_key = f"{CachePrefix.VTO}:{task_type}:{selfie_hash}:{cache_suffix}"

    cached = await cache.get(cache_key)
    if cached:
        return cached

    result = await perfectcorp.call_vto(task_type, selfie_bytes, ref_image_url, extra_params)
    inner = result.get("result", result)

    vto_result = {
        "image_url": inner.get("result_image_url"),
        **{k: v for k, v in inner.items() if k != "result_image_url"},
    }

    await cache.set(cache_key, vto_result, cache.TTL.VTO_RESULT)
    return vto_result
