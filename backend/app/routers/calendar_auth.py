"""Google Calendar management endpoints."""
import logging

from fastapi import APIRouter, HTTPException

from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/disconnect")
async def disconnect_calendar(user_id: str):
    """
    Disconnect Google Calendar for a user.
    
    Args:
        user_id: User ID to disconnect calendar from
        
    Returns:
        Success status
    """
    try:
        # Remove calendar credentials from database
        supabase.from_("user_preferences").upsert(
            {
                "user_id": user_id,
                "calendar_connected": False,
                "google_calendar_token": None
            },
            on_conflict="user_id"
        ).execute()
        
        logger.info(f"✓ Calendar disconnected for user {user_id}")
        
        return {"success": True, "message": "Calendar disconnected successfully"}
        
    except Exception as e:
        logger.error(f"Failed to disconnect calendar for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect calendar: {str(e)}")


@router.post("/reconnect")
async def reconnect_calendar_hint(user_id: str):
    """
    Provide instructions for reconnecting calendar.
    
    Since calendar is connected during sign-in, users need to sign out and sign in again
    to grant calendar permissions.
    
    Args:
        user_id: User ID
        
    Returns:
        Instructions for reconnecting
    """
    return {
        "success": True,
        "message": "To connect your calendar, please sign out and sign in again. You'll be prompted to grant calendar access during sign-in.",
        "requires_reauth": True
    }

