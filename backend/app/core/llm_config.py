"""Centralized LLM configuration for the backend."""

# ── Vertex Publisher model id (optional override; default is stable for demos) ──
GEMINI_MODEL_NAME = "gemini-2.5-flash"
GEMINI_TEMPERATURE = 0.2  # Lower temperature for consistent extraction
GEMINI_TOP_K = 40
GEMINI_TOP_P = 0.95
GEMINI_MAX_OUTPUT_TOKENS = 2048
GEMINI_TIMEOUT_SECONDS = 60
# Skin insights can return longer JSON; keep bounded but generous for slow responses.
GEMINI_SKIN_INSIGHTS_TIMEOUT_SECONDS = 60

# Retry Configuration (Gemini calls)
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 2

# Image Download Configuration
IMAGE_DOWNLOAD_TIMEOUT_SECONDS = 30
