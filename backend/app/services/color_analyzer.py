"""
Color Analysis Service
Hybrid approach: Perfect Corp API (cached) + rule-based fallback
"""

from typing import Dict, Optional
from app.services import perfectcorp
from app.services.supabase_client import supabase
from app.core import cache
from app.core.constants import VTOTaskType, CachePrefix
import logging

logger = logging.getLogger(__name__)


async def get_user_color_profile(
    user_id: str, 
    selfie_bytes: bytes | None = None,
    force_refresh: bool = False
) -> Optional[Dict]:
    """
    Get user's color profile with smart caching + staleness detection:
    1. Check cache (Redis) - instant, but check if stale
    2. Check database (body_model) - fast, but check age
    3. Run Perfect Corp analysis (if selfie provided OR data is stale) - slow but accurate
    4. Fallback to None (use rule-based matching)
    
    Staleness Policy:
    - Color profile expires after 90 days (seasonal changes)
    - Can be force-refreshed if user requests re-analysis
    - Automatically refreshes if skin analysis is run (piggyback on existing API call)
    
    This ensures zero latency for repeat users while keeping data fresh.
    """
    if not user_id:
        return None
    
    # Level 1: Redis cache (instant, but check staleness)
    cache_key = f"{CachePrefix.BODY}:{user_id}:color_profile"
    
    if not force_refresh:
        cached = await cache.get(cache_key)
        if cached and not _is_stale(cached):
            return cached
    
    # Level 2: Database (fast, but check age)
    if supabase and not force_refresh:
        result = supabase.table("body_model")\
            .select("color_palette, updated_at")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if result.data and result.data.get("color_palette"):
            color_profile = result.data["color_palette"]
            
            # Check if data is stale (>90 days old)
            if not _is_stale(color_profile):
                await cache.set(cache_key, color_profile, ttl=86400)  # Cache 24h
                return color_profile
            else:
                logger.info(f"Color profile for user {user_id} is stale (>90 days). Will refresh if selfie available.")
    
    # Level 3: Perfect Corp analysis (slow, only if selfie provided OR force refresh)
    if selfie_bytes:
        try:
            color_profile = await _analyze_with_perfectcorp(selfie_bytes, user_id)
            await cache.set(cache_key, color_profile, ttl=86400)
            return color_profile
        except Exception as e:
            logger.warning(f"Perfect Corp color analysis failed: {e}. Using fallback.")
            # If we have stale data, use it rather than nothing
            if supabase:
                result = supabase.table("body_model")\
                    .select("color_palette")\
                    .eq("user_id", user_id)\
                    .single()\
                    .execute()
                if result.data and result.data.get("color_palette"):
                    return result.data["color_palette"]
            return None
    
    # Level 4: No data available, use rule-based fallback
    return None


def _is_stale(color_profile: Dict) -> bool:
    """
    Check if color profile is stale (>90 days old).
    Skin tone can change seasonally due to sun exposure, tanning, etc.
    """
    from datetime import datetime, timedelta
    
    analyzed_at = color_profile.get("analyzed_timestamp")
    if not analyzed_at:
        # Old format without timestamp, consider stale
        return True
    
    try:
        analyzed_date = datetime.fromisoformat(analyzed_at)
        age_days = (datetime.now() - analyzed_date).days
        
        # Stale after 90 days (one season)
        return age_days > 90
    except (ValueError, TypeError):
        return True


async def _analyze_with_perfectcorp(selfie_bytes: bytes, user_id: str) -> Dict:
    """
    Run Perfect Corp skin tone analysis and extract color profile.
    This is called ONLY when:
    1. User has no cached color profile
    2. Selfie is available
    3. Data is stale (>90 days old)
    4. User requests force refresh
    
    Cost: 1 API unit (but cached for 90 days, so ~4 units/year per user)
    """
    from datetime import datetime
    
    result = await perfectcorp.call_api(VTOTaskType.SKIN_TONE, selfie_bytes)
    
    # Extract color data from Perfect Corp response
    skin_color = result.get("skin_color", "#000000")
    
    # Determine season from skin tone (simplified color theory)
    season = _determine_season_from_skin_tone(skin_color)
    
    # Build color profile with timestamp
    color_profile = {
        "skin_tone_hex": skin_color,
        "season": season,
        "undertone": _determine_undertone(skin_color),
        "analyzed_at": "perfectcorp",
        "analyzed_timestamp": datetime.now().isoformat(),  # Track when analyzed
    }
    
    # Persist to database
    if supabase:
        supabase.table("body_model").upsert({
            "user_id": user_id,
            "color_palette": color_profile,
        }, on_conflict="user_id").execute()
    
    return color_profile


