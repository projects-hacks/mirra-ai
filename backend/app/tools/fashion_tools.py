"""Fashion tools — clothes VTO via Perfect Corp cloth-v3 endpoint."""
import hashlib

from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def try_on_clothes(
    selfie_bytes: bytes,
    *,
    garment_url: str | None = None,
    garment_bytes: bytes | None = None,
    garment_category: str = "upper",
) -> dict:
    """Try on a garment from a URL or from raw image bytes (uploaded as ``ref_file_id``).

    Exactly one of ``garment_url`` or ``garment_bytes`` must be provided.
    """
    if (garment_url is None or not garment_url.strip()) and garment_bytes is None:
        raise ValueError("garment_url or garment_bytes is required")
    if garment_bytes is not None and garment_url and garment_url.strip():
        raise ValueError("Provide only one of garment_url or garment_bytes")

    suffix = (
        garment_url[-32:]
        if garment_url
        else hashlib.sha256(garment_bytes or b"").hexdigest()[:16]
    )
    return await execute_vto(
        VTOTaskType.CLOTHES,
        selfie_bytes,
        None if garment_bytes is not None else garment_url.strip(),
        {"garment_category": garment_category},
        cache_suffix=suffix,
        ref_bytes=garment_bytes,
    )
