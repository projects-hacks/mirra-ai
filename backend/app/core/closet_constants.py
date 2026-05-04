"""Constants and enums for closet-related functionality."""
from enum import Enum
from typing import List


class ClothingCategory(str, Enum):
    """Valid clothing and accessory categories."""
    JACKET = "jacket"
    COAT = "coat"
    BLAZER = "blazer"
    TOP = "top"
    SHIRT = "shirt"
    BLOUSE = "blouse"
    SWEATER = "sweater"
    DRESS = "dress"
    SKIRT = "skirt"
    PANTS = "pants"
    JEANS = "jeans"
    SHORTS = "shorts"
    SHOES = "shoes"
    SNEAKERS = "sneakers"
    BOOTS = "boots"
    BAG = "bag"
    ACCESSORY = "accessory"
    JEWELRY = "jewelry"
    HAT = "hat"
    SCARF = "scarf"
    BELT = "belt"


class Occasion(str, Enum):
    """Valid occasions for clothing items."""
    CASUAL = "casual"
    WORK = "work"
    DATE = "date"
    FORMAL = "formal"
    ATHLETIC = "athletic"
    PARTY = "party"


class Season(str, Enum):
    """Valid seasons for clothing items."""
    SPRING = "spring"
    SUMMER = "summer"
    FALL = "fall"
    WINTER = "winter"


# Constants
FORMALITY_MIN = 0.0
FORMALITY_MAX = 1.0
FORMALITY_DEFAULT = 0.5

# Gemini API Configuration
GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL_NAME = "gemini-1.5-pro"
GEMINI_TEMPERATURE = 0.2  # Lower temperature for consistent extraction
GEMINI_TOP_K = 40
GEMINI_TOP_P = 0.95
GEMINI_MAX_OUTPUT_TOKENS = 2048
GEMINI_TIMEOUT_SECONDS = 60

# Retry Configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 2

# Image Download Configuration
IMAGE_DOWNLOAD_TIMEOUT_SECONDS = 30


def get_all_categories() -> List[str]:
    """Get list of all valid categories."""
    return [cat.value for cat in ClothingCategory]


def get_all_occasions() -> List[str]:
    """Get list of all valid occasions."""
    return [occ.value for occ in Occasion]


def get_all_seasons() -> List[str]:
    """Get list of all valid seasons."""
    return [season.value for season in Season]
