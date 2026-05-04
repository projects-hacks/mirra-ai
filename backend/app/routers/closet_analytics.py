"""Closet Analytics API Router

Provides analytics endpoints for closet items including:
- Cost-per-wear calculations
- Wardrobe value statistics
- Wear patterns and trends
- High CPW item identification
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Any

from app.services.supabase_client import supabase
from app.services.cost_per_wear_calculator import CostPerWearCalculator

router = APIRouter(prefix="/api/closet", tags=["closet-analytics"])


@router.get("/analytics")
async def get_closet_analytics(
    user_id: str = Query(..., description="User ID")
) -> dict[str, Any]:
    """Get comprehensive closet analytics.

    Returns:
        Dictionary with:
        - total_items: Total number of items
        - total_value: Total wardrobe value
        - avg_item_price: Average item price
        - avg_cpw: Average cost-per-wear
        - items_by_category: Count of items per category
        - worn_last_30_days: Count of items worn in last 30 days
        - worn_last_30_days_percentage: Percentage worn recently
        - never_worn: Count of never worn items
        - never_worn_percentage: Percentage never worn
        - high_cpw_items: Items with high CPW (>$50, worn 3+ times)
        - best_value_items: Items with lowest CPW (top 10)
        - most_worn_items: Top 5 most worn items
        - total_savings: Savings from wearing vs buying new
    """
    # Fetch all closet items for user
    response = supabase.table("closet_items").select("*").eq("user_id", user_id).execute()

    if not response.data:
        return {
            "total_items": 0,
            "total_value": 0.0,
            "avg_item_price": 0.0,
            "avg_cpw": 0.0,
            "items_by_category": {},
            "worn_last_30_days": 0,
            "worn_last_30_days_percentage": 0.0,
            "never_worn": 0,
            "never_worn_percentage": 0.0,
            "high_cpw_items": [],
            "best_value_items": [],
            "most_worn_items": [],
            "total_savings": 0.0,
        }

    items = response.data

    # Calculate wardrobe value
    wardrobe_value = CostPerWearCalculator.calculate_wardrobe_value(items)

    # Calculate average CPW
    cpw_values = []
    for item in items:
        cpw = CostPerWearCalculator.calculate_cpw(item)
        if cpw is not None:
            cpw_values.append(cpw)

    avg_cpw = sum(cpw_values) / len(cpw_values) if cpw_values else 0.0

    # Count items by category
    items_by_category: dict[str, int] = {}
    for item in items:
        category = item.get("category", "Unknown")
        items_by_category[category] = items_by_category.get(category, 0) + 1

    # Get wear statistics
    wear_stats = CostPerWearCalculator.get_wear_statistics(items, days=30)

    # Get high CPW items
    high_cpw_items = CostPerWearCalculator.get_high_cpw_items(
        items,
        min_wears=3,
        cpw_threshold=50.0
    )

    # Get best value items
    best_value_items = CostPerWearCalculator.get_best_value_items(items, limit=10)

    # Calculate savings (fetch outfit logs)
    outfit_logs_response = supabase.table("outfit_logs").select("*").eq("user_id", user_id).execute()
    outfit_logs = outfit_logs_response.data if outfit_logs_response.data else []

    savings_data = CostPerWearCalculator.calculate_savings(outfit_logs, avg_new_item_cost=50.0)

    return {
        "total_items": len(items),
        "total_value": wardrobe_value["total_value"],
        "avg_item_price": wardrobe_value["avg_item_price"],
        "avg_cpw": round(avg_cpw, 2),
        "items_by_category": items_by_category,
        "worn_last_30_days": wear_stats["worn_recently"],
        "worn_last_30_days_percentage": wear_stats["worn_recently_percentage"],
        "never_worn": wear_stats["never_worn"],
        "never_worn_percentage": wear_stats["never_worn_percentage"],
        "high_cpw_items": high_cpw_items[:10],  # Limit to top 10
        "best_value_items": best_value_items,
        "most_worn_items": wear_stats["most_worn"],
        "total_savings": savings_data["savings"],
        "savings_details": savings_data,
    }
