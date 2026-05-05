"""Serper Google Shopping API integration."""

import httpx
import re
from typing import Dict
from app.core.config import settings


async def search(query: str, max_price: float | None = None) -> Dict:
    """
    Search Google Shopping via Serper API
    
    Args:
        query: Search query (e.g., "black midi dress")
        max_price: Maximum price filter (optional)
        
    Returns:
        Dictionary with products list and metadata
    """
    try:
        return await _search_serper(query, max_price)
    except Exception as e:
        return {
            "products": [],
            "query": query,
            "source": "serper",
            "count": 0,
            "error": str(e),
        }


async def _search_serper(query: str, max_price: float | None = None) -> Dict:
    """Search via Serper API"""
    if not settings.SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY not configured")
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            "https://google.serper.dev/shopping",
            headers={
                "X-API-KEY": settings.SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "q": query,
                "num": 10,
                "gl": "us",
            },
        )
        response.raise_for_status()
        data = response.json()
        
        # Extract products
        results = data.get("shopping", [])
        
        # Filter by price if specified
        if max_price:
            results = [
                r for r in results
                if _parse_price(r.get("price", "")) <= max_price
            ]
        
        # Format results
        products = [
            {
                "title": r.get("title", ""),
                "price": r.get("price", ""),
                "source": r.get("source", ""),
                "link": r.get("link", ""),
                "imageUrl": r.get("imageUrl", ""),
                "rating": r.get("rating"),
            }
            for r in results[:5]  # Top 5 results
        ]
        
        return {
            "products": products,
            "query": query,
            "source": "serper",
            "count": len(products),
        }


def _parse_price(price_str: str) -> float:
    """
    Extract numeric price from string
    Examples: "$127.99" → 127.99, "£50" → 50.0
    """
    if not price_str:
        return 0.0
    
    # Remove currency symbols and commas
    cleaned = re.sub(r'[^\d.]', '', price_str)
    
    try:
        return float(cleaned)
    except ValueError:
        return 0.0
