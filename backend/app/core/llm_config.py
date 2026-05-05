"""Centralized LLM configuration for the backend."""

# ── Direct Gemini API (used for AI metadata extraction, matching engine) ──
# These calls go DIRECTLY to Google's API using GOOGLE_AI_STUDIO_KEY.
# Not through Deepgram — requires your own key from aistudio.google.com.
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

# ── Deepgram Voice Agent think provider (managed LLM) ──
# OpenAI models are FULLY MANAGED by Deepgram — no external API keys needed.
# Google/Anthropic/Groq require API keys configured in Deepgram dashboard.
#
# Confirmed models (May 2026):
#   OpenAI (type: open_ai) — fully managed, no key needed:
#     gpt-4o-mini  — best balance quality/speed/cost for production
#     gpt-4.1-mini — balanced, confirmed working
#     gpt-4o       — well-rounded, reliable
#     gpt-4.1      — strong general-purpose
#   Google (type: google) — needs key in Deepgram dashboard:
#     gemini-2.5-flash, gemini-2.0-flash
#   Anthropic (type: anthropic) — needs key in Deepgram dashboard:
#     claude-3-5-haiku-latest, claude-sonnet-4-20250514

DEEPGRAM_THINK_MODEL = "gpt-4o-mini"
DEEPGRAM_THINK_TEMPERATURE = 0.7


def build_deepgram_think_provider() -> dict:
    """Build think provider config for Deepgram Voice Agent.

    Returns a single provider dict. For multi-provider fallback (paid plans),
    return a list: [primary_dict, fallback_dict].
    """
    return {
        "type": "open_ai",
        "model": DEEPGRAM_THINK_MODEL,
        "temperature": DEEPGRAM_THINK_TEMPERATURE,
    }

