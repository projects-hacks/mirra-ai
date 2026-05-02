"""Selfie validation — ensures images meet Perfect Corp requirements."""
import io
from PIL import Image

from app.core.constants import MAX_IMAGE_SIZE_BYTES, MIN_IMAGE_DIMENSION


class ValidationError(Exception):
    pass


def validate(image_bytes: bytes) -> None:
    """Validate selfie meets Perfect Corp API requirements."""
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(f"Image exceeds {MAX_IMAGE_SIZE_BYTES // 1_000_000}MB limit")

    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        raise ValidationError("Invalid image format — JPEG or PNG required")

    w, h = img.size

    if min(w, h) < MIN_IMAGE_DIMENSION:
        raise ValidationError(f"Image too small ({w}x{h}) — minimum {MIN_IMAGE_DIMENSION}px")

    if h < w:
        raise ValidationError(f"Landscape orientation ({w}x{h}) — portrait required")
