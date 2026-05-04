"""Cost-Per-Wear Calculator Service

Calculates cost-per-wear metrics and wardrobe analytics for closet items.
Follows SOLID principles with single responsibility for CPW calculations.
"""
from typing import Any, Optional
from datetime import datetime, timedelta


class CostPerWearCalculator:
    """Service for calculating cost-per-wear and wardrobe value metrics."""

    @staticmethod
    def calculate_cpw(item: dict[str, Any]) -> Optional[float]:
        """Calculate cost-per-wear for a single item.

        Args:
            item: Closet item with purchase_price and times_worn fields

        Returns:
            Cost-per-wear rounded to 2 decimals, or None if calculation not possible

        Formula: CPW = purchase_price / times_worn
        """
        purchase_price = item.get("purchase_price")
        times_worn = item.get("times_worn", 0)

        # Cannot calculate CPW without price or if never worn
        if purchase_price is None or purchase_price <= 0:
            return None
        if times_worn is None or times_worn <= 0:
            return None

        cpw = purchase_price / times_worn
        return round(cpw, 2)

    @staticmethod
    def calculate_wardrobe_value(items: list[dict[str, Any]]) -> dict[str, float]:
        """Calculate total wardrobe value and statistics.

        Args:
            items: List of closet items

        Returns:
            Dictionary with:
            - total_value: Sum of all purchase prices
            - total_items: Count of items with prices
            - avg_item_price: Average purchase price
        """
        items_with_price = [
            item for item in items
            if item.get("purchase_price") is not None and item.get("purchase_price") > 0
        ]

        if not items_with_price:
            return {
                "total_value": 0.0,
                "total_items": 0,
                "avg_item_price": 0.0,
            }

        total_value = sum(item["purchase_price"] for item in items_with_price)
        total_items = len(items_with_price)
        avg_item_price = total_value / total_items

        return {
            "total_value": round(total_value, 2),
            "total_items": total_items,
            "avg_item_price": round(avg_item_price, 2),
        }

    @staticmethod
    def calculate_savings(
        outfit_logs: list[dict[str, Any]],
        avg_new_item_cost: float = 50.0
    ) -> dict[str, float]:
        """Calculate savings from wearing existing items vs buying new.

        Args:
            outfit_logs: List of outfit logs with outcome='wore' or 'loved'
            avg_new_item_cost: Average cost of buying a new item (default $50)

        Returns:
            Dictionary with:
            - total_wears: Count of times items were worn
            - potential_cost: Cost if bought new items instead
            - actual_cost: Actual cost-per-wear of owned items
            - savings: Difference between potential and actual cost
        """
        # Filter for worn/loved outfits only
        worn_outfits = [
            log for log in outfit_logs
            if log.get("outcome") in ("wore", "loved")
        ]

        if not worn_outfits:
            return {
                "total_wears": 0,
                "potential_cost": 0.0,
                "actual_cost": 0.0,
                "savings": 0.0,
            }

        total_wears = len(worn_outfits)
        potential_cost = total_wears * avg_new_item_cost

        # Calculate actual cost (sum of CPW for all items in worn outfits)
        actual_cost = 0.0
        for log in worn_outfits:
            items = log.get("items", [])
            for item in items:
                cpw = CostPerWearCalculator.calculate_cpw(item)
                if cpw is not None:
                    actual_cost += cpw

        savings = potential_cost - actual_cost

        return {
            "total_wears": total_wears,
            "potential_cost": round(potential_cost, 2),
            "actual_cost": round(actual_cost, 2),
            "savings": round(savings, 2),
        }

    @staticmethod
    def get_high_cpw_items(
        items: list[dict[str, Any]],
        min_wears: int = 3,
        cpw_threshold: float = 50.0
    ) -> list[dict[str, Any]]:
        """Identify items with high cost-per-wear.

        Args:
            items: List of closet items
            min_wears: Minimum times worn to be considered (default 3)
            cpw_threshold: CPW threshold to flag as high (default $50)

        Returns:
            List of items with high CPW, sorted by CPW descending
        """
        high_cpw_items = []

        for item in items:
            times_worn = item.get("times_worn", 0)
            cpw = CostPerWearCalculator.calculate_cpw(item)

            # Flag items worn at least min_wears times with CPW > threshold
            if cpw is not None and times_worn >= min_wears and cpw > cpw_threshold:
                item_with_cpw = {**item, "cpw": cpw}
                high_cpw_items.append(item_with_cpw)

        # Sort by CPW descending (highest first)
        high_cpw_items.sort(key=lambda x: x["cpw"], reverse=True)

        return high_cpw_items

    @staticmethod
    def get_best_value_items(
        items: list[dict[str, Any]],
        limit: int = 10
    ) -> list[dict[str, Any]]:
        """Get items with the best value (lowest CPW).

        Args:
            items: List of closet items
            limit: Maximum number of items to return (default 10)

        Returns:
            List of items with lowest CPW, sorted by CPW ascending
        """
        items_with_cpw = []

        for item in items:
            cpw = CostPerWearCalculator.calculate_cpw(item)
            if cpw is not None:
                item_with_cpw = {**item, "cpw": cpw}
                items_with_cpw.append(item_with_cpw)

        # Sort by CPW ascending (lowest first)
        items_with_cpw.sort(key=lambda x: x["cpw"])

        return items_with_cpw[:limit]

    @staticmethod
    def get_wear_statistics(
        items: list[dict[str, Any]],
        days: int = 30
    ) -> dict[str, Any]:
        """Calculate wear statistics for items.

        Args:
            items: List of closet items
            days: Number of days to look back (default 30)

        Returns:
            Dictionary with:
            - total_items: Total number of items
            - worn_recently: Items worn in last N days
            - never_worn: Items never worn
            - most_worn: Top 5 most worn items
            - avg_times_worn: Average times worn across all items
        """
        cutoff_date = datetime.now() - timedelta(days=days)

        worn_recently = []
        never_worn = []
        items_with_wears = []

        for item in items:
            times_worn = item.get("times_worn", 0)
            last_worn = item.get("last_worn")

            # Track never worn items
            if times_worn == 0:
                never_worn.append(item)
            else:
                items_with_wears.append(item)

            # Track recently worn items
            if last_worn:
                try:
                    last_worn_date = datetime.fromisoformat(last_worn.replace("Z", "+00:00"))
                    if last_worn_date >= cutoff_date:
                        worn_recently.append(item)
                except (ValueError, AttributeError):
                    pass

        # Get most worn items (top 5)
        most_worn = sorted(
            items,
            key=lambda x: x.get("times_worn", 0),
            reverse=True
        )[:5]

        # Calculate average times worn
        total_wears = sum(item.get("times_worn", 0) for item in items)
        avg_times_worn = total_wears / len(items) if items else 0.0

        return {
            "total_items": len(items),
            "worn_recently": len(worn_recently),
            "worn_recently_percentage": round(len(worn_recently) / len(items) * 100, 1) if items else 0.0,
            "never_worn": len(never_worn),
            "never_worn_percentage": round(len(never_worn) / len(items) * 100, 1) if items else 0.0,
            "most_worn": most_worn,
            "avg_times_worn": round(avg_times_worn, 1),
        }
