"""
Color Utility Functions
Reusable color analysis and matching utilities
"""

from typing import List, Tuple
import re


# Color categories
NEUTRAL_COLORS = ['black', 'white', 'grey', 'gray', 'beige', 'cream', 'navy', 'tan', 'brown', 'khaki']

WARM_COLORS = ['red', 'orange', 'yellow', 'coral', 'peach', 'rust', 'terracotta', 'burgundy', 'gold']

COOL_COLORS = ['blue', 'green', 'purple', 'teal', 'mint', 'lavender', 'indigo', 'turquoise']

# Seasonal color palettes
SEASONAL_PALETTES = {
    'spring': ['pastel', 'pink', 'light', 'cream', 'sage', 'coral', 'peach', 'mint'],
    'summer': ['white', 'bright', 'blue', 'lavender', 'rose', 'mint', 'sky'],
    'autumn': ['brown', 'orange', 'burgundy', 'olive', 'rust', 'terracotta', 'mustard'],
    'winter': ['black', 'navy', 'grey', 'dark', 'burgundy', 'emerald', 'royal'],
}


def is_neutral_color(color: str) -> bool:
    """
    Check if color is neutral
    
    Args:
        color: Color name or description
        
    Returns:
        True if neutral, False otherwise
    """
    color_lower = color.lower()
    return any(neutral in color_lower for neutral in NEUTRAL_COLORS)


def is_warm_color(color: str) -> bool:
    """Check if color is warm-toned"""
    color_lower = color.lower()
    return any(warm in color_lower for warm in WARM_COLORS)


def is_cool_color(color: str) -> bool:
    """Check if color is cool-toned"""
    color_lower = color.lower()
    return any(cool in color_lower for cool in COOL_COLORS)


def get_color_temperature(color: str) -> str:
    """
    Determine color temperature
    
    Returns:
        'warm', 'cool', or 'neutral'
    """
    if is_neutral_color(color):
        return 'neutral'
    elif is_warm_color(color):
        return 'warm'
    elif is_cool_color(color):
        return 'cool'
    else:
        return 'neutral'  # Default to neutral if unknown


def matches_season(color: str, season: str) -> bool:
    """
    Check if color matches seasonal palette
    
    Args:
        color: Color name or description
        season: Season name (spring, summer, autumn, winter)
        
    Returns:
        True if color matches season
    """
    palette = SEASONAL_PALETTES.get(season.lower(), [])
    color_lower = color.lower()
    return any(p in color_lower for p in palette)


def calculate_color_harmony(colors: List[str]) -> float:
    """
    Calculate color harmony score (0-100)
    
    Factors:
    - Monochromatic: Same color family (90 score)
    - Analogous: Adjacent colors (85 score)
    - Complementary: Opposite colors (80 score)
    - Neutral + accent: Safe combination (85 score)
    - Random: Poor coherence (50 score)
    
    Args:
        colors: List of color names/descriptions
        
    Returns:
        Harmony score (0-100)
    """
    if not colors:
        return 50.0
    
    # Count neutrals
    neutral_count = sum(1 for c in colors if is_neutral_color(c))
    
    # If mostly neutrals, very safe
    if neutral_count >= len(colors) - 1:
        return 90.0
    
    # Categorize colors by temperature
    warm_count = sum(1 for c in colors if is_warm_color(c))
    cool_count = sum(1 for c in colors if is_cool_color(c))
    
    # Monochromatic (all same temperature)
    if warm_count == len(colors) - neutral_count:
        return 90.0
    if cool_count == len(colors) - neutral_count:
        return 90.0
    
    # Complementary (warm + cool)
    if warm_count > 0 and cool_count > 0:
        if warm_count <= 2 and cool_count <= 2:
            return 80.0  # Balanced complementary
        else:
            return 60.0  # Too many competing colors
    
    # Default decent score
    return 70.0


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """
    Convert hex color to RGB tuple
    
    Args:
        hex_color: Hex color string (e.g., "#FF5733" or "FF5733")
        
    Returns:
        RGB tuple (r, g, b)
    """
    hex_color = hex_color.lstrip('#')
    
    if len(hex_color) == 3:
        # Short form (e.g., "F53")
        hex_color = ''.join([c*2 for c in hex_color])
    
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return (0, 0, 0)  # Default to black on error


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """
    Convert RGB to hex color
    
    Args:
        r, g, b: RGB values (0-255)
        
    Returns:
        Hex color string (e.g., "#FF5733")
    """
    return f"#{r:02x}{g:02x}{b:02x}"


def get_color_brightness(hex_color: str) -> float:
    """
    Calculate perceived brightness of color (0-1)
    Uses relative luminance formula
    
    Args:
        hex_color: Hex color string
        
    Returns:
        Brightness value (0=dark, 1=bright)
    """
    r, g, b = hex_to_rgb(hex_color)
    
    # Relative luminance formula
    luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    
    return luminance
