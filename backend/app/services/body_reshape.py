"""Body Reshape API client for full-body analysis and virtual try-on."""
import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.services.perfectcorp import PerfectCorpAPIError

logger = logging.getLogger(__name__)

BASE = settings.PERFECT_CORP_BASE_URL
HEADERS = {"Authorization": f"Bearer {settings.PERFECT_CORP_API_KEY}"}


async def preprocess_body(image_bytes: bytes, client: httpx.AsyncClient) -> dict:
    """Pre-process body image to detect bounding boxes.
    
    Args:
        image_bytes: Full-body image bytes
        client: HTTP client
        
    Returns:
        Pre-process result with body bounding boxes
        
    Raises:
        PerfectCorpAPIError: If pre-processing fails
    """
    # Upload image
    file_res = await client.post(
        f"{BASE}/s2s/v2.0/file/body-reshape",
        json={
            "files": [
                {
                    "content_type": "image/jpeg",
                    "file_name": "body.jpg",
                    "file_size": len(image_bytes),
                }
            ]
        },
        headers=HEADERS,
    )
    file_res.raise_for_status()
    file_data = file_res.json()["data"]["files"][0]

    # Upload to S3
    upload_req = file_data["requests"][0]
    await client.put(upload_req["url"], content=image_bytes, headers=upload_req.get("headers", {}))

    file_id = file_data["file_id"]

    # Pre-process
    preprocess_res = await client.post(
        f"{BASE}/s2s/v2.0/task/body-reshape/pre-process",
        json={"src_file_id": file_id},
        headers=HEADERS,
    )
    preprocess_res.raise_for_status()
    task_id = preprocess_res.json()["data"]["task_id"]

    # Poll for result
    for _ in range(30):
        await asyncio.sleep(2)
        poll = await client.get(
            f"{BASE}/s2s/v2.0/task/body-reshape/pre-process/{task_id}",
            headers=HEADERS,
        )
        poll.raise_for_status()
        data = poll.json()["data"]

        if data["task_status"] == "success":
            return data
        if data["task_status"] == "error":
            error_code = data.get("error_code", "unknown")
            error_msg = data.get("error_message", str(data))
            logger.error(f"Body pre-process error - Code: {error_code}, Message: {error_msg}")
            raise PerfectCorpAPIError(error_code, error_msg, "body-reshape-preprocess")

    raise TimeoutError(f"Body pre-process task {task_id} timed out")


async def analyze_body(image_bytes: bytes) -> dict:
    """Analyze full-body image to extract body measurements and proportions.
    
    This is useful for:
    - Virtual try-on of full-body garments
    - Body shape analysis
    - Size recommendations
    
    Args:
        image_bytes: Full-body image bytes (JPEG/PNG < 10MB)
        
    Returns:
        Dict with body analysis results including:
        - body_bounding_box: Detected body region
        - skeleton: Body pose keypoints
        - body_parts: Individual body part regions (torso, arms, legs)
        
    Raises:
        PerfectCorpAPIError: If analysis fails with specific error codes:
            - error_pose: Pose estimation failed
            - PHOTO_CHECK_INVALID: Invalid pose or size
            - PHOTO_DETECTION_FAIL: Missing body parts
    """
    async with httpx.AsyncClient(timeout=60) as client:
        # Pre-process to detect body
        result = await preprocess_body(image_bytes, client)
        
        logger.info("Body analysis complete")
        return result


async def reshape_body(
    image_bytes: bytes,
    effect_template: dict[str, int],
) -> dict:
    """Apply body reshape effects to full-body image.
    
    Effect template keys (all values are -100 to 100):
    - waist: Adjust waist size (-100 = thinner, 100 = wider)
    - taller: Adjust height (-100 = shorter, 100 = taller)
    - shoulder: Adjust shoulder width
    - leg: Adjust leg length
    - arm: Adjust arm thickness
    - hip: Adjust hip size
    
    Args:
        image_bytes: Full-body image bytes
        effect_template: Dict of body part adjustments
        
    Returns:
        Dict with reshaped image URL
        
    Raises:
        PerfectCorpAPIError: If reshape fails
    """
    async with httpx.AsyncClient(timeout=60) as client:
        # Pre-process first
        preprocess_result = await preprocess_body(image_bytes, client)
        
        # Get file_id from pre-process result
        file_id = preprocess_result.get("src_file_id")
        if not file_id:
            raise ValueError("No file_id in pre-process result")

        # Create reshape task
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/body-reshape",
            json={
                "src_file_id": file_id,
                "effect_template": effect_template,
            },
            headers=HEADERS,
        )
        task_res.raise_for_status()
        task_id = task_res.json()["data"]["task_id"]

        # Poll for result
        for _ in range(30):
            await asyncio.sleep(2)
            poll = await client.get(
                f"{BASE}/s2s/v2.0/task/body-reshape/{task_id}",
                headers=HEADERS,
            )
            poll.raise_for_status()
            data = poll.json()["data"]

            if data["task_status"] == "success":
                return data
            if data["task_status"] == "error":
                error_code = data.get("error_code", "unknown")
                error_msg = data.get("error_message", str(data))
                logger.error(f"Body reshape error - Code: {error_code}, Message: {error_msg}")
                raise PerfectCorpAPIError(error_code, error_msg, "body-reshape")

        raise TimeoutError(f"Body reshape task {task_id} timed out")


def get_body_error_message(error_code: str) -> str:
    """Get user-friendly error message for body analysis errors.
    
    Args:
        error_code: Error code from Perfect Corp API
        
    Returns:
        User-friendly error message
    """
    error_messages = {
        "error_pose": "Unable to detect your pose. Please stand straight with arms and legs visible.",
        "PHOTO_CHECK_INVALID": "Invalid pose or body size. Please ensure your full body is visible and you're standing straight.",
        "PHOTO_DETECTION_FAIL": "Some body parts are not visible. Please ensure your hands, feet, and shoulders are in the frame.",
        "error_below_min_image_size": "Image resolution is too low. Please use a higher resolution camera.",
    }
    
    for key, message in error_messages.items():
        if key in error_code:
            return message
    
    return "Unable to analyze body. Please try taking another photo with your full body visible."