def _determine_season_from_skin_tone(hex_color: str) -> str:
    """
    Map skin tone to seasonal color palette using color theory.
    Based on undertone and depth.
    """
    # Convert hex to RGB
    hex_color = hex_color.lstrip('#')
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    
    # Calculate undertone (warm vs cool)
    # Warm: more red/yellow, Cool: more blue
    warmth = (r + g) - (b * 2)
    
    # Calculate depth (light vs dark)
    depth = (r + g + b) / 3
    
    # Season mapping (simplified)
    if warmth > 0:  # Warm undertone
        return "autumn" if depth < 150 else "spring"
    else:  # Cool undertone
        return "winter" if depth < 150 else "summer"


def _determine_undertone(hex_color: str) -> str:
    """Determine warm/cool/neutral undertone from skin hex."""
    hex_color = hex_color.lstrip('#')
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    
    warmth = (r + g) - (b * 2)
    
    if warmth > 20:
        return "warm"
    elif warmth < -20:
        return "cool"
    else:
        return "neutral"


def calculate_color_compatibility(item_color: str, user_profile: Optional[Dict]) -> float:
    """
    Calculate color compatibility score (0-100).
    Uses Perfect Corp data if available, otherwise rule-based.
    
    Args:
        item_color: Color name or hex (e.g., "sage green", "#90EE90")
        user_profile: User's color profile from get_user_color_profile()
    
    Returns:
        Score 0-100 (higher = better match)
    """
    if not user_profile:
        # Fallback: rule-based keyword matching
        return _rule_based_color_score(item_color)
    
    # Enhanced: Use Perfect Corp analysis
    user_season = user_profile.get("season", "spring")
    user_undertone = user_profile.get("undertone", "neutral")
    
    # Season palette compatibility
    season_palettes = {
        "spring": ["pastel", "pink", "light", "cream", "sage", "coral", "peach"],
        "summer": ["white", "bright", "blue", "lavender", "rose", "mint"],
        "autumn": ["brown", "orange", "burgundy", "olive", "rust", "terracotta"],
        "winter": ["black", "navy", "grey", "dark", "burgundy", "emerald"],
    }
    
    palette = season_palettes.get(user_season, [])
    color_lower = item_color.lower()
    
    # Check if item color matches user's season
    if any(p in color_lower for p in palette):
        return 90  # Excellent match
    
    # Check undertone compatibility
    warm_colors = ["red", "orange", "yellow", "gold", "brown", "coral", "peach"]
    cool_colors = ["blue", "purple", "pink", "silver", "grey", "lavender"]
    
    if (
        user_undertone == "warm" and any(c in color_lower for c in warm_colors)
    ) or (
        user_undertone == "cool" and any(c in color_lower for c in cool_colors)
    ):
        return 75  # Good match
    
    # Neutral colors work for everyone
    neutral_colors = ["white", "black", "beige", "cream", "grey", "navy"]
    if any(c in color_lower for c in neutral_colors):
        return 60  # Acceptable match
    
    return 40  # Poor match


def _rule_based_color_score(item_color: str) -> float:
    """
    Fallback: Simple rule-based color scoring.
    Used when no Perfect Corp data available.
    """
    color_lower = item_color.lower()
    
    # Neutral colors are safe bets
    neutral_colors = ["white", "black", "beige", "cream", "grey", "navy"]
    if any(c in color_lower for c in neutral_colors):
        return 70
    
    # Seasonal colors (generic)
    seasonal_colors = ["pastel", "bright", "dark", "light"]
    if any(c in color_lower for c in seasonal_colors):
        return 60
    
    return 50  # Default score
