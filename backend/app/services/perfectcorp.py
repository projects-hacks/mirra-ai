"""Perfect Corp API client — async upload → task → poll → result."""
import asyncio
from typing import Any

import httpx

from app.core.config import settings
from app.core.mock_interceptor import should_mock, get_mock

BASE = settings.PERFECT_CORP_BASE_URL
HEADERS = {"Authorization": f"Bearer {settings.PERFECT_CORP_API_KEY}"}


async def call_api(task_type: str, image_bytes: bytes, params: dict[str, Any] | None = None) -> dict:
    """Execute full Perfect Corp lifecycle: upload → task → poll → result."""
    if should_mock():
        return get_mock(task_type)

    params = params or {}
    async with httpx.AsyncClient(timeout=60) as client:
        file_res = await client.post(
            f"{BASE}/s2s/v2.0/file/{task_type}",
            json={"files": [{"content_type": "image/png", "file_name": "input.png", "file_size": len(image_bytes)}]},
            headers=HEADERS,
        )
        file_res.raise_for_status()
        file_data = file_res.json()["data"]["files"][0]

        await client.put(file_data["requests"][0]["url"], content=image_bytes, headers=file_data["requests"][0]["headers"])

        task_res = await client.post(f"{BASE}/s2s/v2.0/task/{task_type}", json={"src_file_id": file_data["file_id"], **params}, headers=HEADERS)
        task_res.raise_for_status()
        task_id = task_res.json()["data"]["task_id"]

        for _ in range(30):
            await asyncio.sleep(2)
            poll = await client.get(f"{BASE}/s2s/v2.0/task/{task_type}/{task_id}", headers=HEADERS)
            poll.raise_for_status()
            data = poll.json()["data"]
            if data["task_status"] == "success":
                return data
            if data["task_status"] == "error":
                raise Exception(f"Perfect Corp error: {data.get('error', 'Unknown')}")

        raise TimeoutError(f"Task {task_id} timed out")
