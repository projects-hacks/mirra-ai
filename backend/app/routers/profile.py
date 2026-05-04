"""Profile management endpoints."""
import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter()


class ProfileUpdateRequest(BaseModel):
    """Request model for profile updates."""
    user_id: str
    location: str | None = None
    timezone: str | None = None


@router.patch("/update")
async def update_profile(request: ProfileUpdateRequest):
    """Update user profile fields.
    
    Args:
        request: ProfileUpdateRequest with user_id and optional fields
        
    Returns:
        Updated profile data
        
    Raises:
        HTTPException: 404 if user not found, 500 for other errors
    """
    try:
        update_data = {}
        if request.location:
            update_data["location"] = request.location
        if request.timezone:
            update_data["timezone"] = request.timezone
        
        if not update_data:
            raise ValueError("No fields to update")
        
        logger.info(f"Updating profile for user {request.user_id}: {update_data}")
        
        response = supabase.from_("profiles").update(update_data).eq("id", request.user_id).execute()
        
        if not response.data:
            raise ValueError(f"Profile not found for user {request.user_id}")
        
        logger.info(f"Profile updated successfully for user {request.user_id}")
        
        return {"success": True, "profile": response.data[0]}
        
    except ValueError as e:
        logger.error(f"Profile update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Profile update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )
