"""Weather service — Open-Meteo with Redis cache."""
import httpx

from app.core import cache
from app.core.constants import CachePrefix


async def get_weather(location: str = "San Francisco") -> dict:
    """Get current weather. Cached for 30 minutes in Redis."""
    cache_key = f"{CachePrefix.WEATHER}:{location.lower()}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1"
    async with httpx.AsyncClient() as client:
        geo = await client.get(geo_url)
        results = geo.json().get("results", [])
        if not results:
            return {"error": f"Location not found: {location}"}

        lat, lon = results[0]["latitude"], results[0]["longitude"]
        wx = await client.get(
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m"
            "&temperature_unit=fahrenheit"
        )
        current = wx.json()["current"]
        result = {
            "location": location,
            "temp_f": current["temperature_2m"],
            "humidity": current["relative_humidity_2m"],
            "wind_mph": current["wind_speed_10m"],
            "code": current["weather_code"],
        }

    await cache.set(cache_key, result, cache.TTL.WEATHER)
    return result
