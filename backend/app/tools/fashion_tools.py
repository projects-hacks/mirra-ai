"""Fashion tools — clothes VTO."""
from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def try_on_clothes(selfie_bytes: bytes, product_id: str) -> dict:
    return await execute_vto(VTOTaskType.CLOTHES, selfie_bytes, {"product_id": product_id}, cache_suffix=product_id)
