"""
Closet Recommendation Engine

Provides personalized item and outfit recommendations based on:
- Weather conditions
- Occasion/event type
- Recent wear history
- User preferences and style profile
- Color coordination and formality matching
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from collections import Counter

from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)


class ClosetRecommendationEngine:
    """Service for generating personalized closet recommendations."""
    
    def __init__(self):
        self.recent_wear_days = 7  # Don't recommend items worn in last 7 days
        self.formality_tolerance = 0.2  # Formality matching tolerance
        self.color_harmony_rules = {
            # Complementary and harmonious color combinations
            "black": ["white", "gray", "red", "blue", "beige"],
            "white": ["black", "gray", "blue", "red", "navy"],
            "gray": ["black", "white", "blue", "pink", "yellow"],
            "blue": ["white", "gray", "beige", "brown", "navy"],
            "red": ["black", "white", "gray", "navy", "beige"],
            "navy": ["white", "beige", "gray", "red", "brown"],
            "beige": ["white", "brown", "navy", "blue", "black"],
            "brown": ["beige", "white", "cream", "navy", "green"],
            "green": ["white", "beige", "brown", "navy", "gray"],
            "pink": ["white", "gray", "navy", "black", "beige"],
            "yellow": ["white", "gray", "navy", "blue", "black"],
        }
    
    async def recommend_items_for_event(
        self,
        user_id: str,
        event: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Recommend items for a specific event.
        
        Args:
            user_id: The user's ID
            event: Event details (occasion, weather, formality, etc.)
            
        Returns:
            List of recommended items with scores
        """
        try:
            occasion = event.get("occasion", "casual")
            weather = event.get("weather", {})
            target_formality = event.get("formality", 0.5)
            
            # Fetch user's closet items
            items_result = supabase.table("closet_items").select("*").eq(
                "user_id", user_id
            ).eq(
                "is_archived", False
            ).execute()
            
            items = items_result.data
            
            if not items:
                return []
            
            # Get recent wear history
            recent_date = (datetime.utcnow() - timedelta(days=self.recent_wear_days)).isoformat()
            recent_logs = supabase.table("outfit_logs").select(
                "items"
            ).eq(
                "user_id", user_id
            ).gte(
                "created_at", recent_date
            ).execute()
            
            # Get items to avoid (recently worn or skipped)
            items_to_avoid = set()
            for log in recent_logs.data:
                for item_ref in log.get("items", []):
                    if isinstance(item_ref, dict) and "id" in item_ref:
                        items_to_avoid.add(item_ref["id"])
            
            # Get items marked as skipped/returned for similar occasions
            skipped_result = supabase.table("outfit_logs").select(
                "items"
            ).eq(
                "user_id", user_id
            ).eq(
                "occasion", occasion
            ).in_(
                "outcome", ["skipped", "returned"]
            ).execute()
            
            for log in skipped_result.data:
                for item_ref in log.get("items", []):
                    if isinstance(item_ref, dict) and "id" in item_ref:
                        items_to_avoid.add(item_ref["id"])
            
            # Score and filter items
            recommendations = []
            for item in items:
                if item["id"] in items_to_avoid:
                    continue
                
                score = self._score_item_for_event(item, event, target_formality)
                
                if score > 0:
                    recommendations.append({
                        **item,
                        "recommendation_score": score,
                        "reason": self._generate_recommendation_reason(item, event, score)
                    })
            
            # Sort by score and return top recommendations
            recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
            return recommendations[:20]
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []
    
    def _score_item_for_event(
        self,
        item: Dict[str, Any],
        event: Dict[str, Any],
        target_formality: float
    ) -> float:
        """Score an item's suitability for an event."""
        score = 0.0
        
        # Occasion match
        item_occasions = item.get("occasions", [])
        event_occasion = event.get("occasion", "casual")
        if event_occasion in item_occasions:
            score += 30
        
        # Formality match
        item_formality = item.get("formality", 0.5)
        formality_diff = abs(item_formality - target_formality)
        if formality_diff <= self.formality_tolerance:
            score += 25 * (1 - formality_diff / self.formality_tolerance)
        
        # Season match
        item_seasons = item.get("seasons", [])
        event_season = event.get("season")
        if event_season and event_season in item_seasons:
            score += 20
        
        # Weather appropriateness
        weather = event.get("weather", {})
        temp = weather.get("temperature")
        if temp:
            if temp < 50 and item.get("category") in ["jacket", "coat", "sweater"]:
                score += 15
            elif temp > 75 and item.get("category") in ["t-shirt", "shorts", "dress"]:
                score += 15
        
        # Favorite items get bonus
        if item.get("is_favorite"):
            score += 10
        
        # Low CPW items get bonus
        if item.get("price") and item.get("times_worn", 0) > 0:
            cpw = item["price"] / item["times_worn"]
            if cpw < 20:
                score += 10
        
        return score
    
    def _generate_recommendation_reason(
        self,
        item: Dict[str, Any],
        event: Dict[str, Any],
        score: float
    ) -> str:
        """Generate a human-readable reason for the recommendation."""
        reasons = []
        
        if event.get("occasion") in item.get("occasions", []):
            reasons.append(f"perfect for {event['occasion']}")
        
        if item.get("is_favorite"):
            reasons.append("one of your favorites")
        
        if item.get("times_worn", 0) == 0:
            reasons.append("never worn before")
        
        if score > 50:
            return f"Great match! {', '.join(reasons[:2])}"
        elif score > 30:
            return f"Good choice: {', '.join(reasons[:2])}"
        else:
            return "Suitable option"
    
    async def recommend_complete_outfit(
        self,
        user_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Recommend a complete outfit with coordinated items.
        
        Args:
            user_id: The user's ID
            context: Context (occasion, weather, formality, etc.)
            
        Returns:
            Complete outfit with top, bottom, shoes, and accessories
        """
        try:
            # Get item recommendations
            all_recommendations = await self.recommend_items_for_event(user_id, context)
            
            if not all_recommendations:
                return {"items": [], "total_score": 0}
            
            # Categorize items
            items_by_category = {}
            for item in all_recommendations:
                category = item.get("category", "").lower()
                if category not in items_by_category:
                    items_by_category[category] = []
                items_by_category[category].append(item)
            
            # Build outfit
            outfit = {
                "top": None,
                "bottom": None,
                "shoes": None,
                "accessories": []
            }
            
            # Select top
            top_categories = ["shirt", "blouse", "t-shirt", "sweater", "jacket", "coat"]
            for cat in top_categories:
                if cat in items_by_category and items_by_category[cat]:
                    outfit["top"] = items_by_category[cat][0]
                    break
            
            # Select bottom
            bottom_categories = ["pants", "jeans", "skirt", "shorts"]
            for cat in bottom_categories:
                if cat in items_by_category and items_by_category[cat]:
                    # Check color coordination with top
                    if outfit["top"]:
                        for bottom in items_by_category[cat]:
                            if self._colors_coordinate(
                                outfit["top"].get("color", ""),
                                bottom.get("color", "")
                            ):
                                outfit["bottom"] = bottom
                                break
                    if not outfit["bottom"] and items_by_category[cat]:
                        outfit["bottom"] = items_by_category[cat][0]
                    break
            
            # Select shoes
            shoe_categories = ["shoes", "sneakers", "boots", "sandals"]
            for cat in shoe_categories:
                if cat in items_by_category and items_by_category[cat]:
                    outfit["shoes"] = items_by_category[cat][0]
                    break
            
            # Select accessories (up to 2)
            accessory_categories = ["bag", "hat", "scarf", "jewelry", "watch"]
            for cat in accessory_categories:
                if cat in items_by_category and items_by_category[cat]:
                    outfit["accessories"].append(items_by_category[cat][0])
                    if len(outfit["accessories"]) >= 2:
                        break
            
            # Calculate total score
            total_score = 0
            outfit_items = []
            for key, value in outfit.items():
                if key == "accessories":
                    for acc in value:
                        outfit_items.append(acc)
                        total_score += acc.get("recommendation_score", 0)
                elif value:
                    outfit_items.append(value)
                    total_score += value.get("recommendation_score", 0)
            
            # Add coordination bonus
            if outfit["top"] and outfit["bottom"]:
                if self._colors_coordinate(
                    outfit["top"].get("color", ""),
                    outfit["bottom"].get("color", "")
                ):
                    total_score += 20
            
            return {
                "items": outfit_items,
                "outfit": outfit,
                "total_score": total_score,
                "occasion": context.get("occasion"),
                "formality": context.get("formality"),
            }
            
        except Exception as e:
            logger.error(f"Error generating complete outfit: {e}")
            return {"items": [], "total_score": 0}
    
    def _colors_coordinate(self, color1: str, color2: str) -> bool:
        """Check if two colors coordinate well together."""
        color1 = color1.lower()
        color2 = color2.lower()
        
        # Same color always coordinates
        if color1 == color2:
            return True
        
        # Check harmony rules
        if color1 in self.color_harmony_rules:
            return color2 in self.color_harmony_rules[color1]
        
        # Default to true for unknown colors
        return True


# Singleton instance
_recommendation_engine = None


def get_recommendation_engine() -> ClosetRecommendationEngine:
    """Get the singleton recommendation engine instance."""
    global _recommendation_engine
    if _recommendation_engine is None:
        _recommendation_engine = ClosetRecommendationEngine()
    return _recommendation_engine
