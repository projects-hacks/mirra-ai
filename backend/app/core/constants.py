"""Application constants and enums — single source of truth for all string literals."""
from enum import StrEnum


# ============================================================
# CLOSET
# ============================================================

class ItemCategory(StrEnum):
    JACKET = "jacket"
    DRESS = "dress"
    TOP = "top"
    BOTTOM = "bottom"
    SHOES = "shoes"
    ACCESSORY = "accessory"


class Occasion(StrEnum):
    OFFICE = "office"
    MEETING = "meeting"
    DATE = "date"
    CASUAL = "casual"
    BRUNCH = "brunch"
    FORMAL = "formal"
    WEDDING = "wedding"
    CONCERT = "concert"
    TRAVEL = "travel"


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
# DEEPGRAM / VOICE
# ============================================================

class DeepgramMessageType(StrEnum):
    # Client → Server
    SETTINGS = "Settings"
    FUNCTION_CALL_RESPONSE = "FunctionCallResponse"
    INJECT_AGENT_MESSAGE = "InjectAgentMessage"
    INJECT_USER_MESSAGE = "InjectUserMessage"
    UPDATE_PROMPT = "UpdatePrompt"
    UPDATE_SPEAK = "UpdateSpeak"
    UPDATE_THINK = "UpdateThink"
    KEEP_ALIVE = "KeepAlive"

    # Server → Client
    WELCOME = "Welcome"
    SETTINGS_APPLIED = "SettingsApplied"
    CONVERSATION_TEXT = "ConversationText"
    AGENT_THINKING = "AgentThinking"
    AGENT_STARTED_SPEAKING = "AgentStartedSpeaking"
    AGENT_AUDIO_DONE = "AgentAudioDone"
    USER_STARTED_SPEAKING = "UserStartedSpeaking"
    FUNCTION_CALL_REQUEST = "FunctionCallRequest"
    INJECTION_REFUSED = "InjectionRefused"
    PROMPT_UPDATED = "PromptUpdated"


class WSClientMessageType(StrEnum):
    SELFIE = "selfie"
    READY = "ready"
    STOP = "stop"


class WSServerMessageType(StrEnum):
    VTO_RESULT = "vto_result"
    ERROR = "error"


# ============================================================
# TOOL NAMES (must match function_definitions in voice.py)
# ============================================================

class ToolName(StrEnum):
    ANALYZE_SKIN = "analyze_skin"
    ANALYZE_SKIN_TONE = "analyze_skin_tone"
    ANALYZE_FACE = "analyze_face"
    TRY_ON_CLOTHES = "try_on_clothes"
    TRY_ON_MAKEUP = "try_on_makeup"
    TRY_ON_EARRINGS = "try_on_earrings"
    TRY_ON_NECKLACE = "try_on_necklace"
    CHANGE_HAIRSTYLE = "change_hairstyle"
    CHECK_CALENDAR = "check_calendar"
    CHECK_WEATHER = "check_weather"
    SEARCH_PRODUCTS = "search_products"
    GENERATE_PROOF_CARD = "generate_proof_card"


# ============================================================
# VALIDATION
# ============================================================

MAX_IMAGE_SIZE_BYTES = 10_000_000  # 10MB
MIN_IMAGE_DIMENSION = 480          # px
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
