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
    ref_image_url: str | None = None,
    extra_params: dict[str, Any] | None = None,
    cache_suffix: str = "",
    *,
    ref_bytes: bytes | None = None,
) -> dict:
    """Execute any Perfect Corp VTO call with Redis caching.

    Supply either ``ref_image_url`` (public URL) or ``ref_bytes`` (uploaded reference file).
    """
    if ref_bytes is None and not (ref_image_url or "").strip():
        raise ValueError("execute_vto requires ref_image_url or ref_bytes")

    selfie_hash = cache.hash_bytes(selfie_bytes)
    ref_fingerprint: str
    if ref_bytes is not None:
        ref_fingerprint = cache.hash_bytes(ref_bytes)
    else:
        ref_fingerprint = (ref_image_url or "").strip()[-64:]

    params_hash = cache.hash_json({
        "ref": ref_fingerprint,
        "ref_mode": "bytes" if ref_bytes is not None else "url",
        "extra_params": extra_params or {},
        "cache_suffix": cache_suffix,
    })
    cache_key = f"{CachePrefix.VTO}:{task_type}:{selfie_hash}:{params_hash}"

    cached = await cache.get(cache_key)
    if isinstance(cached, dict) and cached.get("image_url"):
        return cached

    result = await perfectcorp.call_vto(
        task_type,
        selfie_bytes,
        None if ref_bytes is not None else (ref_image_url or "").strip(),
        extra_params,
        ref_bytes=ref_bytes,
    )
    if not isinstance(result, dict):
        result = {}

    inner = result.get("result", result)
    if not isinstance(inner, dict):
        inner = {}

    image_url = extract_result_image_url(result)

    vto_result: dict[str, Any] = {
        "image_url": image_url,
        **{k: v for k, v in inner.items() if k != "result_image_url"},
    }

    await cache.set(cache_key, vto_result, cache.TTL.VTO_RESULT)
    return vto_result
