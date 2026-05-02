"""Accessory tools — earrings, necklace VTO."""
from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def try_on_earrings(selfie_bytes: bytes, product_id: str) -> dict:
    return await execute_vto(VTOTaskType.EARRINGS, selfie_bytes, {"product_id": product_id}, cache_suffix=product_id)


async def try_on_necklace(selfie_bytes: bytes, product_id: str) -> dict:
    return await execute_vto(VTOTaskType.NECKLACE, selfie_bytes, {"product_id": product_id}, cache_suffix=product_id)
