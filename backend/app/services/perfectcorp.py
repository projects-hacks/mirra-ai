"""Perfect Corp API client — async upload → task → poll → result."""
import asyncio
from enum import Enum
from typing import Any

import httpx

from app.core.config import settings

BASE = settings.PERFECT_CORP_BASE_URL
HEADERS = {"Authorization": f"Bearer {settings.PERFECT_CORP_API_KEY}"}

# Endpoints that use v2.1 instead of v2.0
V21_ENDPOINTS = {"hair-transfer", "skin-analysis"}


class MirraErrorCategory(str, Enum):
    """Stable user-facing error taxonomy for provider failures."""

    PRODUCT_PAGE_URL = "product_page_url"
    EXPIRED_IMAGE_URL = "expired_image_url"
    FACE_REJECTED = "face_rejected"
    BODY_POSE_REJECTED = "body_pose_rejected"
    REFERENCE_REJECTED = "reference_rejected"
    API_TIMEOUT = "api_timeout"
    UNSUPPORTED_CATEGORY = "unsupported_category"
    PROVIDER_AUTH = "provider_auth"
    PROVIDER_UNITS = "provider_units"
    PROVIDER_INTERNAL = "provider_internal"
    SAFETY_BLOCKED = "safety_blocked"
    INVALID_INPUT = "invalid_input"


class PerfectCorpAPIError(Exception):
    """Custom exception for Perfect Corp API errors with error codes."""
    
    def __init__(self, error_code: str, error_message: str, task_type: str):
        self.error_code = error_code
        self.error_message = error_message
        self.task_type = task_type
        super().__init__(f"[{task_type}] {error_code}: {error_message}")
    
    def is_retryable(self) -> bool:
        """Check if this error should be retried.
        
        Retryable errors:
        - 429 (Rate limit)
        - 500, 502, 503, 504 (Server errors)
        - unknown_internal (Perfect Corp internal errors)
        
        Non-retryable errors:
        - 400, 401, 403, 404 (Client errors - bad request, auth, not found)
        - error_face_angle, error_src_face_too_small, etc. (User input errors)
        """
        retryable_codes = ["429", "500", "502", "503", "504", "unknown_internal"]
        
        # HTTP 4xx errors (except 429) are not retryable
        if self.error_code.startswith("http_4") and "429" not in self.error_code:
            return False
        
        return any(code in self.error_code for code in retryable_codes)
    
    def category(self) -> MirraErrorCategory:
        """Map Perfect Corp and HTTP errors to Mirra's stable taxonomy."""
        code = self.error_code.lower()
        message = self.error_message.lower()
        combined = f"{code} {message}"

        if "invalidaccesstoken" in combined or "unauthorized" in combined or "http_401" in code:
            return MirraErrorCategory.PROVIDER_AUTH
        if "credit" in combined or "unit" in combined or "insufficient" in combined:
            return MirraErrorCategory.PROVIDER_UNITS
        if "nsfw" in combined:
            return MirraErrorCategory.SAFETY_BLOCKED
        if "download" in combined or "not found" in combined or "404" in combined or "403" in combined:
            return MirraErrorCategory.EXPIRED_IMAGE_URL
        if "invalid_parameter" in combined or "invalidparameters" in combined or "invalid parameter" in combined:
            return MirraErrorCategory.UNSUPPORTED_CATEGORY
        if "invalid_ref" in combined or "object_detection" in combined or "ref_" in combined:
            return MirraErrorCategory.REFERENCE_REJECTED
        if "pose" in combined or "shoulder" in combined or "photo_check_invalid" in combined:
            return MirraErrorCategory.BODY_POSE_REJECTED
        if "face" in combined or "lighting" in combined or "eye_closed" in combined or "occluded" in combined:
            return MirraErrorCategory.FACE_REJECTED
        if "timeout" in combined or "invalidtaskid" in combined:
            return MirraErrorCategory.API_TIMEOUT
        if "runtime" in combined or "internal" in combined or "inference" in combined:
            return MirraErrorCategory.PROVIDER_INTERNAL
        return MirraErrorCategory.INVALID_INPUT

    def get_user_message(self) -> str:
        """Get user-friendly error message."""
        messages = {
            MirraErrorCategory.PRODUCT_PAGE_URL: "This is a product page, not a clean image. Try another product image.",
            MirraErrorCategory.EXPIRED_IMAGE_URL: "That image link expired or is blocked. Try another product image.",
            MirraErrorCategory.FACE_REJECTED: "Retake with your face centered, visible, and well lit.",
            MirraErrorCategory.BODY_POSE_REJECTED: "Use a front-facing standing photo with face and shoulders visible.",
            MirraErrorCategory.REFERENCE_REJECTED: "The product image is not clear enough for try-on.",
            MirraErrorCategory.API_TIMEOUT: "The render took too long. Please retry.",
            MirraErrorCategory.UNSUPPORTED_CATEGORY: "This item is not supported in this try-on mode yet.",
            MirraErrorCategory.PROVIDER_AUTH: "Perfect Corp credentials are not configured or are invalid.",
            MirraErrorCategory.PROVIDER_UNITS: "Perfect Corp units are unavailable. Check the unit balance.",
            MirraErrorCategory.PROVIDER_INTERNAL: "The visual engine could not process this image. Try another photo.",
            MirraErrorCategory.SAFETY_BLOCKED: "This image could not be processed due to safety filters.",
            MirraErrorCategory.INVALID_INPUT: "Unable to process this image. Try another photo or product image.",
        }
        return messages[self.category()]

    def to_detail(self) -> dict[str, str]:
        """FastAPI-safe response detail."""
        return {
            "category": self.category().value,
            "code": self.error_code,
            "message": self.get_user_message(),
            "provider_message": self.error_message,
            "task_type": self.task_type,
        }


