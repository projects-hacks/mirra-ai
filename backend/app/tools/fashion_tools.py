"""Fashion tools — clothes VTO via Perfect Corp cloth-v3 endpoint."""
from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def try_on_clothes(selfie_bytes: bytes, garment_url: str, garment_category: str = "upper") -> dict:
    """Try on a garment. garment_category: upper, lower, full (dress)."""
    return await execute_vto(
        VTOTaskType.CLOTHES,
        selfie_bytes,
        ref_image_url=garment_url,
        extra_params={"garment_category": garment_category},
        cache_suffix=garment_url[-32:],
    )
