"""Hair tools — hairstyle VTO."""
from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def change_hairstyle(selfie_bytes: bytes, style: str) -> dict:
    return await execute_vto(VTOTaskType.HAIRSTYLE, selfie_bytes, {"style": style}, cache_suffix=style)
