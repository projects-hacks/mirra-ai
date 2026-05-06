"""Application constants and enums — single source of truth for all string literals."""
from enum import StrEnum


class Season(StrEnum):
    SPRING = "spring"
    SUMMER = "summer"
    FALL = "fall"
    WINTER = "winter"


# ============================================================
# OUTFIT OUTCOMES (feedback loop)
# ============================================================

class OutfitOutcome(StrEnum):
    PENDING = "pending"
    WORE = "wore"
    SKIPPED = "skipped"
    RETURNED = "returned"
    LOVED = "loved"


# ============================================================
# STYLE
# ============================================================

class StylePreference(StrEnum):
    CASUAL = "casual"
    FORMAL = "formal"
    BALANCED = "balanced"
    EDGY = "edgy"


class SkinType(StrEnum):
    OILY = "oily"
    DRY = "dry"
    COMBINATION = "combination"
    NORMAL = "normal"
    SENSITIVE = "sensitive"


# ============================================================
# PERFECT CORP API TASK TYPES
# ============================================================

class VTOTaskType(StrEnum):
    SKIN_ANALYSIS = "skin-analysis"
    SKIN_TONE = "skin-tone"
    FACE_ATTRIBUTES = "face-attributes"
    CLOTHES = "cloth-v3"
    MAKEUP = "makeup-vto"
    HAIRSTYLE = "hair-transfer"      # v2.1 endpoint
    EARRINGS = "2d-vto/earring"
    NECKLACE = "2d-vto/necklace"
    WATCH = "2d-vto/watch"
    SCARF = "2d-vto/scarf"
    SKIN_SIMULATION = "skin-simulation"


class SkinConcern(StrEnum):
    WRINKLE = "wrinkle"
    PORE = "pore"
    TEXTURE = "texture"
    ACNE = "acne"
    MOISTURE = "moisture"
    OILINESS = "oiliness"
    REDNESS = "redness"
    RADIANCE = "radiance"
    FIRMNESS = "firmness"
    DARK_CIRCLE = "dark_circle_v2"
    EYE_BAG = "eye_bag"
    AGE_SPOT = "age_spot"


ALL_SKIN_CONCERNS = [c.value for c in SkinConcern]


# ============================================================
# PRODUCT RECOMMENDATIONS
# ============================================================

class RecommendationAction(StrEnum):
    SUGGESTED = "suggested"
    CLICKED = "clicked"
    PURCHASED = "purchased"
    RETURNED = "returned"


class ProductSource(StrEnum):
    SERPER = "serper"
    CATALOG = "catalog"
    AFFILIATE = "affiliate"


# ============================================================
# TOOL NAMES
# ============================================================

class ToolName(StrEnum):
    ANALYZE_SKIN = "analyze_skin"
    ANALYZE_SKIN_TONE = "analyze_skin_tone"
    ANALYZE_FACE = "analyze_face"
    SIMULATE_SKIN = "simulate_skin"
    TRY_ON_CLOTHES = "try_on_clothes"
    TRY_ON_MAKEUP = "try_on_makeup"
    TRY_ON_EARRINGS = "try_on_earrings"
    TRY_ON_NECKLACE = "try_on_necklace"
    CHANGE_HAIRSTYLE = "change_hairstyle"
    CHECK_CALENDAR = "check_calendar"
    CHECK_WEATHER = "check_weather"
    SEARCH_PRODUCTS = "search_products"
    MATCH_CLOSET = "match_closet"
    GENERATE_PROOF_CARD = "generate_proof_card"


# ============================================================
# VALIDATION
# ============================================================

MAX_IMAGE_SIZE_BYTES = 10_000_000  # 10MB
MIN_IMAGE_DIMENSION = 300          # px
SELFIE_ORIENTATION = "portrait"    # height >= width

# ============================================================
# CACHE KEY PREFIXES
# ============================================================

class CachePrefix(StrEnum):
    WEATHER = "weather"
    CALENDAR = "calendar"
    BODY = "body"
    CLOSET = "closet"
    STYLE = "style"
    VTO = "vto"
    SESSION = "session"
