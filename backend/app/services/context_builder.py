"""
Context Builder
Assembles MatchContext from calendar, weather, user input, and color profile

HYBRID APPROACH: Fetches Perfect Corp color analysis if available (cached)
"""

from datetime import datetime
from app.services.matching_engine import MatchContext
from app.core.constants import Occasion, Season
from app.services import calendar, weather
from app.services.color_analyzer import get_user_color_profile


async def build_match_context(
    occasion: str | None = None,
    location: str = "San Francisco",
    user_preferences: dict | None = None,
    user_id: str | None = None,
    selfie_bytes: bytes | None = None,
) -> MatchContext:
    """
    Build a MatchContext from available data sources
    
    HYBRID COLOR MATCHING:
    - Fetches Perfect Corp color profile if available (zero latency if cached)
    - Passes to matching engine for enhanced color scoring
    - Falls back to rule-based if unavailable
    
    Args:
        occasion: User-specified occasion (optional)
        location: Location for weather lookup
        user_preferences: User style preferences
        user_id: User ID for color profile lookup
        selfie_bytes: Selfie for color analysis (only if profile is stale/missing)
        
    Returns:
        MatchContext with all relevant data including color profile
    """
    # Get weather
    weather_data = await weather.get_weather(location)
    temp = weather_data.get('temperature', 70)
    condition = weather_data.get('condition', 'clear').lower()
    
    # Get calendar events if no occasion specified
    if not occasion:
        try:
            calendar_data = await calendar.get_todays_events()
            events = calendar_data.get('events', [])
            
            if events:
                # Use first event as occasion
                first_event = events[0]
                occasion = _infer_occasion_from_event(first_event)
            else:
                occasion = 'casual'
        except ValueError as e:
            # Calendar credentials not configured, default to casual
            print(f"Calendar not available: {e}")
            occasion = 'casual'
    
    # Determine formality
    formality = _determine_formality(occasion)
    
    # Determine season
    season = _determine_season()
    
    # Parse occasion enum
    try:
        occasion_enum = Occasion(occasion.lower())
    except ValueError:
        occasion_enum = Occasion.CASUAL
    
    # HYBRID: Fetch color profile (zero latency if cached, auto-refreshes if stale)
    color_profile = None
    if user_id:
        try:
            color_profile = await get_user_color_profile(
                user_id=user_id,
                selfie_bytes=selfie_bytes,  # Only used if profile is stale/missing
                force_refresh=False
            )
            if color_profile:
                print(f"Using Perfect Corp color profile for user {user_id}")
            else:
                print(f"No color profile for user {user_id}, using rule-based matching")
        except Exception as e:
            print(f"Failed to fetch color profile: {e}. Using rule-based fallback.")
    
    return MatchContext(
        occasion=occasion_enum,
        weather_temp=temp,
        weather_condition=condition,
        formality=formality,
        season=season,
        user_preferences=user_preferences or {},
        color_profile=color_profile,  # HYBRID: Perfect Corp or None
    )


def _infer_occasion_from_event(event: dict) -> str:
    """Infer occasion from calendar event"""
    summary = event.get('summary', '').lower()
    
    # Keyword matching
    if any(kw in summary for kw in ['wedding', 'ceremony', 'gala']):
        return 'wedding'
    elif any(kw in summary for kw in ['meeting', 'interview', 'presentation']):
        return 'meeting'
    elif any(kw in summary for kw in ['date', 'dinner', 'romantic']):
        return 'date'
    elif any(kw in summary for kw in ['brunch', 'lunch', 'breakfast']):
        return 'brunch'
    elif any(kw in summary for kw in ['office', 'work', 'standup']):
        return 'office'
    elif any(kw in summary for kw in ['concert', 'show', 'performance']):
        return 'concert'
    else:
        return 'casual'


def _determine_formality(occasion: str) -> str:
    """Determine formality level from occasion"""
    formal_occasions = ['wedding', 'formal', 'gala', 'ceremony']
    business_occasions = ['meeting', 'office', 'interview', 'presentation']
    
    occasion_lower = occasion.lower()
    
    if occasion_lower in formal_occasions:
        return 'formal'
    elif occasion_lower in business_occasions:
        return 'business'
    else:
        return 'casual'


def _determine_season() -> Season:
    """Determine current season from date"""
    month = datetime.now().month
    
    if month in [3, 4, 5]:
        return Season.SPRING
    elif month in [6, 7, 8]:
        return Season.SUMMER
    elif month in [9, 10, 11]:
        return Season.FALL
    else:
        return Season.WINTER
