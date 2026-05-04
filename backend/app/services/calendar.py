"""Google Calendar service with Redis cache."""
import json
from datetime import datetime, timedelta, timezone

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import settings
from app.core import cache
from app.core.constants import CachePrefix
from app.services.supabase_client import supabase


async def get_todays_events(user_id: str | None = None) -> dict:
    """Get today's events for a user. Cached for 5 minutes in Redis.
    
    Args:
        user_id: User ID to fetch calendar for. If None, uses global credentials.
    
    Raises:
        ValueError: If Google Calendar credentials are not configured
    """
    cache_key = f"{CachePrefix.CALENDAR}:{user_id or 'global'}:today"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Try to get user-specific credentials first
    creds_json = None
    if user_id:
        try:
            prefs_response = supabase.from_("user_preferences").select("google_calendar_token").eq("user_id", user_id).single().execute()
            if prefs_response.data and prefs_response.data.get("google_calendar_token"):
                creds_json = prefs_response.data["google_calendar_token"]
        except Exception:
            pass  # Fall back to global credentials
    
    # Fall back to global credentials if no user-specific ones
    if not creds_json and settings.GOOGLE_CALENDAR_CREDENTIALS:
        creds_json = settings.GOOGLE_CALENDAR_CREDENTIALS
    
    if not creds_json:
        raise ValueError(
            "Google Calendar credentials not configured. "
            "Connect your calendar in profile settings."
        )

    creds = Credentials.from_authorized_user_info(json.loads(creds_json))
    service = build("calendar", "v3", credentials=creds)

    now = datetime.now(timezone.utc)
    events = service.events().list(
        calendarId="primary",
        timeMin=now.isoformat() + "Z",
        timeMax=(now + timedelta(days=1)).isoformat() + "Z",
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    result = {
        "events": [
            {
                "title": e["summary"],
                "start": e["start"].get("dateTime", e["start"].get("date")),
                "end": e["end"].get("dateTime", e["end"].get("date")),
                "location": e.get("location"),
            }
            for e in events.get("items", [])
        ]
    }

    await cache.set(cache_key, result, cache.TTL.CALENDAR)
    return result
