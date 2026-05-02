"""Google Calendar service with Redis cache."""
import json
from datetime import datetime, timedelta

from app.core.config import settings
from app.core import cache


async def get_todays_events() -> dict:
    """Get today's events. Cached for 5 minutes in Redis."""
    cache_key = "calendar:today"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    if not settings.GOOGLE_CALENDAR_CREDENTIALS:
        return _mock_events()

    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials.from_authorized_user_info(json.loads(settings.GOOGLE_CALENDAR_CREDENTIALS))
    service = build("calendar", "v3", credentials=creds)

    now = datetime.utcnow()
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


def _mock_events() -> dict:
    return {
        "events": [
            {"title": "Board Meeting", "start": "14:00", "end": "15:30", "location": "Office - Room 4B"},
            {"title": "Date Night", "start": "20:00", "end": "22:00", "location": "Nobu Downtown"},
        ]
    }
