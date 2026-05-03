"""Accessory tools — earrings, necklace VTO via Perfect Corp 2d-vto endpoints."""
from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def try_on_earrings(selfie_bytes: bytes, earring_url: str) -> dict:
    """Try on earrings. Best results with side-facing earring images."""
    return await execute_vto(
        VTOTaskType.EARRINGS,
        selfie_bytes,
        ref_image_url=earring_url,
        cache_suffix=earring_url[-32:],
    )


async def try_on_necklace(selfie_bytes: bytes, necklace_url: str) -> dict:
    """Try on a necklace. Requires neck visibility in selfie."""
    return await execute_vto(
        VTOTaskType.NECKLACE,
        selfie_bytes,
        ref_image_url=necklace_url,
        cache_suffix=necklace_url[-32:],
    )
