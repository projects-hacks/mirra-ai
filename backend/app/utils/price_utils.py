"""
Price Utility Functions
Reusable price parsing and formatting utilities
"""

import re
from typing import Union


def parse_price(price_input: Union[str, int, float]) -> float:
    """
    Extract numeric price from various input formats
    
    Args:
        price_input: Price as string, int, or float
        
    Returns:
        Numeric price value
        
    Examples:
        >>> parse_price("$29.99")
        29.99
        >>> parse_price("USD 150")
        150.0
        >>> parse_price(42)
        42.0
    """
    if isinstance(price_input, (int, float)):
        return float(price_input)
    
    # Remove all non-numeric characters except decimal point
    cleaned = re.sub(r'[^\d.]', '', str(price_input))
    
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def format_price(price: float, currency: str = "USD") -> str:
    """
    Format price as currency string
    
    Args:
        price: Numeric price value
        currency: Currency code (default: USD)
        
    Returns:
        Formatted price string
        
    Examples:
        >>> format_price(29.99)
        "$30"
        >>> format_price(1234.56)
        "$1,235"
    """
    if currency == "USD":
        return f"${int(round(price)):,}"
    else:
        return f"{int(round(price)):,} {currency}"


def calculate_total(prices: list[Union[str, int, float]]) -> float:
    """
    Calculate total from list of prices
    
    Args:
        prices: List of prices in various formats
        
    Returns:
        Total sum
    """
    return sum(parse_price(p) for p in prices)
