"""
Proof Card Generator
Calculates match scores and generates approval cards for outfit recommendations

Factory Pattern: Creates ProofCard from various inputs (VTO, products, closet items)
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime

from app.utils.price_utils import parse_price, calculate_total
from app.utils.color_utils import (
    is_neutral_color,
    matches_season,
    calculate_color_harmony,
    get_color_temperature,
)


@dataclass
class ProofCardData:
    """Proof card data structure"""
    look_name: str
    vto_image_url: Optional[str]
    tone_match: float  # 0-100
    style_fit: float  # 0-100
    skin_safe: bool
    owned_items: List[Dict]
    new_items: List[Dict]
    total_new_spend: float
    occasion: str
    weather: str
    season: str


class ProofCardGenerator:
    """
    Factory pattern: Generate proof cards from different contexts
    
    Scoring Algorithms:
    - Tone Match: Color harmony between items and skin tone
    - Style Fit: Coherence across all items (formality, style, color palette)
    - Skin Safe: Check for allergens/irritants (makeup only)
    """
    
    def generate(
        self,
        look_name: str,
        vto_result: Optional[Dict],
        selected_items: List[Dict],
        closet_items: List[Dict],
        context: Dict,
        user_profile: Optional[Dict] = None,
    ) -> ProofCardData:
        """
        Generate proof card from outfit selection
        
        Args:
            look_name: User-friendly name for the look
            vto_result: VTO result with image URL (if available)
            selected_items: Items selected for the outfit (owned + new)
            closet_items: User's closet items used in outfit
            context: Occasion, weather, season
            user_profile: User's color profile, skin type, etc.
        
        Returns:
            ProofCardData with calculated scores
        """
        # Separate owned vs new items
        owned = [item for item in selected_items if item.get('owned', False)]
        new = [item for item in selected_items if not item.get('owned', False)]
        
        # Calculate scores
        tone_match = self._calculate_tone_match(selected_items, user_profile)
        style_fit = self._calculate_style_fit(selected_items, context)
        skin_safe = self._check_skin_safety(selected_items, user_profile)
        
        # Calculate total spend using utility
        total_spend = calculate_total([item.get('price', '0') for item in new])
        
        return ProofCardData(
            look_name=look_name,
            vto_image_url=vto_result.get('image_url') if vto_result else None,
            tone_match=tone_match,
            style_fit=style_fit,
            skin_safe=skin_safe,
            owned_items=owned,
            new_items=new,
            total_new_spend=total_spend,
            occasion=context.get('occasion', 'casual'),
            weather=context.get('weather', ''),
            season=context.get('season', 'spring'),
        )
    
    def _calculate_tone_match(self, items: List[Dict], user_profile: Optional[Dict]) -> float:
        """
        Calculate color harmony score (0-100)
        
        Factors:
        - Skin tone compatibility (if user_profile available)
        - Color palette coherence (complementary vs clashing)
        - Seasonal appropriateness
        
        Uses color theory: complementary, analogous, triadic color schemes
        """
        if not items:
            return 50.0
        
        score = 0.0
        factors = 0
        
        # Factor 1: Skin tone compatibility (40% weight)
        if user_profile and user_profile.get('color_palette'):
            skin_tone_hex = user_profile['color_palette'].get('skin_tone_hex')
            season = user_profile['color_palette'].get('season')
            
            if skin_tone_hex and season:
                # Check if item colors match user's season using utility
                season_match_count = 0
                for item in items:
                    color = item.get('color', '').lower()
                    if matches_season(color, season):
                        season_match_count += 1
                
                season_score = (season_match_count / len(items)) * 100
                score += season_score * 0.4
                factors += 0.4
        
        # Factor 2: Color palette coherence (40% weight) using utility
        colors = [item.get('color', '') for item in items if item.get('color')]
        if len(colors) >= 2:
            coherence_score = calculate_color_harmony(colors)
            score += coherence_score * 0.4
            factors += 0.4
        
        # Factor 3: Neutral balance (20% weight) using utility
        # Good outfits have 1-2 statement pieces + neutrals
        neutral_count = sum(1 for item in items if is_neutral_color(item.get('color', '')))
        statement_count = len(items) - neutral_count
        
        if 1 <= statement_count <= 2 and neutral_count >= 1:
            balance_score = 100
        elif statement_count == 0:
            balance_score = 70  # All neutrals is safe but boring
        else:
            balance_score = 50  # Too many statement pieces
        
        score += balance_score * 0.2
        factors += 0.2
        
        # Normalize score
        if factors > 0:
            return min(score / factors, 100)
        else:
            return 75.0  # Default good score
    
    def _calculate_style_fit(self, items: List[Dict], context: Dict) -> float:
        """
        Calculate style coherence score (0-100)
        
        Factors:
        - Formality consistency (all items match occasion formality)
        - Category completeness (has all required categories)
        - Brand/quality consistency
        """
        if not items:
            return 50.0
        
        score = 0.0
        
        # Factor 1: Formality consistency (50% weight)
        occasion = context.get('occasion', 'casual')
        required_formality = self._get_required_formality(occasion)
        
        formality_matches = 0
        for item in items:
            item_formality = item.get('formality', 0.5)
            # Check if item formality is within acceptable range
            if abs(item_formality - required_formality) < 0.3:
                formality_matches += 1
        
        formality_score = (formality_matches / len(items)) * 100
        score += formality_score * 0.5
        
        # Factor 2: Category completeness (30% weight)
        categories = set(item.get('category', '') for item in items)
        required_categories = self._get_required_categories(occasion)
        
        completeness = len(categories & required_categories) / len(required_categories)
        score += completeness * 100 * 0.3
        
        # Factor 3: Price consistency (20% weight) using utility
        # Mixing very cheap and very expensive items can look off
        prices = [parse_price(item.get('price', '0')) for item in items if item.get('price')]
        if len(prices) >= 2:
            price_range = max(prices) - min(prices)
            avg_price = sum(prices) / len(prices)
            
            if avg_price > 0:
                price_variance = price_range / avg_price
                # Low variance = consistent quality
                consistency_score = max(0, 100 - (price_variance * 50))
                score += consistency_score * 0.2
            else:
                score += 80 * 0.2  # Default if no prices
        else:
            score += 80 * 0.2  # Default if not enough items
        
        return min(score, 100)
    
    def _check_skin_safety(self, items: List[Dict], user_profile: Optional[Dict]) -> bool:
        """
        Check if items are safe for user's skin
        
        Only applies to makeup/skincare items
        Checks against known allergens/irritants
        """
        if not user_profile:
            return True  # Assume safe if no profile
        
        known_allergies = user_profile.get('known_allergies', [])
        if not known_allergies:
            return True
        
        # Check each item for allergens
        for item in items:
            category = item.get('category', '')
            
            # Only check makeup/skincare items
            if category not in ['makeup', 'skincare', 'beauty']:
                continue
            
            ingredients = item.get('ingredients', [])
            if not ingredients:
                continue  # Assume safe if no ingredient list
            
            # Check for allergens
            for allergen in known_allergies:
                if any(allergen.lower() in ing.lower() for ing in ingredients):
                    return False  # Found allergen
        
        return True  # No allergens found
    
    def _get_required_formality(self, occasion: str) -> float:
        """Get required formality level for occasion (0.0=casual, 1.0=formal)"""
        formality_map = {
            'formal': 1.0,
            'wedding': 0.9,
            'meeting': 0.7,
            'office': 0.6,
            'date': 0.5,
            'brunch': 0.4,
            'casual': 0.3,
            'concert': 0.3,
            'travel': 0.2,
        }
        return formality_map.get(occasion.lower(), 0.5)
    
    def _get_required_categories(self, occasion: str) -> set:
        """Get required item categories for occasion"""
        category_map = {
            'formal': {'dress', 'shoes', 'accessory'},
            'wedding': {'dress', 'shoes', 'accessory'},
            'meeting': {'top', 'bottom', 'shoes'},
            'office': {'top', 'bottom', 'shoes'},
            'date': {'top', 'bottom', 'shoes'},
            'casual': {'top', 'bottom'},
            'brunch': {'top', 'bottom'},
        }
        return category_map.get(occasion.lower(), {'top', 'bottom'})


# Singleton instance
proof_card_generator = ProofCardGenerator()
