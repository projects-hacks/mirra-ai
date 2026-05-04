"""
Style Profile Computation Service

Analyzes user's outfit history to compute style profiles and detect style drift.
Profiles are computed weekly and include color preferences, category distribution,
brand preferences, formality levels, and outfit success rates.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import Counter

from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)


class StyleProfileComputer:
    """Service for computing and analyzing user style profiles."""
    
    def __init__(self):
        self.profile_period_days = 7  # Weekly profiles
        self.drift_formality_threshold = 0.15
        self.drift_color_threshold = 3  # Minimum colors in common
        self.drift_category_threshold = 0.25  # 25% change
    
    async def compute_weekly_profile(
        self,
        user_id: str,
        week_start: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Compute style profile for a user for a given week.
        
        Args:
            user_id: The user's ID
            week_start: Start date of the week (defaults to current week)
            
        Returns:
            Dictionary containing style profile data
        """
        try:
            # Default to current week if not specified
            if week_start is None:
                week_start = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
            
            week_end = week_start + timedelta(days=7)
            
            # Fetch outfit logs for the period
            result = supabase.table("outfit_logs").select(
                "id, items, occasion, outcome, rating, created_at"
            ).eq(
                "user_id", user_id
            ).gte(
                "created_at", week_start.isoformat()
            ).lt(
                "created_at", week_end.isoformat()
            ).execute()
            
            outfit_logs = result.data
            
            if not outfit_logs:
                logger.info(f"No outfit logs found for user {user_id} in week {week_start}")
                return self._empty_profile(user_id, week_start)
            
            # Fetch all items worn during this period
            item_ids = set()
            for log in outfit_logs:
                for item in log.get("items", []):
                    if isinstance(item, dict) and "id" in item:
                        item_ids.add(item["id"])
            
            items_data = []
            if item_ids:
                items_result = supabase.table("closet_items").select(
                    "id, category, color, brand, price, formality"
                ).in_("id", list(item_ids)).execute()
                items_data = items_result.data
            
            # Create item lookup
            items_by_id = {item["id"]: item for item in items_data}
            
            # Compute profile metrics
            profile = self._compute_profile_metrics(
                user_id=user_id,
                week_start=week_start,
                outfit_logs=outfit_logs,
                items_by_id=items_by_id
            )
            
            # Save profile to database
            self._save_profile(profile)
            
            logger.info(f"Computed style profile for user {user_id}, week {week_start}")
            return profile
            
        except Exception as e:
            logger.error(f"Error computing style profile: {e}")
            return self._empty_profile(user_id, week_start)
    
    def _compute_profile_metrics(
        self,
        user_id: str,
        week_start: datetime,
        outfit_logs: List[Dict],
        items_by_id: Dict[str, Dict]
    ) -> Dict[str, Any]:
        """Compute all profile metrics from outfit logs and items."""
        
        # Collect data
        colors = []
        categories = []
        brands = []
        formality_values = []
        prices = []
        
        for log in outfit_logs:
            for item_ref in log.get("items", []):
                if isinstance(item_ref, dict) and "id" in item_ref:
                    item = items_by_id.get(item_ref["id"])
                    if item:
                        if item.get("color"):
                            colors.append(item["color"])
                        if item.get("category"):
                            categories.append(item["category"])
                        if item.get("brand"):
                            brands.append(item["brand"])
                        if item.get("formality") is not None:
                            formality_values.append(item["formality"])
                        if item.get("price"):
                            prices.append(item["price"])
        
        # Compute top items
        color_counter = Counter(colors)
        category_counter = Counter(categories)
        brand_counter = Counter(brands)
        
        top_colors = [color for color, _ in color_counter.most_common(5)]
        top_categories = dict(category_counter.most_common(5))
        top_brands = [brand for brand, _ in brand_counter.most_common(5)]
        
        # Compute averages
        formality_avg = sum(formality_values) / len(formality_values) if formality_values else 0.5
        
        # Compute outfit success rate (wore or loved outcomes)
        successful_outcomes = sum(
            1 for log in outfit_logs 
            if log.get("outcome") in ["wore", "loved"]
        )
        outfit_success_rate = successful_outcomes / len(outfit_logs) if outfit_logs else 0.0
        
        # Compute average cost per wear
        total_wears = len(outfit_logs)
        total_cost = sum(prices)
        avg_cost_per_wear = total_cost / total_wears if total_wears > 0 else 0.0
        
        return {
            "user_id": user_id,
            "period_start": week_start.isoformat(),
            "period_end": (week_start + timedelta(days=7)).isoformat(),
            "top_colors": top_colors,
            "top_categories": top_categories,
            "top_brands": top_brands,
            "formality_avg": round(formality_avg, 2),
            "outfit_success_rate": round(outfit_success_rate, 2),
            "avg_cost_per_wear": round(avg_cost_per_wear, 2),
            "total_outfits": len(outfit_logs),
            "created_at": datetime.utcnow().isoformat()
        }
    
    def _empty_profile(self, user_id: str, week_start: datetime) -> Dict[str, Any]:
        """Return an empty profile when no data is available."""
        return {
            "user_id": user_id,
            "period_start": week_start.isoformat(),
            "period_end": (week_start + timedelta(days=7)).isoformat(),
            "top_colors": [],
            "top_categories": {},
            "top_brands": [],
            "formality_avg": 0.5,
            "outfit_success_rate": 0.0,
            "avg_cost_per_wear": 0.0,
            "total_outfits": 0,
            "created_at": datetime.utcnow().isoformat()
        }
    
    def _save_profile(self, profile: Dict[str, Any]) -> bool:
        """Save profile to database."""
        try:
            supabase.table("style_profiles").insert(profile).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving style profile: {e}")
            return False
    
    async def detect_style_drift(
        self,
        user_id: str,
        current_period: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Detect style drift by comparing current profile to previous period.
        
        Args:
            user_id: The user's ID
            current_period: Start date of current period (defaults to current week)
            
        Returns:
            Dictionary containing drift insights
        """
        try:
            if current_period is None:
                current_period = datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())
            
            previous_period = current_period - timedelta(days=7)
            
            # Fetch current and previous profiles
            current_result = supabase.table("style_profiles").select("*").eq(
                "user_id", user_id
            ).eq(
                "period_start", current_period.isoformat()
            ).execute()
            
            previous_result = supabase.table("style_profiles").select("*").eq(
                "user_id", user_id
            ).eq(
                "period_start", previous_period.isoformat()
            ).execute()
            
            if not current_result.data or not previous_result.data:
                return {"drift_detected": False, "insights": []}
            
            current = current_result.data[0]
            previous = previous_result.data[0]
            
            insights = []
            drift_detected = False
            
            # Detect formality drift
            formality_change = abs(current["formality_avg"] - previous["formality_avg"])
            if formality_change > self.drift_formality_threshold:
                drift_detected = True
                direction = "more formal" if current["formality_avg"] > previous["formality_avg"] else "more casual"
                insights.append({
                    "type": "formality_drift",
                    "message": f"Your style has become {direction} this week",
                    "change": round(formality_change, 2)
                })
            
            # Detect color palette shift
            current_colors = set(current.get("top_colors", []))
            previous_colors = set(previous.get("top_colors", []))
            colors_in_common = len(current_colors & previous_colors)
            
            if colors_in_common < self.drift_color_threshold:
                drift_detected = True
                new_colors = current_colors - previous_colors
                insights.append({
                    "type": "color_shift",
                    "message": f"You're exploring new colors: {', '.join(new_colors)}",
                    "new_colors": list(new_colors)
                })
            
            # Detect category distribution shift
            current_categories = current.get("top_categories", {})
            previous_categories = previous.get("top_categories", {})
            
            for category, count in current_categories.items():
                prev_count = previous_categories.get(category, 0)
                if prev_count > 0:
                    change_pct = abs(count - prev_count) / prev_count
                    if change_pct > self.drift_category_threshold:
                        drift_detected = True
                        direction = "more" if count > prev_count else "less"
                        insights.append({
                            "type": "category_shift",
                            "message": f"You're wearing {direction} {category} items",
                            "category": category,
                            "change_percent": round(change_pct * 100, 1)
                        })
            
            # Save drift insights
            if drift_detected:
                drift_record = {
                    "user_id": user_id,
                    "period_start": current_period.isoformat(),
                    "drift_detected": True,
                    "insights": insights,
                    "created_at": datetime.utcnow().isoformat()
                }
                supabase.table("style_drift_insights").insert(drift_record).execute()
            
            return {
                "drift_detected": drift_detected,
                "insights": insights,
                "current_period": current_period.isoformat(),
                "previous_period": previous_period.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error detecting style drift: {e}")
            return {"drift_detected": False, "insights": [], "error": str(e)}


# Singleton instance
_profile_computer = None


def get_profile_computer() -> StyleProfileComputer:
    """Get the singleton style profile computer instance."""
    global _profile_computer
    if _profile_computer is None:
        _profile_computer = StyleProfileComputer()
    return _profile_computer
