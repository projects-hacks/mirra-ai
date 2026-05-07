"""Closet router — CRUD for user's closet items via Supabase."""
import logging
from typing import Any, Optional, Dict

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field, HttpUrl, AliasChoices

from app.core.deps import require_auth_user_id, resolve_user_id
from app.services.supabase_client import supabase
from app.services.ai_metadata_extractor import get_extractor, AIMetadataExtractorError
from app.models.closet import ExtractedMetadata

logger = logging.getLogger(__name__)

router = APIRouter(redirect_slashes=False)


def _assert_all_items_owned(user_id: str, item_ids: list[str]) -> None:
    if not item_ids:
        raise HTTPException(status_code=400, detail="No item IDs provided")
    unique_ids = list(dict.fromkeys(item_ids))
    res = (
        supabase.table("closet_items")
        .select("id")
        .eq("user_id", user_id)
        .in_("id", unique_ids)
        .execute()
    )
    found = {row["id"] for row in (res.data or [])}
    if len(found) != len(unique_ids):
        raise HTTPException(
            status_code=404,
            detail="One or more items were not found or do not belong to this user",
        )


class ClosetItemCreate(BaseModel):
    """Payload for creating a closet row. user_id from the client is ignored when JWT is present."""

    user_id: str | None = Field(
        default=None,
        description="Deprecated; ignored — owner is taken from the authenticated session",
    )
    name: str
    category: str
    subcategory: str | None = None
    color: str | None = None
    color_hex: str | None = None
    brand: str | None = None
    price: float | None = None
    purchase_date: str | None = None
    image_url: str | None = None
    image: str | None = None  # legacy base64 field — not persisted
    occasions: list[str] = Field(default_factory=list)
    seasons: list[str] = Field(default_factory=list)
    formality: float | None = None
    notes: str | None = None
    material: str | None = None
    pattern: str | None = None


class ClosetItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    subcategory: str | None = None
    color: str | None = None
    color_hex: str | None = None
    brand: str | None = None
    price: float | None = None
    purchase_date: str | None = None
    image_url: str | None = None
    occasions: list[str] | None = None
    seasons: list[str] | None = None
    formality: float | None = None
    notes: str | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None


class ClosetBatchRequest(BaseModel):
    item_ids: list[str]
    action: str


class ExtractMetadataRequest(BaseModel):
    image_url: HttpUrl = Field(validation_alias=AliasChoices("image_url", "imageUrl"))
    user_context: Optional[Dict[str, Any]] = None


class ExtractMetadataResponse(BaseModel):
    metadata: ExtractedMetadata
    success: bool = True


def _merge_material_pattern_notes(item: ClosetItemCreate) -> str | None:
    notes = (item.notes or "").strip()
    extras: list[str] = []
    if item.material and item.material.strip():
        extras.append(f"Material: {item.material.strip()}")
    if item.pattern and item.pattern.strip():
        extras.append(f"Pattern: {item.pattern.strip()}")
    if not extras:
        return notes or None
    block = "\n".join(extras)
    if notes:
        return f"{notes}\n{block}"
    return block


@router.get("")
async def get_closet(request: Request, user_id: str | None = Query(None)):
    auth_uid = require_auth_user_id(request)
    resolved = resolve_user_id(request, user_id)
    if resolved and resolved != auth_uid:
        raise HTTPException(status_code=403, detail="Cannot access another user's closet")
    owner = auth_uid
    result = supabase.table("closet_items").select("*").eq("user_id", owner).execute()
    return {"items": result.data or []}


@router.post("")
async def add_item(request: Request, item: ClosetItemCreate):
    auth_uid = require_auth_user_id(request)
    if item.user_id and item.user_id != auth_uid:
        raise HTTPException(status_code=403, detail="user_id does not match authenticated user")

    row = item.model_dump(
        exclude={"user_id", "image", "material", "pattern"},
        exclude_none=True,
    )
    merged_notes = _merge_material_pattern_notes(item)
    if merged_notes is not None:
        row["notes"] = merged_notes
    row["user_id"] = auth_uid

    result = supabase.table("closet_items").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create closet item")
    return result.data[0]


