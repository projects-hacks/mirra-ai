"""Style profile router — API endpoints for style profile and drift detection."""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.style_profile_computer import get_profile_computer
from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def get_style_profile(
    user_id: str = Query(..., description="User ID"),
    period: Optional[str] = Query(None, description="Period start date (ISO format)")
):
    """
    Get style profile for a user.
    
    Args:
        user_id: The user's ID
        period: Optional period start date (ISO format). Defaults to most recent.
        
    Returns:
        Style profile data including top colors, categories, brands, formality, etc.
    """
    try:
        if period:
            # Fetch specific period
            result = supabase.table("style_profiles").select("*").eq(
                "user_id", user_id
            ).eq(
                "period_start", period
            ).execute()
        else:
            # Fetch most recent profile
            result = supabase.table("style_profiles").select("*").eq(
                "user_id", user_id
            ).order(
                "period_start", desc=True
            ).limit(1).execute()
        
        if not result.data:
            # No profile exists, compute one
            computer = get_profile_computer()
            profile = await computer.compute_weekly_profile(user_id)
            return profile
        
        profile = result.data[0]
        
        # Check for drift insights
        drift_result = supabase.table("style_drift_insights").select("*").eq(
            "user_id", user_id
        ).eq(
            "period_start", profile["period_start"]
        ).execute()
        
        if drift_result.data:
            profile["drift_insights"] = drift_result.data[0]
        
        return profile
        
    except Exception as e:
        logger.error(f"Error fetching style profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compute")
async def compute_style_profile(
    user_id: str = Query(..., description="User ID"),
    period: Optional[str] = Query(None, description="Period start date (ISO format)")
):
    """
    Manually trigger style profile computation.
    
    Args:
        user_id: The user's ID
        period: Optional period start date (ISO format). Defaults to current week.
        
    Returns:
        Computed style profile
    """
    try:
        computer = get_profile_computer()
        
        week_start = None
        if period:
            week_start = datetime.fromisoformat(period)
        
        profile = await computer.compute_weekly_profile(user_id, week_start)
        
        # Also detect drift
        drift = await computer.detect_style_drift(user_id, week_start)
        profile["drift_insights"] = drift
        
        return profile
        
    except Exception as e:
        logger.error(f"Error computing style profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/drift")
async def get_style_drift(
    user_id: str = Query(..., description="User ID"),
    period: Optional[str] = Query(None, description="Period start date (ISO format)")
):
    """
    Get style drift insights for a user.
    
    Args:
        user_id: The user's ID
        period: Optional period start date (ISO format). Defaults to current week.
        
    Returns:
        Style drift insights
    """
    try:
        computer = get_profile_computer()
        
        week_start = None
        if period:
            week_start = datetime.fromisoformat(period)
        
        drift = await computer.detect_style_drift(user_id, week_start)
        return drift
        
    except Exception as e:
        logger.error(f"Error detecting style drift: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_profile_history(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(10, description="Number of profiles to return")
):
    """
    Get historical style profiles for a user.
    
    Args:
        user_id: The user's ID
        limit: Number of profiles to return (default 10)
        
    Returns:
        List of historical style profiles
    """
    try:
        result = supabase.table("style_profiles").select("*").eq(
            "user_id", user_id
        ).order(
            "period_start", desc=True
        ).limit(limit).execute()
        
        return {"profiles": result.data}
        
    except Exception as e:
        logger.error(f"Error fetching profile history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
