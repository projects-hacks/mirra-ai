"""Selfie/image validation — size cap, format decode, orientation.

Minimum pixel dimensions are enforced by Perfect Corp per API; we do not duplicate a floor here so small inputs reach the provider (or product resolver) and fail with their errors if unsupported.
"""
from __future__ import annotations

import io
from enum import StrEnum

from PIL import Image, ImageOps

from app.core.constants import MAX_IMAGE_SIZE_BYTES


class ValidationError(Exception):
    pass


class ImageOrientationPolicy(StrEnum):
    """How to handle width vs height after EXIF orientation."""

    STRICT_PORTRAIT = "strict_portrait"
    """Reject landscape (height < width)."""

    FACE_AUTO = "face_auto"
    """Apply EXIF orientation; if still landscape, rotate 90° (typical phone sideways selfie)."""

    ALLOW_LANDSCAPE = "allow_landscape"
    """Do not enforce portrait — use for full-body / clothes try-on."""


def _open_with_exif(image_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(image_bytes))
    return ImageOps.exif_transpose(img)


def prepare_image_bytes(image_bytes: bytes, policy: ImageOrientationPolicy) -> bytes:
    """Decode image, normalize orientation, optionally rotate for face APIs, return JPEG bytes."""
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(
            f"Image exceeds {MAX_IMAGE_SIZE_BYTES // 1_000_000}MB limit"
        )

    try:
        img = _open_with_exif(image_bytes)
    except Exception as exc:
        raise ValidationError("Invalid image format — JPEG or PNG required") from exc

    w, h = img.size

    if policy == ImageOrientationPolicy.FACE_AUTO:
        if h < w:
            img = img.transpose(Image.Transpose.ROTATE_90)
            w, h = img.size
    elif policy == ImageOrientationPolicy.STRICT_PORTRAIT:
        if h < w:
            raise ValidationError(
                f"Landscape orientation ({w}x{h}) — portrait required"
            )

    out = io.BytesIO()
    rgb = img.convert("RGB") if img.mode in ("RGBA", "P", "LA") else img
    if rgb.mode != "RGB":
        rgb = rgb.convert("RGB")
    rgb.save(out, format="JPEG", quality=92, optimize=True)
    result = out.getvalue()

    if len(result) > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(
            f"Image exceeds {MAX_IMAGE_SIZE_BYTES // 1_000_000}MB limit after processing"
        )

    return result


def validate(image_bytes: bytes) -> None:
    """Strict portrait check only (no rotation). Prefer :func:`prepare_image_bytes` for uploads."""
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise ValidationError(
            f"Image exceeds {MAX_IMAGE_SIZE_BYTES // 1_000_000}MB limit"
        )
    try:
        img = _open_with_exif(image_bytes)
    except Exception as exc:
        raise ValidationError("Invalid image format — JPEG or PNG required") from exc
    w, h = img.size
    if h < w:
        raise ValidationError(
            f"Landscape orientation ({w}x{h}) — portrait required"
        )