@router.patch("/batch")
async def batch_update_items(request: Request, body: ClosetBatchRequest):
    auth_uid = require_auth_user_id(request)
    item_ids = body.item_ids
    action = body.action.strip().lower()

    _assert_all_items_owned(auth_uid, item_ids)

    try:
        if action == "delete":
            supabase.table("closet_items").delete().eq("user_id", auth_uid).in_("id", item_ids).execute()
            return {"deleted": True, "count": len(item_ids)}

        update_data: dict[str, Any] = {}
        if action == "archive":
            update_data = {"is_archived": True}
        elif action == "unarchive":
            update_data = {"is_archived": False}
        elif action == "favorite":
            update_data = {"is_favorite": True}
        elif action == "unfavorite":
            update_data = {"is_favorite": False}
        else:
            raise HTTPException(status_code=400, detail=f"Invalid action: {body.action}")

        result = (
            supabase.table("closet_items")
            .update(update_data)
            .eq("user_id", auth_uid)
            .in_("id", item_ids)
            .execute()
        )

        return {"updated": True, "count": len(result.data or []), "items": result.data or []}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error performing batch operation: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/{item_id}")
async def delete_item(request: Request, item_id: str):
    auth_uid = require_auth_user_id(request)
    existing = (
        supabase.table("closet_items")
        .select("id")
        .eq("user_id", auth_uid)
        .eq("id", item_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Item not found")
    supabase.table("closet_items").delete().eq("user_id", auth_uid).eq("id", item_id).execute()
    return {"deleted": True}


@router.patch("/{item_id}")
async def update_item(request: Request, item_id: str, item: ClosetItemUpdate):
    auth_uid = require_auth_user_id(request)
    update_data = {k: v for k, v in item.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("closet_items")
        .update(update_data)
        .eq("user_id", auth_uid)
        .eq("id", item_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Item not found")

    return result.data[0]


@router.post("/extract-metadata", response_model=ExtractMetadataResponse)
async def extract_metadata(request: ExtractMetadataRequest):
    """
    Extract metadata from a closet item image using AI vision.

    This endpoint analyzes an uploaded closet item image and extracts structured
    metadata including category, color, brand, occasions, and more using Gemini Vision API.

    Args:
        request: Contains image_url (required) and optional user_context

    Returns:
        ExtractMetadataResponse with extracted metadata and confidence scores

    Raises:
        HTTPException:
            - 400: Invalid image or extraction failed
            - 408: Request timeout
            - 429: Rate limit exceeded
            - 500: Server error
            - 503: Service unavailable
    """
    try:
        logger.info("Extracting metadata from image: %s", request.image_url)

        extractor = get_extractor()

        metadata = await extractor.extract_metadata(
            image_url=str(request.image_url),
            user_context=request.user_context,
        )

        logger.info(
            "Successfully extracted metadata: category=%s, color=%s",
            metadata.category,
            metadata.primary_color,
        )

        return ExtractMetadataResponse(
            metadata=metadata,
            success=True,
        )

    except AIMetadataExtractorError as e:
        logger.error("AI metadata extraction error: %s - %s", e.error_code, e.error_message)

        status_code_map = {
            "timeout": 408,
            "rate_limit": 429,
            "download_error": 400,
            "network_error": 503,
            "server_error": 503,
            "api_error_400": 400,
            "api_error_401": 401,
            "api_error_403": 403,
            "api_error_404": 404,
            "parse_error": 500,
            "json_parse_error": 500,
            "validation_error": 400,
            "unexpected_error": 500,
        }

        status_code = 500
        for error_prefix, code in status_code_map.items():
            if e.error_code.startswith(error_prefix):
                status_code = code
                break

        raise HTTPException(
            status_code=status_code,
            detail={
                "error_code": e.error_code,
                "error_message": e.error_message,
                "success": False,
            },
        ) from e

    except Exception as e:
        logger.error("Unexpected error during metadata extraction: %s", e)
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "unexpected_error",
                "error_message": str(e),
                "success": False,
            },
        ) from e
