"""Outfit History router — tracking outfit outcomes and feedback."""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter()


class UpdateOutcomeRequest(BaseModel):
    """Request model for updating outfit outcome."""
    outcome: str = Field(..., description="Outcome: wore, skipped, returned, or loved")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1-5 stars")
    feedback: Optional[str] = Field(None, description="User feedback text")
    compliments: Optional[bool] = Field(None, description="Whether user received compliments")
    photos: Optional[List[str]] = Field(None, description="URLs of user-uploaded outfit photos")


class UpdateOutcomeResponse(BaseModel):
    """Response model for outcome update."""
    success: bool
    outfit_log_id: str
    message: str
    items_updated: int


@router.patch("/{log_id}/outcome", response_model=UpdateOutcomeResponse)
async def update_outfit_outcome(log_id: str, request: UpdateOutcomeRequest):
    """
    Update the outcome of an outfit log.
    
    This endpoint:
    1. Updates the outfit_log record with outcome, rating, feedback, compliments, photos
    2. If outcome is 'wore' or 'loved', increments times_worn for each item
    3. Updates last_worn timestamp for each item
    4. Triggers style_profile recalculation (future enhancement)
    
    Args:
        log_id: Outfit log ID
        request: Contains outcome, rating, feedback, compliments, photos
        
    Returns:
        UpdateOutcomeResponse with success status and count of items updated
        
    Raises:
        HTTPException: 
            - 400: Invalid outcome value
            - 404: Outfit log not found
            - 500: Database error
    """
    try:
        # Validate outcome
        valid_outcomes = ['wore', 'skipped', 'returned', 'loved']
        if request.outcome not in valid_outcomes:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid outcome. Must be one of: {', '.join(valid_outcomes)}"
            )
        
        logger.info(f"Updating outcome for outfit log {log_id} to {request.outcome}")
        
        # Fetch the outfit log
        outfit_log_result = supabase.table("outfit_logs").select("*").eq("id", log_id).execute()
        
        if not outfit_log_result.data:
            logger.error(f"Outfit log {log_id} not found")
            raise HTTPException(
                status_code=404,
                detail=f"Outfit log {log_id} not found"
            )
        
        outfit_log = outfit_log_result.data[0]
        user_id = outfit_log["user_id"]
        
        # Update outfit log with new outcome data
        update_data = {
            "outcome": request.outcome,
        }
        
        if request.rating is not None:
            update_data["rating"] = request.rating
        
        if request.feedback is not None:
            update_data["feedback"] = request.feedback
        
        if request.compliments is not None:
            update_data["compliments"] = request.compliments
        
        if request.photos is not None:
            update_data["photos"] = request.photos
        
        supabase.table("outfit_logs").update(update_data).eq("id", log_id).execute()
        
        logger.info(f"Updated outfit log {log_id} with outcome {request.outcome}")
        
        # If outcome is 'wore' or 'loved', increment times_worn and update last_worn
        items_updated = 0
        if request.outcome in ['wore', 'loved']:
            items = outfit_log.get("items", [])
            
            for item in items:
                item_id = item.get("id")
                
                # Only update items that are in the user's closet (have an id)
                if item_id:
                    try:
                        # Fetch current item data
                        item_result = supabase.table("closet_items").select("times_worn").eq("id", item_id).eq("user_id", user_id).execute()
                        
                        if item_result.data:
                            current_times_worn = item_result.data[0].get("times_worn", 0)
                            new_times_worn = current_times_worn + 1
                            
                            # Update times_worn and last_worn
                            supabase.table("closet_items").update({
                                "times_worn": new_times_worn,
                                "last_worn": datetime.utcnow().isoformat()
                            }).eq("id", item_id).eq("user_id", user_id).execute()
                            
                            items_updated += 1
                            logger.info(f"Updated item {item_id}: times_worn={new_times_worn}")
                    except Exception as e:
                        logger.error(f"Error updating item {item_id}: {e}")
                        # Continue with other items even if one fails
        
        logger.info(f"Updated {items_updated} closet items for outfit log {log_id}")
        
        # TODO: Trigger style_profile recalculation (future enhancement)
        
        return UpdateOutcomeResponse(
            success=True,
            outfit_log_id=log_id,
            message=f"Outfit outcome updated to '{request.outcome}' successfully",
            items_updated=items_updated
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating outfit outcome: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/", response_model=Dict[str, Any])
async def get_outfit_history(
    user_id: str,
    outcome: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Get outfit history for a user.
    
    Args:
        user_id: User ID
        outcome: Optional filter for outcome (wore, skipped, returned, loved)
        start_date: Optional start date filter (ISO format)
        end_date: Optional end date filter (ISO format)
        
    Returns:
        Dictionary with outfit_logs array
    """
    try:
        query = supabase.table("outfit_logs").select("*").eq("user_id", user_id).order("created_at", desc=True)
        
        if outcome:
            query = query.eq("outcome", outcome)
        
        if start_date:
            query = query.gte("created_at", start_date)
        
        if end_date:
            query = query.lte("created_at", end_date)
        
        result = query.execute()
        
        return {"outfit_logs": result.data}
        
    except Exception as e:
        logger.error(f"Error fetching outfit history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching outfit history: {str(e)}"
        )


@router.get("/summary", response_model=Dict[str, Any])
async def get_outfit_summary(user_id: str):
    """
    Get outfit outcome summary statistics for a user.
    
    Args:
        user_id: User ID
        
    Returns:
        Dictionary with counts for each outcome type
    """
    try:
        # Fetch all outfit logs for the user
        result = supabase.table("outfit_logs").select("outcome").eq("user_id", user_id).execute()
        
        # Count outcomes
        outcome_counts = {
            "wore": 0,
            "skipped": 0,
            "returned": 0,
            "loved": 0,
            "pending": 0,
            "total": len(result.data)
        }
        
        for log in result.data:
            outcome = log.get("outcome", "pending")
            if outcome in outcome_counts:
                outcome_counts[outcome] += 1
        
        return outcome_counts
        
    except Exception as e:
        logger.error(f"Error fetching outfit summary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching outfit summary: {str(e)}"
        )
