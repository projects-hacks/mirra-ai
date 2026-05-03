"""Skin analysis tools — analyze_skin, analyze_skin_tone, face_attributes."""
from app.services import perfectcorp
from app.services.supabase_client import supabase
from app.services.color_analyzer import _analyze_with_perfectcorp
from app.core import cache
from app.core.constants import VTOTaskType, CachePrefix, ALL_SKIN_CONCERNS


async def analyze_skin(selfie_bytes: bytes, user_id: str | None = None) -> dict:
    """
    Run full skin analysis and persist results.
    
    OPTIMIZATION: Piggyback color analysis on this call to avoid extra API unit.
    Since we're already analyzing the face, extract color profile at the same time.
    """
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
        
        # OPTIMIZATION: Piggyback color analysis
        # Check if color profile is stale or missing
        try:
            color_cache_key = f"{CachePrefix.BODY}:{user_id}:color_profile"
            cached_color = await cache.get(color_cache_key)
            
            # If no color profile or stale, analyze now (no extra API cost!)
            if not cached_color or _is_color_profile_stale(cached_color):
                await _analyze_with_perfectcorp(selfie_bytes, user_id)
                print(f"Piggybacked color analysis for user {user_id} during skin scan")
        except Exception as e:
            print(f"Failed to piggyback color analysis: {e}")

    return {"scores": scores}


def _is_color_profile_stale(color_profile: dict) -> bool:
    """Check if color profile needs refresh (>90 days)"""
    from datetime import datetime, timedelta
    
    analyzed_at = color_profile.get("analyzed_timestamp")
    if not analyzed_at:
        return True
    
    try:
        analyzed_date = datetime.fromisoformat(analyzed_at)
        age_days = (datetime.now() - analyzed_date).days
        return age_days > 90
    except (ValueError, TypeError):
        return True


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
