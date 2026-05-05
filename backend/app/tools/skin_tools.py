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


# ── Skin concern → simulation intensity mapping ──────────────────
# The skin analysis API returns scores 0-100 where HIGHER = BETTER (healthier).
# The simulation API takes 0.0-1.0 where HIGHER = MORE improvement to show.
# So: low analysis score → skin has problems → high simulation intensity.
_CONCERN_TO_SIM_KEY = {
    "acne": "acne",
    "wrinkle": "wrinkle",
    "pore": "pores",
    "texture": "texture",
    "dark_circle": "dark_circle",       # dark_circle_v2 in analysis
    "redness": "redness",
    "oiliness": "oiliness",
    "eye_bag": "eye_bags",
    "age_spot": "spots",
    "radiance": "radiance",
}


def _derive_intensities_from_scores(scores: dict) -> dict[str, float]:
    """Convert skin analysis scores → simulation intensities.

    Low score (bad skin) → high intensity (lots of improvement to show).
    High score (good skin) → low intensity (little improvement needed).

    Mapping: intensity = (100 - ui_score) / 100, clamped to [0.1, 0.9]
    We never go to 0.0 (no change visible) or 1.0 (unrealistically perfect).
    """
    intensities = {}
    for concern_key, sim_key in _CONCERN_TO_SIM_KEY.items():
        # Handle both "wrinkle": {"ui_score": 82} and "wrinkle": 82 formats
        score_data = scores.get(concern_key, scores.get(f"{concern_key}_v2"))
        if score_data is None:
            continue

        if isinstance(score_data, dict):
            ui_score = score_data.get("ui_score", score_data.get("raw_score", 75))
        else:
            ui_score = float(score_data)

        # Invert: low score → high intensity
        intensity = (100 - ui_score) / 100.0
        # Clamp to [0.1, 0.9] — always show *some* change, never unrealistic
        intensity = max(0.1, min(0.9, intensity))
        intensities[sim_key] = round(intensity, 2)

    return intensities


async def simulate_skin(
    selfie_bytes: bytes,
    intensities: dict | None = None,
    user_id: str | None = None,
) -> dict:
    """Run skin simulation to show before/after improvement visualization.

    If `intensities` is empty or not provided, auto-derives them from
    the user's latest skin scan (most recent `skin_scans` row in Supabase).

    Args:
        selfie_bytes: JPEG/PNG selfie image.
        intensities: Optional dict of concern → 0.0-1.0 intensity overrides.
        user_id: Supabase user ID for fetching latest scan.

    Returns:
        {"simulation_url": "https://...", "intensities_used": {...}}
    """
    import logging
    logger = logging.getLogger(__name__)

    # Auto-derive from latest skin scan if no intensities provided
    if not intensities and user_id and supabase:
        try:
            scan = (
                supabase.table("skin_scans")
                .select("scores")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if scan.data and scan.data[0].get("scores"):
                intensities = _derive_intensities_from_scores(scan.data[0]["scores"])
                logger.info(f"Auto-derived simulation intensities from skin scan: {intensities}")
        except Exception as e:
            logger.warning(f"Failed to fetch skin scan for auto-derivation: {e}")

    # Fallback defaults if still empty — show moderate improvement across the board
    if not intensities:
        intensities = {
            "wrinkle": 0.5, "radiance": 0.6, "acne": 0.5, "pores": 0.4,
            "texture": 0.5, "dark_circle": 0.4, "redness": 0.3,
            "oiliness": 0.3, "eye_bags": 0.3, "spots": 0.4,
        }
        logger.info("Using fallback simulation intensities (no skin scan available)")

    result = await perfectcorp.call_api(
        VTOTaskType.SKIN_SIMULATION, selfie_bytes, intensities
    )

    # The simulation API returns a result image URL
    simulation_url = result.get("url") or result.get("result", {}).get("url", "")

    return {
        "simulation_url": simulation_url,
        "intensities_used": intensities,
    }

