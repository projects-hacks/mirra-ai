"""Context router — weather data for personalization."""
from fastapi import APIRouter
from app.services import weather

router = APIRouter()


@router.get("/weather")
async def get_weather(location: str = "San Francisco"):
    return await weather.get_weather(location)

