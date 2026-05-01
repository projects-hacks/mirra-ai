"""Context router — weather, calendar, closet queries."""
from fastapi import APIRouter
from app.services import weather, calendar

router = APIRouter()


@router.get("/weather")
async def get_weather(location: str = "San Francisco"):
    return await weather.get_weather(location)


@router.get("/calendar")
async def get_calendar():
    return await calendar.get_todays_events()