def _api_version(task_type: str) -> str:
    """Return the correct API version prefix for a task type."""
    return "v2.1" if task_type in V21_ENDPOINTS else "v2.0"


async def upload_image(task_type: str, image_bytes: bytes, client: httpx.AsyncClient) -> str:
    """Upload an image via the File API and return the file_id."""
    import logging
    logger = logging.getLogger(__name__)
    
    version = _api_version(task_type)
    file_res = await client.post(
        f"{BASE}/s2s/{version}/file/{task_type}",
        json={"files": [{"content_type": "image/jpeg", "file_name": "input.jpg", "file_size": len(image_bytes)}]},
        headers=HEADERS,
    )
    file_res.raise_for_status()
    file_data = file_res.json()["data"]["files"][0]

    # Upload to pre-signed S3 URL
    upload_req = file_data["requests"][0]
    await client.put(upload_req["url"], content=image_bytes, headers=upload_req.get("headers", {}))

    file_id = file_data["file_id"]
    logger.debug(f"Image uploaded for {task_type}, file_id: {file_id}")
    
    return file_id


def _build_analysis_task_payload(task_type: str, file_id: str, params: dict[str, Any]) -> dict[str, Any]:
    """Build task payload for analysis APIs (skin-analysis, skin-tone-analysis, face-attr-analysis)."""
    task_payload = {"src_file_id": file_id}
    
    # Add dst_actions for skin-analysis
    if task_type == "skin-analysis":
        dst_actions = params.get("dst_actions", [])
        if dst_actions:
            task_payload["dst_actions"] = dst_actions
    
    # Add features for face-attr-analysis
    if task_type == "face-attr-analysis":
        # Face attributes API uses camelCase feature names
        task_payload["features"] = [
            "faceShape", "age", "gender",
            "eyeShape", "eyeSize", "eyelid",
            "lipShape", "noseWidth", "noseLength"
        ]
    
    # Add other params (format, face_angle_strictness_level, etc.)
    for key, value in params.items():
        if key not in ["dst_actions", "features"]:  # Skip already handled params
            task_payload[key] = value
    
    return task_payload


def _build_vto_task_payload(file_id: str, params: dict[str, Any]) -> dict[str, Any]:
    """Build task payload for VTO tasks."""
    return {"src_file_id": file_id, **params}


async def _create_task(client: httpx.AsyncClient, task_type: str, task_payload: dict, version: str) -> str:
    """Create a task and return task_id."""
    import logging
    logger = logging.getLogger(__name__)
    
    task_res = await client.post(
        f"{BASE}/s2s/{version}/task/{task_type}",
        json=task_payload,
        headers=HEADERS,
    )
    
    # Handle HTTP errors with proper retry logic
    if task_res.status_code >= 400:
        logger.error(f"Perfect Corp API Error [{task_type}]: {task_res.status_code} - {task_res.text}")
        
        # 4xx errors are client errors (bad request, auth, etc.) - don't retry
        if 400 <= task_res.status_code < 500:
            raise PerfectCorpAPIError(
                f"http_{task_res.status_code}",
                task_res.text,
                task_type
            )
        # 5xx errors are server errors - can be retried
        else:
            task_res.raise_for_status()
    
    return task_res.json()["data"]["task_id"]


async def _poll_task_result(client: httpx.AsyncClient, task_type: str, task_id: str, version: str) -> dict:
    """Poll for task result until success or error."""
    import logging
    logger = logging.getLogger(__name__)
    
    for _ in range(30):
        await asyncio.sleep(2)
        poll = await client.get(
            f"{BASE}/s2s/{version}/task/{task_type}/{task_id}",
            headers=HEADERS,
        )
        poll.raise_for_status()
        data = poll.json()["data"]

        if data["task_status"] == "success":
            logger.debug(f"Task {task_type} completed successfully")
            return data
        if data["task_status"] == "error":
            error_code = data.get("error_code", "unknown")
            error_msg = data.get("error_message", str(data))
            logger.error(
                f"Perfect Corp API error [{task_type}]: {error_code} - {error_msg}"
            )
            
            # Raise specific exception with error code for better handling
            raise PerfectCorpAPIError(error_code, error_msg, task_type)

    raise TimeoutError(f"Task {task_id} timed out")


async def call_api(task_type: str, image_bytes: bytes, params: dict[str, Any] | None = None) -> dict:
    """Execute full Perfect Corp lifecycle: upload → task → poll → result.

    For VTO tasks that require a reference image, pass `ref_file_url` in params.
    For skin analysis, pass `dst_actions` and `format` in params.
    """
    params = params or {}
    version = _api_version(task_type)

    async with httpx.AsyncClient(timeout=60) as client:
        # Upload the selfie/source image
        file_id = await upload_image(task_type, image_bytes, client)

        # Build task payload based on API type
        if task_type in ["skin-analysis", "skin-tone-analysis", "face-attr-analysis", "skin-simulation"]:
            task_payload = _build_analysis_task_payload(task_type, file_id, params)
        else:
            task_payload = _build_vto_task_payload(file_id, params)

        # Create the task
        task_id = await _create_task(client, task_type, task_payload, version)

        # Poll for result
        return await _poll_task_result(client, task_type, task_id, version)


async def call_vto(
    task_type: str,
    selfie_bytes: bytes,
    ref_image_url: str,
    extra_params: dict[str, Any] | None = None,
) -> dict:
    """Convenience wrapper for VTO tasks that need selfie + reference image.

    - Uploads selfie as src_file_id
    - Passes ref_file_url directly (public URL of garment/accessory/hairstyle)
    """
    params = {"ref_file_url": ref_image_url, **(extra_params or {})}
    return await call_api(task_type, selfie_bytes, params)
