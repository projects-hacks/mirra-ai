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
        - skin-analysis (comprehensive skin metrics + skin_age)
        - skin-tone-analysis (skin/eye/lip/hair colors)
        - face-attr-analysis (face shape, features, ratios, age/gender)

        Args:
            user_id: User ID
            selfie_base64: Base64-encoded JPEG selfie

        Returns:
            Dict with success status, body_model, skin_scan, and greeting
        """
        try:
            # Decode base64 selfie
            selfie_bytes = base64.b64decode(selfie_base64.split(",")[-1])  # Handle data URL prefix

            # Step 1: Upload selfie to Supabase Storage
            selfie_url = None
            try:
                # Check if user wants to store selfies
                prefs_response = supabase.from_("user_preferences").select("store_selfies").eq("user_id", user_id).single().execute()
                store_selfies = prefs_response.data.get("store_selfies", True) if prefs_response.data else True
                
                if store_selfies:
                    # Upload to Supabase Storage: selfies/{user_id}/{timestamp}.jpg
                    from datetime import datetime
                    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                    storage_path = f"selfies/{user_id}/{timestamp}.jpg"
                    
                    storage_response = supabase.storage.from_("selfies").upload(
                        storage_path,
                        selfie_bytes,
                        {"content-type": "image/jpeg"}
                    )
                    
                    # Get public URL
                    selfie_url = supabase.storage.from_("selfies").get_public_url(storage_path)
                    logger.info(f"Selfie uploaded to: {selfie_url}")
            except Exception as storage_error:
                logger.warning(f"Failed to upload selfie to storage: {str(storage_error)}")
                # Continue with analysis even if storage fails

            # Step 2: Execute parallel API calls with circuit breaker and retry
            logger.info(f"Starting parallel analysis for user {user_id}")

            skin_analysis_task = _call_api_with_circuit_breaker(
                "skin-analysis",
                selfie_bytes,
                {
                    "dst_actions": [
                        "wrinkle", "pore", "texture", "acne", "redness", "oiliness",
                        "age_spot", "radiance", "moisture", "dark_circle", "eye_bag",
                        "droopy_upper_eyelid", "droopy_lower_eyelid", "firmness"
                    ],
                    "format": "json"
                },
            )
            skin_tone_task = _call_api_with_circuit_breaker("skin-tone-analysis", selfie_bytes)
            face_attributes_task = _call_api_with_circuit_breaker("face-attr-analysis", selfie_bytes)

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

            # Step 3: Extract comprehensive results from API responses
            skin_result = skin_analysis.get("result", {})
            tone_result = skin_tone.get("results", {})
            face_result = face_attributes.get("results", {})

            # Build comprehensive skin_scores with ALL metrics (both raw_score and ui_score)
            skin_metrics = {}
            for metric in ["wrinkle", "pore", "texture", "acne", "redness", "oiliness", 
                          "age_spot", "radiance", "moisture", "dark_circle", "eye_bag",
                          "droopy_upper_eyelid", "droopy_lower_eyelid", "firmness"]:
                metric_data = skin_result.get(metric, {})
                if isinstance(metric_data, dict):
                    skin_metrics[metric] = {
                        "raw_score": float(metric_data.get("raw_score", 75.0)),
                        "ui_score": int(metric_data.get("ui_score", 75))
                    }
                else:
                    # Fallback for mock data format
                    skin_metrics[metric] = {
                        "raw_score": 75.0,
                        "ui_score": 75
                    }

            # Calculate overall score (average of ui_scores)
            ui_scores = [m["ui_score"] for m in skin_metrics.values()]
            overall_score = int(sum(ui_scores) / len(ui_scores)) if ui_scores else 75

            skin_scores = {
                "overall": overall_score,
                **skin_metrics
            }

            # Extract skin age
            skin_age = skin_result.get("skin_age", None)
            if skin_age:
                skin_age = int(skin_age)

            # Extract comprehensive skin tone data
            color_data = tone_result.get("color", {})
            skin_tone_obj = {
                "skin_color": color_data.get("skin_color", "#D4A574"),
                "eye_color": color_data.get("eye_color", None),
                "eye_color_name": color_data.get("eye_color_name", None),
                "lip_color": color_data.get("lip_color", None),
                "eyebrow_color": color_data.get("eyebrow_color", None),
                "hair_color": color_data.get("hair_color", None),
                "hair_color_name": color_data.get("hair_color_name", None),
            }

            # Extract comprehensive face attributes
            age_gender = face_result.get("agegender", {})
            facial_ratio = face_result.get("facialratio", {})
            eyes_data = face_result.get("eyes", {})
            lips_data = face_result.get("lips", {})
            nose_data = face_result.get("nose", {})
            
            face_shape_obj = {
                "shape": face_result.get("faceshape", "Oval"),
                "age": age_gender.get("age", None),
                "gender": age_gender.get("gender", None),
                "facial_ratios": facial_ratio,
                "eye_shape": eyes_data.get("eyeshape", None),
                "eye_size": eyes_data.get("eyesize", None),
                "eyelid_type": eyes_data.get("eyelid", None),
                "lip_shape": lips_data.get("lipshape", None),
                "nose_width": nose_data.get("nosewidth", None),
                "nose_length": nose_data.get("noselength", None),
            }

            body_model = {
                "skin_scores": skin_scores,
                "skin_tone": skin_tone_obj,
                "face_shape": face_shape_obj,
            }

            # Store in body_model table (upsert - latest snapshot)
            supabase.from_("body_model").upsert(
                {
                    "user_id": user_id,
                    "skin_scores": skin_scores,
                    "skin_tone": skin_tone_obj,
                    "face_shape": face_shape_obj,
                }
            ).execute()

            # Step 4: Insert comprehensive skin_scans row for time-series tracking
            from datetime import datetime
            import pytz
            
            # Get user's timezone and location
            try:
                profile_response = supabase.from_("profiles").select("timezone, location").eq("id", user_id).single().execute()
                user_timezone = profile_response.data.get("timezone", "UTC") if profile_response.data else "UTC"
                user_location = profile_response.data.get("location", None) if profile_response.data else None
                tz = pytz.timezone(user_timezone)
            except:
                tz = pytz.UTC
                user_location = None
            
            current_time = datetime.now(tz)
            hour = current_time.hour
            
            # Determine scan context based on time of day
            if 5 <= hour < 12:
                scan_context = "morning"
            elif 12 <= hour < 17:
                scan_context = "afternoon"
            elif 17 <= hour < 21:
                scan_context = "evening"
            else:
                scan_context = "night"

            # Get weather data for the scan (optional)
            weather_data = None
            if user_location:
                try:
                    from app.services.weather import get_weather
                    weather_data = await get_weather(user_location)
                except Exception as weather_error:
                    logger.warning(f"Could not fetch weather data: {str(weather_error)}")

            # Insert comprehensive scan record
            supabase.from_("skin_scans").insert({
                "user_id": user_id,
                "scores": skin_scores,
                "skin_age": skin_age,
                "scan_context": scan_context,
                "weather_at_scan": weather_data,
                "selfie_url": selfie_url,  # Store selfie URL for before/after comparisons
            }).execute()

            # Cache body_model in Redis
            await cache_set(f"body_model:{user_id}", body_model, TTL.BODY_MODEL)

            # Generate greeting based on overall score
            greeting = self._generate_greeting_from_scores(skin_scores)

            logger.info(f"Analysis complete for user {user_id}")

            return {
                "success": True,
                "body_model": body_model,
                "skin_scan": {
                    "user_id": user_id,
                    "scores": skin_scores,
                    "skin_age": skin_age,
                    "scan_context": scan_context,
                },
                "greeting": greeting,
            }

        except Exception as e:
            logger.error(f"Onboarding analyze failed for user {user_id}: {str(e)}")
            raise

    def _generate_greeting_from_scores(self, skin_scores: dict[str, Any]) -> str:
        """Generate personalized greeting based on comprehensive skin scores.

        Args:
            skin_scores: Dict of skin metric scores with raw_score and ui_score

        Returns:
            Personalized greeting message
        """
        overall = skin_scores.get("overall", 75)

        # Find most significant concern (lowest ui_score below threshold)
        concerns = []
        for metric, label in SKIN_CONCERNS.items():
            if metric in skin_scores and isinstance(skin_scores[metric], dict):
                ui_score = skin_scores[metric].get("ui_score", 100)
                if ui_score < SKIN_CONCERN_THRESHOLD:
                    concerns.append((label, ui_score))

        concerns.sort(key=lambda x: x[1])  # Sort by score (lowest first)

        if concerns:
            concern_name = concerns[0][0]
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
