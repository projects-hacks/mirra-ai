"""
Serper Google Shopping API Integration
With fallback to curated catalog
"""

import httpx
import re
from typing import List, Dict
from app.core.config import settings


async def search(query: str, max_price: float | None = None) -> Dict:
    """
    Search Google Shopping via Serper API
    Falls back to curated catalog on failure
    
    Args:
        query: Search query (e.g., "black midi dress")
        max_price: Maximum price filter (optional)
        
    Returns:
        Dictionary with products list and metadata
    """
    try:
        return await _search_serper(query, max_price)
    except Exception as e:
        print(f"Serper API failed: {e}. Falling back to curated catalog.")
        return _search_curated_catalog(query, max_price)


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


def _search_curated_catalog(query: str, max_price: float | None = None) -> Dict:
    """
    Fallback: search curated catalog
    Uses keyword matching on product titles
    """
    from app.data.curated_catalog import CURATED_CATALOG
    
    query_keywords = set(query.lower().split())
    
    # Filter by keywords
    filtered = [
        p for p in CURATED_CATALOG
        if any(kw in p['title'].lower() for kw in query_keywords)
    ]
    
    # Filter by price
    if max_price:
        filtered = [
            p for p in filtered
            if _parse_price(p.get('price', '')) <= max_price
        ]
    
    return {
        "products": filtered[:5],
        "query": query,
        "source": "catalog",
        "count": len(filtered[:5]),
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
