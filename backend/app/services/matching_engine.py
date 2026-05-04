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
from app.core.closet_constants import ClothingCategory, Occasion, Season
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
    category: ClothingCategory
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
    ) -> Dict[ClothingCategory, List[MatchResult]]:
        """
        Match closet items to context and return top matches per category
        
        Args:
            closet_items: List of user's closet items
            context: Matching context (occasion, weather, etc.)
            
        Returns:
            Dictionary mapping category to list of match results
        """
        matches_by_category: Dict[ClothingCategory, List[MatchResult]] = {}

        for item in closet_items:
            score = self._score_item(item, context)
            
            if score > 0:  # Only include items with positive scores
                category = self._parse_category(item.get("category"))
                
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
        matches: Dict[ClothingCategory, List[MatchResult]],
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
        required_groups = self._get_required_category_groups(context.occasion)
        
        for group in required_groups:
            group_categories = CATEGORY_GROUPS[group]
            group_matches: List[MatchResult] = []
            for category, match_list in matches.items():
                if category in group_categories:
                    group_matches.extend(match_list)

            group_label = group.replace("_", " ")
            if not group_matches:
                gaps.append(f"No {group_label} for {context.occasion.value}")
            else:
                top_score = max((m.score for m in group_matches), default=0)
                if top_score < 50:
                    gaps.append(f"Low-scoring {group_label} (consider alternatives)")
        
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
            Occasion.FORMAL: [Occasion.PARTY.value, Occasion.WORK.value],
            Occasion.WORK: [Occasion.FORMAL.value, Occasion.CASUAL.value],
            Occasion.DATE: [Occasion.PARTY.value, Occasion.CASUAL.value],
            Occasion.CASUAL: [Occasion.ATHLETIC.value, Occasion.PARTY.value],
        }
        
        compatible = compatibility_map.get(target, [])
        return any(occ in item_occasions for occ in compatible)

    def _is_weather_appropriate(self, item: Dict, temp: float, _season: Season) -> bool:
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

    def _get_required_category_groups(self, occasion: Occasion) -> List[str]:
        """Get required category groups for an occasion."""
        category_map = {
            Occasion.FORMAL: ["dress", "shoes", "accessories"],
            Occasion.PARTY: ["tops", "bottoms", "shoes", "accessories"],
            Occasion.WORK: ["tops", "bottoms", "shoes"],
            Occasion.DATE: ["tops", "bottoms", "shoes"],
            Occasion.ATHLETIC: ["tops", "bottoms", "shoes"],
            Occasion.CASUAL: ["tops", "bottoms"],
        }
        
        return category_map.get(occasion, ["tops", "bottoms"])

    def _parse_category(self, raw_category: str | None) -> ClothingCategory:
        """Parse a raw category string into a ClothingCategory enum."""
        if not raw_category:
            return ClothingCategory.TOP
        try:
            return ClothingCategory(raw_category)
        except ValueError:
            return ClothingCategory.TOP


CATEGORY_GROUPS: Dict[str, set[ClothingCategory]] = {
    "tops": {
        ClothingCategory.TOP,
        ClothingCategory.SHIRT,
        ClothingCategory.BLOUSE,
        ClothingCategory.SWEATER,
        ClothingCategory.BLAZER,
        ClothingCategory.JACKET,
        ClothingCategory.COAT,
    },
    "bottoms": {
        ClothingCategory.PANTS,
        ClothingCategory.JEANS,
        ClothingCategory.SHORTS,
        ClothingCategory.SKIRT,
    },
    "shoes": {
        ClothingCategory.SHOES,
        ClothingCategory.SNEAKERS,
        ClothingCategory.BOOTS,
    },
    "dress": {
        ClothingCategory.DRESS,
    },
    "accessories": {
        ClothingCategory.ACCESSORY,
        ClothingCategory.JEWELRY,
        ClothingCategory.BAG,
        ClothingCategory.BELT,
        ClothingCategory.HAT,
        ClothingCategory.SCARF,
    },
}


# Singleton instance
matching_engine = MatchingEngine()
