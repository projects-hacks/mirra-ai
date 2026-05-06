"""Resolve product/page URLs into Perfect Corp-friendly image URLs."""
from __future__ import annotations

import json
import ipaddress
import re
import socket
from dataclasses import dataclass, field
from io import BytesIO
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from PIL import Image

from app.core import cache
from app.core.constants import CachePrefix
from app.core.config import settings
from app.services.supabase_client import supabase

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".heic")
SUPPORTED_OUTPUT_TYPES = {"image/jpeg", "image/png"}
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; MirraProductResolver/1.0)",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}
MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024
MAX_REDIRECTS = 5


class ProductImageResolverError(Exception):
    """Raised when a product URL cannot be converted into a VTO reference image."""

    def __init__(
        self,
        category: str,
        message: str,
        *,
        provider_message: str | None = None,
    ) -> None:
        self.category = category
        self.message = message
        self.provider_message = provider_message or message
        super().__init__(message)

    def to_detail(self) -> dict[str, str]:
        return {
            "category": self.category,
            "message": self.message,
            "provider_message": self.provider_message,
        }


@dataclass
class ResolvedProductImage:
    input_url: str
    resolved_image_url: str
    content_type: str
    width: int | None = None
    height: int | None = None
    source: str = "direct"
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "input_url": self.input_url,
            "resolved_image_url": self.resolved_image_url,
            "content_type": self.content_type,
            "width": self.width,
            "height": self.height,
            "source": self.source,
            "warnings": self.warnings,
        }


