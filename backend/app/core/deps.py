"""Shared FastAPI dependency helpers."""
from __future__ import annotations

from fastapi import HTTPException, Request, UploadFile

from app.core.validation import ImageOrientationPolicy, ValidationError, prepare_image_bytes


def require_auth_user_id(request: Request) -> str:
    """Return the verified Supabase user id from JWT middleware, or 401."""
    uid = getattr(request.state, "user_id", None)
    if not uid or uid == "anonymous":
        raise HTTPException(status_code=401, detail="Authentication required")
    return uid


async def read_image(
    upload: UploadFile,
    label: str = "Selfie image",
    *,
    orientation: ImageOrientationPolicy = ImageOrientationPolicy.FACE_AUTO,
) -> bytes:
    """Read an upload, normalize EXIF/orientation, and return JPEG bytes for the VTO pipeline."""
    image_bytes = await upload.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail=f"{label} is required")
    try:
        return prepare_image_bytes(image_bytes, orientation)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def resolve_user_id(request: Request, user_id: str | None) -> str | None:
    """Prefer explicit user_id, otherwise use auth middleware state."""
    return user_id or getattr(request.state, "user_id", None)
