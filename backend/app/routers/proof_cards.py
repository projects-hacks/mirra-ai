"""Proof Cards router — approval and outfit log creation."""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter()


class ApproveProofCardRequest(BaseModel):
    """Request model for approving a proof card."""
    proof_card_id: str
    user_id: str


class ApproveProofCardResponse(BaseModel):
    """Response model for proof card approval."""
    success: bool
    proof_card_id: str
    outfit_log_id: str
    message: str


@router.post("/approve", response_model=ApproveProofCardResponse)
async def approve_proof_card(request: ApproveProofCardRequest):
    """
    Approve a proof card and create an outfit log for tracking.
    
    This endpoint:
    1. Marks the proof card as approved
    2. Creates an outfit_log record with outcome='pending'
    3. Stores proof_card_id, occasion, weather, and items for future tracking
    
    Args:
        request: Contains proof_card_id and user_id
        
    Returns:
        ApproveProofCardResponse with success status and created outfit_log_id
        
    Raises:
        HTTPException: 
            - 404: Proof card not found
            - 500: Database error
    """
    try:
        logger.info(f"Approving proof card {request.proof_card_id} for user {request.user_id}")
        
        # Fetch the proof card
        proof_card_result = supabase.table("proof_cards").select("*").eq("id", request.proof_card_id).eq("user_id", request.user_id).execute()
        
        if not proof_card_result.data:
            logger.error(f"Proof card {request.proof_card_id} not found for user {request.user_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Proof card {request.proof_card_id} not found"
            )
        
        proof_card = proof_card_result.data[0]
        
        # Update proof card to mark as approved
        supabase.table("proof_cards").update({"approved": True}).eq("id", request.proof_card_id).execute()
        
        logger.info(f"Marked proof card {request.proof_card_id} as approved")
        
        # Combine owned_items and new_items into a single items array
        owned_items = proof_card.get("owned_items", [])
        new_items = proof_card.get("new_items", [])
        all_items = owned_items + new_items
        
        # Create outfit log with outcome='pending'
        outfit_log_data = {
            "user_id": request.user_id,
            "proof_card_id": request.proof_card_id,
            "occasion": proof_card.get("occasion", ""),
            "weather": proof_card.get("weather", {}),
            "items": all_items,
            "outcome": "pending",
            "created_at": datetime.utcnow().isoformat()
        }
        
        outfit_log_result = supabase.table("outfit_logs").insert(outfit_log_data).execute()
        
        if not outfit_log_result.data:
            logger.error(f"Failed to create outfit log for proof card {request.proof_card_id}")
            raise HTTPException(
                status_code=500,
                detail="Failed to create outfit log"
            )
        
        outfit_log_id = outfit_log_result.data[0]["id"]
        
        logger.info(f"Created outfit log {outfit_log_id} for proof card {request.proof_card_id}")
        
        return ApproveProofCardResponse(
            success=True,
            proof_card_id=request.proof_card_id,
            outfit_log_id=outfit_log_id,
            message="Proof card approved and outfit log created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error approving proof card: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/", response_model=Dict[str, Any])
async def get_proof_cards(user_id: str, approved: Optional[bool] = None):
    """
    Get proof cards for a user.
    
    Args:
        user_id: User ID
        approved: Optional filter for approved status
        
    Returns:
        Dictionary with proof_cards array
    """
    try:
        query = supabase.table("proof_cards").select("*").eq("user_id", user_id).order("created_at", desc=True)
        
        if approved is not None:
            query = query.eq("approved", approved)
        
        result = query.execute()
        
        return {"proof_cards": result.data}
        
    except Exception as e:
        logger.error(f"Error fetching proof cards: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching proof cards: {str(e)}"
        )