def _is_http_url(raw_url: str) -> bool:
    try:
        parsed = urlparse(raw_url.strip())
    except ValueError:
        return False
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _is_public_ip(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _validate_public_url(raw_url: str) -> str:
    try:
        parsed = urlparse(raw_url.strip())
    except ValueError as exc:
        raise ProductImageResolverError("product_page_url", "Use a valid product or image URL.") from exc

    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ProductImageResolverError("product_page_url", "Use a valid product or image URL.")

    hostname = parsed.hostname
    blocked_hosts = {"localhost", "metadata.google.internal"}
    if hostname.lower() in blocked_hosts or hostname.lower().endswith(".local"):
        raise ProductImageResolverError("invalid_input", "This product image host is not allowed.")

    try:
        ip = ipaddress.ip_address(hostname)
        if not _is_public_ip(str(ip)):
            raise ProductImageResolverError("invalid_input", "This product image host is not allowed.")
        return raw_url.strip()
    except ValueError:
        pass

    try:
        resolved = socket.getaddrinfo(hostname, parsed.port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ProductImageResolverError(
            "expired_image_url",
            "That image link expired or is blocked. Try another product image.",
            provider_message=str(exc),
        ) from exc

    if not resolved or any(not _is_public_ip(address[0]) for *_, address in resolved):
        raise ProductImageResolverError("invalid_input", "This product image host is not allowed.")

    return raw_url.strip()


def _looks_like_direct_image_url(raw_url: str) -> bool:
    try:
        parsed = urlparse(raw_url.strip())
    except ValueError:
        return False
    return parsed.path.lower().endswith(IMAGE_EXTENSIONS)


def _content_type(headers: httpx.Headers) -> str:
    return headers.get("content-type", "").split(";")[0].strip().lower()


def _response_bytes(response: httpx.Response) -> bytes:
    content_length = response.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_DOWNLOAD_BYTES:
                raise ProductImageResolverError(
                    "reference_rejected",
                    "The product image is larger than 10 MB.",
                )
        except ValueError:
            pass

    content = response.content
    if len(content) > MAX_DOWNLOAD_BYTES:
        raise ProductImageResolverError(
            "reference_rejected",
            "The product image is larger than 10 MB.",
        )
    return content


async def _get_public_url(client: httpx.AsyncClient, raw_url: str) -> httpx.Response:
    current_url = _validate_public_url(raw_url)
    for _ in range(MAX_REDIRECTS + 1):
        response = await client.get(current_url, follow_redirects=False)
        if response.is_redirect:
            location = response.headers.get("location")
            if not location:
                raise ProductImageResolverError(
                    "expired_image_url",
                    "That image link expired or is blocked. Try another product image.",
                    provider_message="Redirect without Location header",
                )
            current_url = _validate_public_url(urljoin(str(response.url), location))
            continue
        return response

    raise ProductImageResolverError(
        "expired_image_url",
        "That image link expired or is blocked. Try another product image.",
        provider_message="Too many redirects",
    )


def _image_dimensions(image_bytes: bytes) -> tuple[int | None, int | None]:
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            return image.size
    except Exception:
        return None, None


def _extract_meta_image(html: str, base_url: str) -> tuple[str | None, str]:
    patterns = [
        (r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', "og_image"),
        (r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', "og_image"),
        (r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', "twitter_image"),
        (r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']', "twitter_image"),
    ]
    for pattern, source in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            return urljoin(base_url, match.group(1).strip()), source

    for script_match in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        try:
            payload = json.loads(script_match.group(1).strip())
        except json.JSONDecodeError:
            continue

        candidates = payload if isinstance(payload, list) else [payload]
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            image = candidate.get("image")
            if isinstance(image, str):
                return urljoin(base_url, image), "json_ld"
            if isinstance(image, list) and image:
                first = image[0]
                if isinstance(first, str):
                    return urljoin(base_url, first), "json_ld"
                if isinstance(first, dict) and isinstance(first.get("url"), str):
                    return urljoin(base_url, first["url"]), "json_ld"

    img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html, flags=re.IGNORECASE)
    if img_match:
        return urljoin(base_url, img_match.group(1).strip()), "first_img"

    return None, "html"


async def _upload_normalized_image(
    image_bytes: bytes,
    *,
    content_type: str,
    input_url: str,
) -> tuple[str | None, str, int | None, int | None]:
    """Convert unsupported image types to JPEG and upload when Supabase storage is configured."""
    if content_type in SUPPORTED_OUTPUT_TYPES:
        width, height = _image_dimensions(image_bytes)
        return None, content_type, width, height

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            rgb_image = image.convert("RGB")
            output = BytesIO()
            rgb_image.save(output, format="JPEG", quality=90, optimize=True)
            normalized_bytes = output.getvalue()
            width, height = rgb_image.size
    except Exception as exc:
        raise ProductImageResolverError(
            "reference_rejected",
            "The product image format is not supported for try-on.",
            provider_message=str(exc),
        ) from exc

    if not supabase:
        return None, "image/jpeg", width, height

    parsed = urlparse(input_url)
    safe_name = re.sub(r"[^a-zA-Z0-9_-]+", "-", f"{parsed.netloc}{parsed.path}")[:96].strip("-")
    object_path = f"products/{safe_name or 'resolved'}.jpg"

    try:
        supabase.storage.from_(settings.PRODUCT_IMAGE_STORAGE_BUCKET).upload(
            object_path,
            normalized_bytes,
            {"content-type": "image/jpeg", "x-upsert": "true"},
        )
        public_url = supabase.storage.from_(settings.PRODUCT_IMAGE_STORAGE_BUCKET).get_public_url(object_path)
        return public_url, "image/jpeg", width, height
    except Exception:
        return None, "image/jpeg", width, height


async def resolve_product_image(raw_url: str) -> ResolvedProductImage:
    """Resolve a product page or image URL to a direct image URL."""
    input_url = _validate_public_url(raw_url)

    cache_key = f"{CachePrefix.PRODUCTS}:image:{cache.hash_json({'url': input_url})}"
    cached = await cache.get(cache_key)
    if cached:
        return ResolvedProductImage(**cached)

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(12.0, connect=5.0),
        follow_redirects=False,
        headers=REQUEST_HEADERS,
    ) as client:
        response = await _get_public_url(client, input_url)

        if response.status_code >= 400:
            raise ProductImageResolverError(
                "expired_image_url",
                "That image link expired or is blocked. Try another product image.",
                provider_message=f"HTTP {response.status_code}",
            )

        content_type = _content_type(response.headers)
        source = "direct" if _looks_like_direct_image_url(str(response.url)) else "content_type"
        resolved_url = str(response.url)
        image_bytes = _response_bytes(response)

        if content_type.startswith("text/html"):
            image_url, source = _extract_meta_image(response.text, str(response.url))
            if not image_url:
                raise ProductImageResolverError(
                    "product_page_url",
                    "This product page does not expose a usable product image.",
                )

            image_response = await _get_public_url(client, image_url)
            if image_response.status_code >= 400:
                raise ProductImageResolverError(
                    "expired_image_url",
                    "The product image from this page is blocked or expired.",
                    provider_message=f"HTTP {image_response.status_code}",
                )
            content_type = _content_type(image_response.headers)
            resolved_url = str(image_response.url)
            image_bytes = _response_bytes(image_response)

        if not content_type.startswith("image/"):
            raise ProductImageResolverError(
                "product_page_url",
                "This URL does not point to a usable product image.",
                provider_message=f"content-type={content_type or 'unknown'}",
            )

        uploaded_url, normalized_type, width, height = await _upload_normalized_image(
            image_bytes,
            content_type=content_type,
            input_url=resolved_url,
        )

        if content_type not in SUPPORTED_OUTPUT_TYPES and not uploaded_url:
            raise ProductImageResolverError(
                "reference_rejected",
                "This product image must be converted before try-on. Configure a public Supabase storage bucket or use a jpg/png image.",
                provider_message=f"content-type={content_type}",
            )

        warnings: list[str] = []
        final_url = uploaded_url or resolved_url
        if not _looks_like_direct_image_url(final_url):
            warnings.append("Resolved URL does not include a standard image extension; provider download may still reject it.")

        resolved = ResolvedProductImage(
            input_url=input_url,
            resolved_image_url=final_url,
            content_type=normalized_type,
            width=width,
            height=height,
            source=source,
            warnings=warnings,
        )
        await cache.set(cache_key, resolved.to_dict(), cache.TTL.PRODUCT_IMAGE)
        return resolved
