"""Onboarding service — orchestrates complete user onboarding flow."""
import asyncio
import base64
import logging
from typing import Any

from app.core.cache import set as cache_set, TTL
from app.core.config import settings
from app.core.onboarding_constants import (
    MAX_RETRIES,
    BASE_RETRY_DELAY,
    CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    CIRCUIT_BREAKER_TIMEOUT,
    CIRCUIT_BREAKER_MIN_CALLS,
    SKIN_CONCERN_THRESHOLD,
    DEMO_CLOSET_ITEMS,
    SKIN_CONCERNS,
)
from app.services.perfectcorp import call_api
from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)

# Demo closet items imported from constants
# DEMO_CLOSET_ITEMS = [



class CircuitBreaker:
    """Circuit breaker for Perfect Corp API calls."""

    def __init__(
        self,
        failure_threshold: float = CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        timeout: int = CIRCUIT_BREAKER_TIMEOUT,
    ):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.successes = 0
        self.last_failure_time: float | None = None
        self.state = "closed"  # closed, open, half-open

    def is_open(self) -> bool:
        """Check if circuit breaker is open."""
        if self.state == "open":
            import time

            if self.last_failure_time and time.time() - self.last_failure_time > self.timeout:
                self.state = "half-open"
                return False
            return True
        return False

    def record_success(self) -> None:
        """Record a successful call."""
        self.successes += 1
        if self.state == "half-open":
            self.state = "closed"
            self.failures = 0

    def record_failure(self) -> None:
        """Record a failed call."""
        import time

        self.failures += 1
        self.last_failure_time = time.time()

        total = self.failures + self.successes
        if total >= CIRCUIT_BREAKER_MIN_CALLS and self.failures / total >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker opened: {self.failures}/{total} failures")


# Global circuit breaker for Perfect Corp API
_circuit_breaker = CircuitBreaker()


async def _retry_with_backoff(
    fn: Any, max_retries: int = MAX_RETRIES, base_delay: float = BASE_RETRY_DELAY, task_name: str = "API call"
) -> Any:
    """Execute function with exponential backoff retry logic.

    Args:
        fn: Async function to execute
        max_retries: Maximum number of additional retry attempts
        base_delay: Base delay in seconds for exponential backoff
        task_name: Name of the task for logging

    Returns:
        Result from successful function execution

    Raises:
        Exception: If all retries fail
    """
    last_exception = None

    for attempt in range(max_retries + 1):  # +1 for initial attempt
        try:
            result = await fn()
            if attempt > 0:
                logger.info(f"{task_name} succeeded on attempt {attempt + 1}")
            return result
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                delay = base_delay * (2**attempt)
                logger.warning(
                    f"{task_name} failed on attempt {attempt + 1}/{max_retries + 1}, "
                    f"retrying in {delay}s: {str(e)}"
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"{task_name} failed after {max_retries + 1} attempts: {str(e)}")

    raise last_exception  # type: ignore


async def _call_api_with_circuit_breaker(task_type: str, selfie_bytes: bytes, params: dict | None = None) -> dict:
    """Call Perfect Corp API with circuit breaker pattern.

    Args:
        task_type: Perfect Corp API task type
        selfie_bytes: Selfie image bytes
        params: Optional API parameters

    Returns:
        API response data

    Raises:
        Exception: If circuit breaker is open or all retries fail
    """
    if _circuit_breaker.is_open():
        logger.warning(f"Circuit breaker open for {task_type}, using mock data")
        # Return mock data when circuit breaker is open
        from app.core.mock_interceptor import get_mock

        return get_mock(task_type)

    try:
        result = await _retry_with_backoff(
            lambda: call_api(task_type, selfie_bytes, params),
            max_retries=MAX_RETRIES,
            base_delay=BASE_RETRY_DELAY,
            task_name=task_type,
        )
        _circuit_breaker.record_success()
        return result
    except Exception as e:
        _circuit_breaker.record_failure()
        logger.error(f"Perfect Corp API call failed for {task_type}: {str(e)}")
        # Fall back to mock data
        from app.core.mock_interceptor import get_mock

        return get_mock(task_type)


