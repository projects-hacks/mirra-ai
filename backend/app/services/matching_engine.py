"""
Owned-First Matching Engine
Matches closet items to context (occasion, weather, formality) before suggesting purchases

HYBRID COLOR MATCHING:
- Uses Perfect Corp color analysis if available (cached, 90-day refresh)
- Falls back to rule-based keyword matching
- Zero latency for users with cached profiles
"""

from dataclasses import dataclass
from typing import List, Dict
from app.core.constants import ItemCategory, Occasion, Season
from app.services.color_analyzer import calculate_color_compatibility


@dataclass
class MatchContext:
    """Context for matching closet items"""
    occasion: Occasion
    weather_temp: float
    weather_condition: str  # sunny, rainy, cloudy, snowy
    formality: str  # casual, business, formal
    season: Season
    user_preferences: Dict[str, any]
    color_profile: Dict | None = None  # Perfect Corp color analysis (if available)


@dataclass
class MatchResult:
    """Result of matching a single item"""
    item_id: str
    item_name: str
    category: ItemCategory
    score: float  # 0-100
    reasons: List[str]
    image_url: str | None = None


class MatchingEngine:
    """
    Strategy pattern: different scoring strategies per category
    Implements owned-first logic by scoring existing closet items
    """

    def match_items(
        self,
        closet_items: List[Dict],
        context: MatchContext
    ) -> Dict[ItemCategory, List[MatchResult]]:
        """
        Match closet items to context and return top matches per category
        
        Args:
            closet_items: List of user's closet items
            context: Matching context (occasion, weather, etc.)
            
        Returns:
            Dictionary mapping category to list of match results
        """
        matches_by_category: Dict[ItemCategory, List[MatchResult]] = {}

        for item in closet_items:
            score = self._score_item(item, context)
            
            if score > 0:  # Only include items with positive scores
                category = ItemCategory(item.get('category', 'top'))
                
                match = MatchResult(
                    item_id=item['id'],
                    item_name=item['name'],
                    category=category,
                    score=score,
                    reasons=self._get_match_reasons(item, context, score),
                    image_url=item.get('image_url'),
                )

                if category not in matches_by_category:
                    matches_by_category[category] = []
                
                matches_by_category[category].append(match)

        # Sort each category by score (highest first)
        for category in matches_by_category:
            matches_by_category[category].sort(key=lambda m: m.score, reverse=True)

        return matches_by_category

    def identify_gaps(
        self,
        matches: Dict[ItemCategory, List[MatchResult]],
        context: MatchContext
    ) -> List[str]:
        """
        Identify missing categories or low-scoring categories
        
        Args:
            matches: Matched items by category
            context: Matching context
            
        Returns:
            List of gap descriptions (e.g., "No formal dress for wedding")
        """
        gaps = []
        
        # Required categories based on occasion
        required_categories = self._get_required_categories(context.occasion)
        
        for category in required_categories:
            if category not in matches or not matches[category]:
                gaps.append(f"No {category.value} for {context.occasion.value}")
            elif matches[category][0].score < 50:
                gaps.append(f"Low-scoring {category.value} (consider alternatives)")
        
        return gaps

    def _score_item(self, item: Dict, context: MatchContext) -> float:
        """
        Multi-factor scoring algorithm with HYBRID color matching
        
        Factors:
        - Occasion match (40% weight)
        - Weather appropriateness (30% weight)
        - Color seasonality (15% weight) — HYBRID: Perfect Corp + rule-based
        - Wear frequency (15% weight) — prefer underutilized items
        
        Returns:
            Score from 0-100
        """
        score = 0.0

        # Occasion match (40% weight)
        occasions = item.get('occasions', [])
        if context.occasion.value in occasions or 'any' in occasions:
            score += 40
        elif self._is_occasion_compatible(context.occasion, occasions):
            score += 25  # Partial match

        # Weather appropriateness (30% weight)
        if self._is_weather_appropriate(item, context.weather_temp, context.season):
            score += 30

        # Color seasonality (15% weight) — HYBRID APPROACH
        color_score = calculate_color_compatibility(
            item.get('color', ''),
            context.color_profile  # Uses Perfect Corp if available, else rule-based
        )
        score += (color_score / 100) * 15  # Normalize to 15 points max

        # Wear frequency (15% weight) — prefer underutilized items
        times_worn = item.get('times_worn', 0)
        wear_score = 15 * (1 - min(times_worn / 50, 1))
        score += wear_score

        return min(score, 100)

    def _is_occasion_compatible(self, target: Occasion, item_occasions: List[str]) -> bool:
        """Check if occasion is compatible with item occasions"""
        compatibility_map = {
            Occasion.FORMAL: [Occasion.WEDDING.value, Occasion.MEETING.value],
            Occasion.MEETING: [Occasion.OFFICE.value, Occasion.FORMAL.value],
            Occasion.DATE: [Occasion.CASUAL.value, Occasion.BRUNCH.value],
            Occasion.CASUAL: [Occasion.BRUNCH.value, Occasion.TRAVEL.value],
        }
        
        compatible = compatibility_map.get(target, [])
        return any(occ in item_occasions for occ in compatible)

    def _is_weather_appropriate(self, item: Dict, temp: float, season: Season) -> bool:
        """Check if item is appropriate for weather/season"""
        category = item.get('category', '')
        material = item.get('material', '').lower()
        
        # Temperature-based logic
        if temp < 50:  # Cold
            # Prefer jackets and layering pieces
            if category == 'jacket':
                return True
            # Avoid light materials if specified
            if material and material in ['linen', 'silk']:
                return False
            return category in ['top', 'bottom']
        elif temp > 75:  # Hot
            # Avoid jackets unless light material
            if category == 'jacket':
                return material in ['linen', 'cotton', 'denim']
            return True
        else:  # Moderate (50-75°F)
            return True

    def _matches_season_palette(self, color: str, season: Season) -> bool:
        """Check if color matches seasonal palette"""
        season_palettes = {
            Season.SPRING: ['pastel', 'pink', 'light', 'cream', 'sage'],
            Season.SUMMER: ['white', 'bright', 'yellow', 'coral', 'blue'],
            Season.FALL: ['brown', 'orange', 'burgundy', 'olive', 'rust'],
            Season.WINTER: ['black', 'navy', 'grey', 'dark', 'burgundy'],
        }
        
        palette = season_palettes.get(season, [])
        color_lower = color.lower()
        
        return any(p in color_lower for p in palette)

    def _get_match_reasons(self, item: Dict, context: MatchContext, score: float) -> List[str]:
        """Generate human-readable reasons for match"""
        reasons = []
        
        if context.occasion.value in item.get('occasions', []):
            reasons.append(f"Perfect for {context.occasion.value}")
        
        if self._is_weather_appropriate(item, context.weather_temp, context.season):
            reasons.append("Weather appropriate")
        
        # HYBRID: Show if color match used Perfect Corp analysis
        color_score = calculate_color_compatibility(item.get('color', ''), context.color_profile)
        if color_score >= 75:
            if context.color_profile:
                reasons.append("Matches your skin tone")  # Perfect Corp analysis
            else:
                reasons.append("Seasonal color")  # Rule-based
        
        if item.get('times_worn', 0) < 10:
            reasons.append("Underutilized piece")
        
        if score >= 80:
            reasons.append("Excellent match")
        
        return reasons

    def _get_required_categories(self, occasion: Occasion) -> List[ItemCategory]:
        """Get required categories for an occasion"""
        category_map = {
            Occasion.FORMAL: [ItemCategory.DRESS, ItemCategory.SHOES, ItemCategory.ACCESSORY],
            Occasion.WEDDING: [ItemCategory.DRESS, ItemCategory.SHOES, ItemCategory.ACCESSORY],
            Occasion.MEETING: [ItemCategory.TOP, ItemCategory.BOTTOM, ItemCategory.SHOES],
            Occasion.OFFICE: [ItemCategory.TOP, ItemCategory.BOTTOM, ItemCategory.SHOES],
            Occasion.DATE: [ItemCategory.TOP, ItemCategory.BOTTOM, ItemCategory.SHOES],
            Occasion.CASUAL: [ItemCategory.TOP, ItemCategory.BOTTOM],
            Occasion.BRUNCH: [ItemCategory.TOP, ItemCategory.BOTTOM],
        }
        
        return category_map.get(occasion, [ItemCategory.TOP, ItemCategory.BOTTOM])


# Singleton instance
matching_engine = MatchingEngine()
