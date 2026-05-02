"""Beauty tools — makeup VTO."""
from app.tools.base_vto import execute_vto
from app.core.constants import VTOTaskType


async def try_on_makeup(selfie_bytes: bytes, params: dict) -> dict:
    suffix = f"{params.get('lip_color', '')}-{params.get('lip_texture', '')}"
    return await execute_vto(VTOTaskType.MAKEUP, selfie_bytes, params, cache_suffix=suffix)
