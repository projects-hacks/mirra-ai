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
                logger.info(f"✓ {task_name} succeeded after {attempt} retry(ies)")
            return result
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                delay = base_delay * (2**attempt)
                logger.warning(
                    f"✗ {task_name} failed (attempt {attempt + 1}/{max_retries + 1}), "
                    f"retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"✗ {task_name} failed after {max_retries + 1} attempt(s): {str(e)}")

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
        logger.error(f"Circuit breaker open for {task_type}")
        raise Exception(f"Circuit breaker open for {task_type}, service temporarily unavailable")

    try:
        async def api_call():
            try:
                return await call_api(task_type, selfie_bytes, params)
            except Exception as e:
                # Import here to avoid circular dependency
                from app.services.perfectcorp import PerfectCorpAPIError
                
                # Only retry if error is retryable
                if isinstance(e, PerfectCorpAPIError) and not e.is_retryable():
                    logger.debug(f"Non-retryable error for {task_type}: {e.error_code}")
                    raise  # Don't retry non-retryable errors
                raise
        
        result = await _retry_with_backoff(
            api_call,
            max_retries=MAX_RETRIES,
            base_delay=BASE_RETRY_DELAY,
            task_name=task_type,
        )
        _circuit_breaker.record_success()
        return result
    except Exception as e:
        _circuit_breaker.record_failure()
        
        # Import here to avoid circular dependency
        from app.services.perfectcorp import PerfectCorpAPIError
        
        # Log user-friendly message for non-retryable errors
        if isinstance(e, PerfectCorpAPIError):
            logger.info(f"User message for {task_type}: {e.get_user_message()}")
        
        # Re-raise the exception instead of falling back to mock
        raise


class OnboardingService:
    """Service for handling complete onboarding flow."""

    async def _detect_location_from_ip(self, ip_address: str) -> tuple[str | None, str | None]:
        """Detect city and timezone from IP address.
        
        Args:
            ip_address: Client IP address
            
        Returns:
            Tuple of (city, timezone) or (None, None) if detection fails
        """
        try:
            import httpx
            
            # Use ipapi.co (free tier: 1000 requests/day, no API key needed)
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"https://ipapi.co/{ip_address}/json/")
                
                if response.status_code == 200:
                    data = response.json()
                    city = data.get("city")
                    timezone = data.get("timezone")
                    
                    if city and timezone:
                        logger.info(f"Detected location from IP {ip_address}: {city}, {timezone}")
                        return city, timezone
                    else:
                        logger.warning(f"Incomplete location data from IP {ip_address}: {data}")
                else:
                    logger.warning(f"IP geolocation failed with status {response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Could not detect location from IP {ip_address}: {str(e)}")
        
        return None, None

    async def init(self, user_id: str, ip_address: str | None = None) -> dict[str, Any]:
        """Initialize onboarding session.

        Validates user exists and fetches/creates profile and preferences.
        If profile has default location and IP is provided, attempts to detect actual location.

        Args:
            user_id: User ID from Supabase Auth
            ip_address: Optional client IP address for location detection

        Returns:
            Dict with success status, profile, and preferences
        """
        try:
            # Fetch profile
            profile_response = supabase.from_("profiles").select("*").eq("id", user_id).single().execute()

            if not profile_response.data:
                raise ValueError(f"Profile not found for user {user_id}")

            profile = profile_response.data
            
            # Auto-detect location from IP if still using default
            if profile.get("location") == "San Francisco" and ip_address:
                logger.debug(f"Attempting IP-based location detection for {ip_address}")
                
                detected_city, detected_timezone = await self._detect_location_from_ip(ip_address)
                
                if detected_city and detected_timezone:
                    # Update profile with detected location
                    update_response = supabase.from_("profiles").update({
                        "location": detected_city,
                        "timezone": detected_timezone
                    }).eq("id", user_id).execute()
                    
                    if update_response.data:
                        profile = update_response.data[0]
                        logger.info(f"Updated profile location: {detected_city}, {detected_timezone}")

            # Fetch preferences
            prefs_response = (
                supabase.from_("user_preferences").select("*").eq("user_id", user_id).single().execute()
            )

            if not prefs_response.data:
                raise ValueError(f"Preferences not found for user {user_id}")

            return {"success": True, "profile": profile, "preferences": prefs_response.data}

        except Exception as e:
            logger.error(f"Onboarding init failed for user {user_id}: {str(e)}")
            raise

    async def analyze(self, user_id: str, selfie_base64: str, ip_address: str | None = None) -> dict[str, Any]:
        """Execute parallel appearance analysis.

        Calls three Perfect Corp APIs in parallel:
        - skin-analysis (comprehensive skin metrics + skin_age)
        - skin-tone-analysis (skin/eye/lip/hair colors)
        - face-attr-analysis (face shape, features, ratios, age/gender)

        Args:
            user_id: User ID
            selfie_base64: Base64-encoded JPEG selfie
            ip_address: Optional client IP address for location detection

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
            logger.info(f"→ Starting analysis for user {user_id}")

            skin_analysis_task = _call_api_with_circuit_breaker(
                "skin-analysis",
                selfie_bytes,
                {
                    "dst_actions": [
                        "wrinkle", "pore", "texture", "acne", "redness", "oiliness",
                        "age_spot", "radiance", "moisture", "dark_circle", "eye_bag",
                        "droopy_upper_eyelid", "droopy_lower_eyelid", "firmness"
                    ],
                    "format": "json",
                    "face_angle_strictness_level": "low"  # 20° tolerance for better onboarding UX
                },
            )
            skin_tone_task = _call_api_with_circuit_breaker(
                "skin-tone-analysis",
                selfie_bytes,
                {"face_angle_strictness_level": "low"}  # 20° tolerance for better onboarding UX
            )
            face_attributes_task = _call_api_with_circuit_breaker(
                "face-attr-analysis",
                selfie_bytes,
                {"face_angle_strictness_level": "low"}  # 20° tolerance for better onboarding UX
            )

            # Gather results (returns exceptions instead of raising)
            results = await asyncio.gather(
                skin_analysis_task, skin_tone_task, face_attributes_task, return_exceptions=True
            )

            skin_analysis, skin_tone, face_attributes = results

            # Handle individual failures - re-raise exceptions instead of using mocks
            if isinstance(skin_analysis, Exception):
                logger.error(f"✗ Skin analysis failed: {str(skin_analysis)}")
                raise skin_analysis

            if isinstance(skin_tone, Exception):
                logger.error(f"✗ Skin tone analysis failed: {str(skin_tone)}")
                raise skin_tone

            if isinstance(face_attributes, Exception):
                logger.error(f"✗ Face attributes analysis failed: {str(face_attributes)}")
                raise face_attributes
            
            logger.info(f"✓ All analyses completed successfully for user {user_id}")

            # Step 3: Extract comprehensive results from API responses
            skin_result = skin_analysis.get("result", {})
            tone_result = skin_tone.get("results", {})
            face_result = face_attributes.get("results", {})

            # Build flattened skin_scores using ui_score values (integers 0-100)
            # Map backend metric names to frontend expectations
            metric_mapping = {
                "wrinkle": "wrinkles",
                "pore": "pores",
                "dark_circle": "dark_circles",
                # These stay the same
                "texture": "texture",
                "acne": "acne",
                "redness": "redness",
                "oiliness": "oiliness",
                "age_spot": "age_spot",
                "radiance": "radiance",
                "moisture": "moisture",
                "eye_bag": "eye_bag",
                "droopy_upper_eyelid": "droopy_upper_eyelid",
                "droopy_lower_eyelid": "droopy_lower_eyelid",
                "firmness": "firmness"
            }
            
            skin_metrics = {}
            for backend_metric, frontend_metric in metric_mapping.items():
                metric_data = skin_result.get(backend_metric, {})
                if isinstance(metric_data, dict):
                    # Use ui_score as the flattened integer value
                    skin_metrics[frontend_metric] = int(metric_data.get("ui_score", 75))
                else:
                    # Fallback for mock data format
                    skin_metrics[frontend_metric] = 75

            # Calculate overall score (average of all metric scores)
            metric_scores = list(skin_metrics.values())
            overall_score = int(sum(metric_scores) / len(metric_scores)) if metric_scores else 75

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
            
            # Helper function to convert array responses to strings
            def array_to_string(value):
                """Convert array to string (join with comma) or return as-is if not array."""
                if isinstance(value, list) and value:
                    return ", ".join(str(v) for v in value)
                return value
            
            face_shape_obj = {
                "shape": face_result.get("faceshape", "Oval"),
                "age": age_gender.get("age", None),
                "gender": age_gender.get("gender", None),
                "facial_ratios": facial_ratio,
                "eye_shape": array_to_string(eyes_data.get("eyeshape", None)),
                "eye_size": array_to_string(eyes_data.get("eyesize", None)),
                "eyelid_type": array_to_string(eyes_data.get("eyelid", None)),
                "lip_shape": array_to_string(lips_data.get("lipshape", None)),
                "nose_width": array_to_string(nose_data.get("nosewidth", None)),
                "nose_length": array_to_string(nose_data.get("noselength", None)),
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
                },
                on_conflict="user_id"
            ).execute()

            # Step 4: Insert comprehensive skin_scans row for time-series tracking
            from datetime import datetime
            import pytz
            
            # Detect actual scan location from IP (where user is right now)
            scan_location = None
            scan_timezone = None
            
            if ip_address:
                logger.debug(f"Detecting scan location from IP {ip_address}")
                scan_location, scan_timezone = await self._detect_location_from_ip(ip_address)
            
            # Fall back to profile location/timezone if IP detection fails
            if not scan_location or not scan_timezone:
                try:
                    profile_response = supabase.from_("profiles").select("timezone, location").eq("id", user_id).single().execute()
                    if not scan_timezone:
                        scan_timezone = profile_response.data.get("timezone", "UTC") if profile_response.data else "UTC"
                    if not scan_location:
                        scan_location = profile_response.data.get("location", None) if profile_response.data else None
                    logger.debug(f"Using profile location as fallback: {scan_location}, {scan_timezone}")
                except:
                    scan_timezone = "UTC"
                    scan_location = None
            
            # Determine time of day context using scan timezone
            try:
                tz = pytz.timezone(scan_timezone)
            except:
                tz = pytz.UTC
            
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

            # Get weather data for the ACTUAL scan location (not profile location)
            weather_data = None
            if scan_location:
                try:
                    from app.services.weather import get_weather
                    weather_data = await get_weather(scan_location)
                    logger.debug(f"Weather fetched for {scan_location}: {weather_data.get('condition') if weather_data else 'N/A'}")
                except Exception as weather_error:
                    logger.warning(f"Could not fetch weather for {scan_location}: {str(weather_error)}")

            # Insert comprehensive scan record with actual scan location
            supabase.from_("skin_scans").insert({
                "user_id": user_id,
                "scores": skin_scores,
                "skin_age": skin_age,
                "scan_context": scan_context,
                "location_at_scan": scan_location,  # Where user actually was during scan
                "weather_at_scan": weather_data,
                "selfie_url": selfie_url,  # Store selfie URL for before/after comparisons
            }).execute()

            # Cache body_model in Redis
            await cache_set(f"body_model:{user_id}", body_model, TTL.BODY_MODEL)

            # Generate greeting based on overall score
            greeting = self._generate_greeting_from_scores(skin_scores)

            logger.info(f"✓ Analysis complete for user {user_id} (overall score: {overall_score})")

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
            logger.error(f"✗ Analysis failed for user {user_id}: {str(e)}")
            raise

    def _generate_greeting_from_scores(self, skin_scores: dict[str, Any]) -> str:
        """Generate personalized greeting based on skin scores.

        Args:
            skin_scores: Dict of skin metric scores (flattened integers 0-100)

        Returns:
            Personalized greeting message
        """
        overall = skin_scores.get("overall", 75)

        # Find most significant concern (lowest score below threshold)
        concerns = []
        for metric, label in SKIN_CONCERNS.items():
            if metric in skin_scores:
                score = skin_scores[metric]
                # Handle both flattened (int) and nested (dict) formats for backward compatibility
                if isinstance(score, dict):
                    score = score.get("ui_score", 100)
                if score < SKIN_CONCERN_THRESHOLD:
                    concerns.append((label, score))

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
            supabase.from_("closet_items").insert(items_to_insert).execute()

            # Cache closet items
            await cache_set(f"closet:{user_id}", items_to_insert, TTL.CLOSET)

            logger.info(f"✓ Seeded {len(items_to_insert)} closet items for user {user_id}")

            return {"success": True, "item_count": len(items_to_insert)}

        except Exception as e:
            logger.error(f"✗ Closet seeding failed for user {user_id}: {str(e)}")
            # Retry once
            try:
                logger.info(f"Retrying closet seeding for user {user_id}")
                items_to_insert = [{"user_id": user_id, **item} for item in DEMO_CLOSET_ITEMS]
                supabase.from_("closet_items").insert(items_to_insert).execute()
                await cache_set(f"closet:{user_id}", items_to_insert, TTL.CLOSET)
                logger.info(f"✓ Closet seeding succeeded on retry")
                return {"success": True, "item_count": len(items_to_insert)}
            except Exception as retry_error:
                logger.error(f"✗ Closet seeding retry failed: {str(retry_error)}")
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
            logger.info(f"→ Completing onboarding for user {user_id}")
            
            # Update profiles.onboarded = true
            profile_response = (
                supabase.from_("profiles").update({"onboarded": True}).eq("id", user_id).execute()
            )
            
            if not profile_response.data:
                logger.error(f"Profile update returned no data for user {user_id}")
                # Verify the profile exists
                check_response = supabase.from_("profiles").select("*").eq("id", user_id).execute()
                logger.debug(f"Profile check: {check_response.data}")
                raise ValueError(f"Failed to update profile for user {user_id}")

            # Update calendar_connected if applicable
            if calendar_connected:
                supabase.from_("user_preferences").update({"calendar_connected": True}).eq(
                    "user_id", user_id
                ).execute()

            logger.info(f"✓ Onboarding completed for user {user_id}")

            return {"success": True, "profile": profile_response.data[0] if profile_response.data else None}

        except Exception as e:
            logger.error(f"✗ Onboarding completion failed for user {user_id}: {str(e)}", exc_info=True)
            raise
