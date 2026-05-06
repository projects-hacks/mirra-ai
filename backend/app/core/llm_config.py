"""Centralized LLM configuration for the backend."""

# ── Direct Gemini API (used for AI metadata extraction, agent reasoning, matching) ──
# These calls go directly to Google's Gemini API using GEMINI_API_KEY.
# GOOGLE_AI_STUDIO_KEY remains supported as a legacy fallback.
GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL_NAME = "gemini-2.5-flash"    # Upgraded from 1.5-pro (May 2026)
GEMINI_TEMPERATURE = 0.2  # Lower temperature for consistent extraction
GEMINI_TOP_K = 40
GEMINI_TOP_P = 0.95
GEMINI_MAX_OUTPUT_TOKENS = 2048
GEMINI_TIMEOUT_SECONDS = 60

# Retry Configuration (Gemini calls)
MAX_RETRIES = 3
RETRY_BASE_DELAY_SECONDS = 2

# Image Download Configuration
IMAGE_DOWNLOAD_TIMEOUT_SECONDS = 30
