"""Hair tools — hairstyle transfer via Perfect Corp hair-transfer (v2.1) endpoint."""
from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def change_hairstyle(selfie_bytes: bytes, ref_hair_url: str) -> dict:
    """Transfer a hairstyle from a reference photo onto the selfie.

    Note: hair-transfer requires JPG/JPEG only, long side ≤ 1024px.
    """
    return await execute_vto(
        VTOTaskType.HAIRSTYLE,
        selfie_bytes,
        ref_image_url=ref_hair_url,
        cache_suffix=ref_hair_url[-32:],
    )
