"""Serper — Google Shopping search."""
import httpx
from app.core.config import settings


async def search(query: str, max_price: float | None = None) -> dict:
    """Search Google Shopping via Serper API."""
    if not settings.SERPER_API_KEY:
        return _mock_results(query)

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://google.serper.dev/shopping",
            json={"q": query, "num": 5},
            headers={"X-API-KEY": settings.SERPER_API_KEY},
        )
        items = res.json().get("shopping", [])
        if max_price:
            items = [i for i in items if _parse_price(i.get("price", "")) <= max_price]
        return {"results": items[:5]}


def _parse_price(price_str: str) -> float:
    try:
        return float(price_str.replace("$", "").replace(",", ""))
    except (ValueError, AttributeError):
        return float("inf")


def _mock_results(query: str) -> dict:
    return {
        "results": [
            {"title": f"Mock {query} Item 1", "price": "$45.00", "link": "#", "imageUrl": ""},
            {"title": f"Mock {query} Item 2", "price": "$62.00", "link": "#", "imageUrl": ""},
        ]
    }
