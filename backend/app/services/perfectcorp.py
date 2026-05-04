"""Perfect Corp API client — async upload → task → poll → result."""
import asyncio
from typing import Any

import httpx

from app.core.config import settings
from app.core.mock_interceptor import should_mock, get_mock

BASE = settings.PERFECT_CORP_BASE_URL
HEADERS = {"Authorization": f"Bearer {settings.PERFECT_CORP_API_KEY}"}

# Endpoints that use v2.1 instead of v2.0
V21_ENDPOINTS = {"hair-transfer"}


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
    
    def get_user_message(self) -> str:
        """Get user-friendly error message."""
        error_messages = {
            "error_face_angle": "Please face the camera directly and keep your head straight.",
            "error_src_face_too_small": "Please move closer to the camera so your face fills more of the frame.",
            "error_face_position_invalid": "Please center your face in the frame and ensure it's fully visible.",
            "error_lighting_dark": "Please move to a better-lit area for clearer analysis.",
            "error_below_min_image_size": "Image quality is too low. Please use a higher resolution camera.",
        }
        
        for key, message in error_messages.items():
            if key in self.error_code:
                return message
        
        return "Unable to analyze image. Please try taking another photo."


def _api_version(task_type: str) -> str:
    """Return the correct API version prefix for a task type."""
    return "v2.1" if task_type in V21_ENDPOINTS else "v2.0"


async def upload_image(task_type: str, image_bytes: bytes, client: httpx.AsyncClient) -> str:
    """Upload an image via the File API and return the file_id."""
    import logging
    logger = logging.getLogger(__name__)
    
    version = _api_version(task_type)
    # For nested paths like "2d-vto/earring", the file endpoint uses the base path
    file_path = task_type.split("/")[0] if "/" in task_type else task_type
    
    file_res = await client.post(
        f"{BASE}/s2s/{version}/file/{file_path}",
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


async def call_api(task_type: str, image_bytes: bytes, params: dict[str, Any] | None = None) -> dict:
    """Execute full Perfect Corp lifecycle: upload → task → poll → result.

    For VTO tasks that require a reference image, pass `ref_file_url` in params.
    For skin analysis, pass `dst_actions` and `format` in params.
    """
    if should_mock():
        return get_mock(task_type)

    params = params or {}
    version = _api_version(task_type)

    async with httpx.AsyncClient(timeout=60) as client:
        # Upload the selfie/source image
        file_id = await upload_image(task_type, image_bytes, client)

        # Build task payload based on API type
        if task_type in ["skin-analysis", "skin-tone-analysis", "face-attr-analysis"]:
            # Analysis APIs use simpler format with src_file_id at root level
            task_payload = {
                "src_file_id": file_id
            }
            
            # Add dst_actions for skin-analysis
            if task_type == "skin-analysis":
                dst_actions = params.pop("dst_actions", [])
                if dst_actions:
                    task_payload["dst_actions"] = dst_actions
            
            # Add features for face-attr-analysis
            if task_type == "face-attr-analysis":
                # Face attributes API might need features parameter
                task_payload["features"] = ["faceshape", "agegender", "facialratio", "eyes", "lips", "nose"]
        else:
            # VTO tasks use simpler format
            task_payload: dict[str, Any] = {"src_file_id": file_id, **params}

        # Create the task
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
        task_id = task_res.json()["data"]["task_id"]

        # Poll for result
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
                import logging
                error_code = data.get("error_code", "unknown")
                error_msg = data.get("error_message", str(data))
                logging.getLogger(__name__).error(
                    f"Perfect Corp API error [{task_type}]: {error_code} - {error_msg}"
                )
                
                # Raise specific exception with error code for better handling
                raise PerfectCorpAPIError(error_code, error_msg, task_type)

        raise TimeoutError(f"Task {task_id} timed out")


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
