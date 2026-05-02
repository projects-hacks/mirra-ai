"""Skin analysis tools — analyze_skin, analyze_skin_tone, face_attributes."""
from app.services import perfectcorp
from app.services.supabase_client import supabase
from app.core import cache
from app.core.constants import VTOTaskType, CachePrefix, ALL_SKIN_CONCERNS


async def analyze_skin(selfie_bytes: bytes, user_id: str | None = None) -> dict:
    """Run full skin analysis and persist results."""
    result = await perfectcorp.call_api(VTOTaskType.SKIN_ANALYSIS, selfie_bytes, {
        "dst_actions": ALL_SKIN_CONCERNS,
        "format": "json",
    })

    scores = result.get("result", result)

    if user_id and supabase:
        supabase.table("skin_scans").insert({
            "user_id": user_id,
            "scores": scores,
            "skin_age": scores.get("skin_age"),
        }).execute()

        supabase.table("body_model").upsert({
            "user_id": user_id,
            "skin_scores": scores,
        }, on_conflict="user_id").execute()

        await cache.delete(f"{CachePrefix.BODY}:{user_id}")

    return {"scores": scores}


async def analyze_skin_tone(selfie_bytes: bytes, user_id: str | None = None) -> dict:
    """Detect skin undertone, depth, and color profile."""
    result = await perfectcorp.call_api(VTOTaskType.SKIN_TONE, selfie_bytes)
    tone = result.get("result", result)

    if user_id and supabase:
        supabase.table("body_model").upsert({
            "user_id": user_id,
            "skin_tone": tone,
        }, on_conflict="user_id").execute()

        await cache.delete(f"{CachePrefix.BODY}:{user_id}")

    return tone


async def analyze_face(selfie_bytes: bytes, user_id: str | None = None) -> dict:
    """Detect face shape and proportions."""
    result = await perfectcorp.call_api(VTOTaskType.FACE_ATTRIBUTES, selfie_bytes)
    face = result.get("result", result)

    if user_id and supabase:
        supabase.table("body_model").upsert({
            "user_id": user_id,
            "face_shape": face,
        }, on_conflict="user_id").execute()

        await cache.delete(f"{CachePrefix.BODY}:{user_id}")

    return face