class OnboardingService:
    """Service for handling complete onboarding flow."""

    async def init(self, user_id: str) -> dict[str, Any]:
        """Initialize onboarding session.

        Validates user exists and fetches/creates profile and preferences.

        Args:
            user_id: User ID from Supabase Auth

        Returns:
            Dict with success status, profile, and preferences
        """
        try:
            # Fetch profile
            profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()

            if not profile_response.data:
                raise ValueError(f"Profile not found for user {user_id}")

            # Fetch preferences
            prefs_response = (
                supabase.from_("user_preferences").select("*").eq("user_id", user_id).single().execute()
            )

            if not prefs_response.data:
                raise ValueError(f"Preferences not found for user {user_id}")

            return {"success": True, "profile": profile_response.data, "preferences": prefs_response.data}

        except Exception as e:
            logger.error(f"Onboarding init failed for user {user_id}: {str(e)}")
            raise

    async def analyze(self, user_id: str, selfie_base64: str) -> dict[str, Any]:
        """Execute parallel appearance analysis.

        Calls three Perfect Corp APIs in parallel:
        - skin-analysis
        - skin-tone
        - face-attributes

        Args:
            user_id: User ID
            selfie_base64: Base64-encoded JPEG selfie

        Returns:
            Dict with success status, body_model, skin_scan, and greeting
        """
        try:
            # Decode base64 selfie
            selfie_bytes = base64.b64decode(selfie_base64.split(",")[-1])  # Handle data URL prefix

            # Execute parallel API calls with circuit breaker and retry
            logger.info(f"Starting parallel analysis for user {user_id}")

            skin_analysis_task = _call_api_with_circuit_breaker(
                "skin-analysis",
                selfie_bytes,
                {"dst_actions": ["all"], "format": "json"},
            )
            skin_tone_task = _call_api_with_circuit_breaker("skin-tone", selfie_bytes)
            face_attributes_task = _call_api_with_circuit_breaker("face-attributes", selfie_bytes)

            # Gather results (returns exceptions instead of raising)
            results = await asyncio.gather(
                skin_analysis_task, skin_tone_task, face_attributes_task, return_exceptions=True
            )

            skin_analysis, skin_tone, face_attributes = results

            # Handle individual failures (already logged in _call_api_with_circuit_breaker)
            if isinstance(skin_analysis, Exception):
                logger.error(f"Skin analysis failed: {str(skin_analysis)}")
                from app.core.mock_interceptor import get_mock

                skin_analysis = get_mock("skin-analysis")

            if isinstance(skin_tone, Exception):
                logger.error(f"Skin tone failed: {str(skin_tone)}")
                from app.core.mock_interceptor import get_mock

                skin_tone = get_mock("skin-tone")

            if isinstance(face_attributes, Exception):
                logger.error(f"Face attributes failed: {str(face_attributes)}")
                from app.core.mock_interceptor import get_mock

                face_attributes = get_mock("face-attributes")

            # Extract results from API responses
            skin_result = skin_analysis.get("data", {}).get("result", {})
            tone_result = skin_tone.get("data", {}).get("result", {})
            face_result = face_attributes.get("data", {}).get("result", {})

            # Build body_model structure
            skin_scores = {
                "overall": int(skin_result.get("all", 75)),
                "moisture": int(skin_result.get("moisture", {}).get("score", 70)),
                "acne": int(skin_result.get("acne", {}).get("score", 85)),
                "wrinkles": int(skin_result.get("wrinkle", {}).get("score", 80)),
                "pores": int(skin_result.get("pore", {}).get("score", 75)),
                "dark_circles": int(skin_result.get("dark_circle_v2", {}).get("score", 70)),
            }

            skin_tone_data = tone_result.get("skin_tone", {})
            skin_tone_obj = {
                "undertone": skin_tone_data.get("undertone", "neutral"),
                "depth": skin_tone_data.get("depth", "medium"),
                "hex": skin_tone_data.get("hex", "#D4A574"),
                "color_season": tone_result.get("color_season", "neutral"),
            }

            face_shape_obj = {
                "shape": face_result.get("face_shape", "oval"),
                "symmetry_score": float(face_result.get("symmetry_score", 85.0)),
                "proportions": face_result.get("face_proportions", {}),
            }

            body_model = {
                "skin_scores": skin_scores,
                "skin_tone": skin_tone_obj,
                "face_shape": face_shape_obj,
            }

            # Store in body_model table (upsert)
            supabase.from_("body_model").upsert(
                {
                    "user_id": user_id,
                    "skin_scores": skin_scores,
                    "skin_tone": skin_tone_obj,
                    "face_shape": face_shape_obj,
                }
            ).execute()

            # Insert skin_scans row
            supabase.from_("skin_scans").insert({"user_id": user_id, "scores": skin_scores}).execute()

            # Cache body_model in Redis
            await cache_set(f"body_model:{user_id}", body_model, TTL.BODY_MODEL)

            # Generate greeting
            greeting = self._generate_greeting(skin_scores)

            logger.info(f"Analysis complete for user {user_id}")

            return {
                "success": True,
                "body_model": body_model,
                "skin_scan": {"user_id": user_id, "scores": skin_scores},
                "greeting": greeting,
            }

        except Exception as e:
            logger.error(f"Onboarding analyze failed for user {user_id}: {str(e)}")
            raise

    def _generate_greeting(self, skin_scores: dict[str, int]) -> str:
        """Generate personalized greeting based on skin scores.

        Args:
            skin_scores: Dict of skin metric scores (0-100)

        Returns:
            Personalized greeting message
        """
        overall = skin_scores.get("overall", 75)

        # Find most significant concern (lowest score below threshold)
        concerns = {
            metric: (label, skin_scores.get(metric, 100))
            for metric, label in SKIN_CONCERNS.items()
        }

        # Filter concerns below threshold and sort by score
        significant_concerns = [(name, score) for name, score in concerns.values() if score < SKIN_CONCERN_THRESHOLD]
        significant_concerns.sort(key=lambda x: x[1])

        if significant_concerns:
            concern_name = significant_concerns[0][0]
            return (
                f"Your skin's looking good overall with a score of {overall}. "
                f"I noticed some {concern_name} we can work on together."
            )
        else:
            return f"Your skin's looking great with a score of {overall}! Let's keep it that way."

    async def seed_closet(self, user_id: str) -> dict[str, Any]:
        """Pre-populate user's closet with 15 demo items.

        Args:
            user_id: User ID

        Returns:
            Dict with success status and item count
        """
        try:
            # Prepare items with user_id
            items_to_insert = [{"user_id": user_id, **item} for item in DEMO_CLOSET_ITEMS]

            # Insert all items
            response = supabase.from_("closet_items").insert(items_to_insert).execute()

            # Cache closet items
            await cache_set(f"closet:{user_id}", items_to_insert, TTL.CLOSET)

            logger.info(f"Seeded {len(items_to_insert)} closet items for user {user_id}")

            return {"success": True, "item_count": len(items_to_insert)}

        except Exception as e:
            logger.error(f"Closet seeding failed for user {user_id}: {str(e)}")
            # Retry once
            try:
                logger.info(f"Retrying closet seeding for user {user_id}")
                items_to_insert = [{"user_id": user_id, **item} for item in DEMO_CLOSET_ITEMS]
                response = supabase.from_("closet_items").insert(items_to_insert).execute()
                await cache_set(f"closet:{user_id}", items_to_insert, TTL.CLOSET)
                return {"success": True, "item_count": len(items_to_insert)}
            except Exception as retry_error:
                logger.error(f"Closet seeding retry failed for user {user_id}: {str(retry_error)}")
                raise

    async def complete(self, user_id: str, calendar_connected: bool = False) -> dict[str, Any]:
        """Mark onboarding as complete.

        Args:
            user_id: User ID
            calendar_connected: Whether calendar was connected

        Returns:
            Dict with success status and updated profile
        """
        try:
            # Update profiles.onboarded = true
            profile_response = (
                supabase.from_("profiles").update({"onboarded": True}).eq("id", user_id).execute()
            )

            # Update calendar_connected if applicable
            if calendar_connected:
                supabase.from_("user_preferences").update({"calendar_connected": True}).eq(
                    "user_id", user_id
                ).execute()

            logger.info(f"Onboarding completed for user {user_id}")

            return {"success": True, "profile": profile_response.data[0] if profile_response.data else None}

        except Exception as e:
            logger.error(f"Onboarding complete failed for user {user_id}: {str(e)}")
            raise
