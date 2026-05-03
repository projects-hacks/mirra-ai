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


def _api_version(task_type: str) -> str:
    """Return the correct API version prefix for a task type."""
    return "v2.1" if task_type in V21_ENDPOINTS else "v2.0"


async def upload_image(task_type: str, image_bytes: bytes, client: httpx.AsyncClient) -> str:
    """Upload an image via the File API and return the file_id."""
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

    return file_data["file_id"]


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

        # Build task payload
        task_payload: dict[str, Any] = {"src_file_id": file_id, **params}

        # Create the task
        task_res = await client.post(
            f"{BASE}/s2s/{version}/task/{task_type}",
            json=task_payload,
            headers=HEADERS,
        )
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
                return data
            if data["task_status"] == "error":
                import logging
                logging.getLogger(__name__).error(f"Perfect Corp API error response: {data}")
                raise Exception(f"Perfect Corp error: {data.get('error', data)}")  

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
