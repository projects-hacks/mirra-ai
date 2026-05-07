"""Gemini on Vertex AI only — Publisher model :generateContent via OAuth2 (ADC / service account)."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.core.llm_config import GEMINI_MODEL_NAME, GEMINI_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

# Region for publishers/google models (not configurable — keeps env surface tiny).
# REST shape matches Cloud docs: POST https://aiplatform.googleapis.com/v1/projects/.../locations/.../publishers/google/models/{model}:generateContent
VERTEX_PUBLISHER_LOCATION = "us-central1"
VERTEX_API_HOST = "https://aiplatform.googleapis.com"


def _vertex_credentials_sync():
    """Credentials for Vertex (service-account JSON in env, key file, or gcloud ADC)."""
    import base64
    import json

    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    raw = (settings.GCP_SERVICE_ACCOUNT_JSON or "").strip()
    if raw:
        if raw.lstrip().startswith("{"):
            info = json.loads(raw)
        else:
            info = json.loads(base64.b64decode(raw).decode("utf-8"))
        return service_account.Credentials.from_service_account_info(
            info,
            scopes=("https://www.googleapis.com/auth/cloud-platform",),
        )

    import google.auth

    credentials, _ = google.auth.default(
        scopes=("https://www.googleapis.com/auth/cloud-platform",),
    )
    return credentials


def vertex_bearer_token_sync() -> str:
    """Short-lived access token."""
    from google.auth.transport.requests import Request

    credentials = _vertex_credentials_sync()
    credentials.refresh(Request())
    if not credentials.token:
        raise RuntimeError("Vertex: failed to refresh access token (empty token)")
    return credentials.token


def gemini_configured() -> bool:
    return bool((settings.GCP_PROJECT_ID or "").strip())


async def gemini_generate_content(
    client: httpx.AsyncClient,
    payload: dict[str, Any],
) -> httpx.Response:
    project = (settings.GCP_PROJECT_ID or "").strip()
    if not project:
        raise ValueError(
            "Set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT for Vertex Gemini (and ADC credentials)."
        )
    token = await asyncio.to_thread(vertex_bearer_token_sync)
    url = (
        f"{VERTEX_API_HOST}/v1/projects/{project}"
        f"/locations/{VERTEX_PUBLISHER_LOCATION}/publishers/google/models/{GEMINI_MODEL_NAME}:generateContent"
    )
    logger.debug(
        "Vertex generateContent (project=%s, location=%s, model=%s)",
        project,
        VERTEX_PUBLISHER_LOCATION,
        GEMINI_MODEL_NAME,
    )
    return await client.post(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
    )


__all__ = ["GEMINI_TIMEOUT_SECONDS", "gemini_configured", "gemini_generate_content", "vertex_bearer_token_sync"]
