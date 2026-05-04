"""Closet router — CRUD for user's closet items via Supabase."""
import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.services.supabase_client import supabase
from app.services.ai_metadata_extractor import get_extractor, AIMetadataExtractorError
from app.models.closet import ExtractedMetadata

logger = logging.getLogger(__name__)

router = APIRouter()


class ClosetItemCreate(BaseModel):
    user_id: str
    name: str
    category: str
    color: str | None = None
    brand: str | None = None
    image: str | None = None  # base64
    occasions: list[str] = []


class ClosetItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    subcategory: str | None = None
    color: str | None = None
    color_hex: str | None = None
    brand: str | None = None
    price: float | None = None
    purchase_date: str | None = None
    occasions: list[str] | None = None
    seasons: list[str] | None = None
    formality: float | None = None
    notes: str | None = None
    is_favorite: bool | None = None
    is_archived: bool | None = None


class ExtractMetadataRequest(BaseModel):
    image_url: HttpUrl
    user_context: Optional[Dict[str, Any]] = None


class ExtractMetadataResponse(BaseModel):
    metadata: ExtractedMetadata
    success: bool = True


class ErrorResponse(BaseModel):
    error_code: str
    error_message: str
    success: bool = False


@router.get("/")
async def get_closet(user_id: str):
    result = supabase.table("closet_items").select("*").eq("user_id", user_id).execute()
    return {"items": result.data}


@router.post("/")
async def add_item(item: ClosetItemCreate):
    result = supabase.table("closet_items").insert(item.model_dump(exclude={"image"})).execute()
    return result.data[0] if result.data else {"error": "Failed to create"}


@router.patch("/batch")
async def batch_update_items(
    item_ids: list[str],
    action: str,
    value: bool | None = None
):
    """
    Perform batch operations on multiple closet items.
    
    Args:
        item_ids: List of item IDs to update
        action: Action to perform (archive, unarchive, favorite, unfavorite, delete)
        value: Optional value for the action (for favorite/archive)
        
    Returns:
        Updated items or deletion confirmation
    """
    if not item_ids:
        raise HTTPException(status_code=400, detail="No item IDs provided")
    
    try:
        if action == "delete":
            # Delete all items
            supabase.table("closet_items").delete().in_("id", item_ids).execute()
            return {"deleted": True, "count": len(item_ids)}
        
        # Determine update data based on action
        update_data = {}
        if action == "archive":
            update_data = {"is_archived": True}
        elif action == "unarchive":
            update_data = {"is_archived": False}
        elif action == "favorite":
            update_data = {"is_favorite": True}
        elif action == "unfavorite":
            update_data = {"is_favorite": False}
        else:
            raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
        
        # Update all items
        result = supabase.table("closet_items").update(update_data).in_("id", item_ids).execute()
        
        return {"updated": True, "count": len(result.data), "items": result.data}
        
    except Exception as e:
        logger.error(f"Error performing batch operation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    supabase.table("closet_items").delete().eq("id", item_id).execute()
    return {"deleted": True}


@router.patch("/{item_id}")
async def update_item(item_id: str, item: ClosetItemUpdate):
    """
    Update a closet item.
    
    Args:
        item_id: The ID of the item to update
        item: The fields to update
        
    Returns:
        The updated item
    """
    # Filter out None values
    update_data = {k: v for k, v in item.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = supabase.table("closet_items").update(update_data).eq("id", item_id).execute()
    
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
        logger.info(f"Extracting metadata from image: {request.image_url}")
        
        # Get the AI metadata extractor service
        extractor = get_extractor()
        
        # Extract metadata from the image
        metadata = await extractor.extract_metadata(
            image_url=str(request.image_url),
            user_context=request.user_context
        )
        
        logger.info(f"Successfully extracted metadata: category={metadata.category}, color={metadata.primary_color}")
        
        return ExtractMetadataResponse(
            metadata=metadata,
            success=True
        )
        
    except AIMetadataExtractorError as e:
        logger.error(f"AI metadata extraction error: {e.error_code} - {e.error_message}")
        
        # Map error codes to HTTP status codes
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
        
        # Determine status code based on error code
        status_code = 500  # default
        for error_prefix, code in status_code_map.items():
            if e.error_code.startswith(error_prefix):
                status_code = code
                break
        
        raise HTTPException(
            status_code=status_code,
            detail={
                "error_code": e.error_code,
                "error_message": e.error_message,
                "success": False
            }
        )
        
    except Exception as e:
        logger.error(f"Unexpected error during metadata extraction: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "unexpected_error",
                "error_message": str(e),
                "success": False
            }
        )
