"""Closet Recommendations API Router

Provides personalized item and outfit recommendations based on:
- Weather conditions
- Occasion/event type
- Recent wear history
- User preferences and style profile
- Color coordination and formality matching
"""
import logging
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.closet_recommendation import get_recommendation_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/closet", tags=["closet-recommendations"])


class EventContext(BaseModel):
    """Context for event-based recommendations."""
    occasion: str = Field(..., description="Event occasion (e.g., casual, work, formal)")
    formality: float = Field(0.5, ge=0.0, le=1.0, description="Formality level 0-1")
    season: Optional[str] = Field(None, description="Season (spring, summer, fall, winter)")
    weather: Optional[Dict[str, Any]] = Field(None, description="Weather conditions")


class RecommendItemsRequest(BaseModel):
    """Request model for item recommendations."""
    user_id: str = Field(..., description="User ID")
    event: EventContext = Field(..., description="Event context")


class RecommendOutfitRequest(BaseModel):
    """Request model for complete outfit recommendations."""
    user_id: str = Field(..., description="User ID")
    context: EventContext = Field(..., description="Event context")


class RecommendedItem(BaseModel):
    """A recommended closet item with score and reason."""
    id: str
    name: str
    category: str
    color: str
    image_url: Optional[str]
    recommendation_score: float
    reason: str


class RecommendedOutfit(BaseModel):
    """A complete recommended outfit."""
    items: List[Dict[str, Any]]
    outfit: Dict[str, Any]
    total_score: float
    occasion: Optional[str]
    formality: Optional[float]


@router.post("/recommendations/items")
async def recommend_items(request: RecommendItemsRequest) -> Dict[str, Any]:
    """
    Get personalized item recommendations for an event.
    
    This endpoint analyzes the user's closet and recommends items based on:
    - Event occasion and formality
    - Weather conditions
    - Recent wear history (avoids recently worn items)
    - User preferences (favorites, high-rated items)
    - Item suitability (season, formality match)
    
    Args:
        request: Contains user_id and event context
        
    Returns:
        Dictionary with recommended items array, each with score and reason
        
    Raises:
        HTTPException: 
            - 400: Invalid request parameters
            - 404: User not found or no closet items
            - 500: Server error
    """
    try:
        logger.info(f"Generating item recommendations for user {request.user_id}, occasion: {request.event.occasion}")
        
        engine = get_recommendation_engine()
        
        # Convert event context to dict
        event_dict = request.event.model_dump()
        
        # Get recommendations
        recommendations = await engine.recommend_items_for_event(
            user_id=request.user_id,
            event=event_dict
        )
        
        logger.info(f"Generated {len(recommendations)} item recommendations")
        
        return {
            "recommendations": recommendations,
            "count": len(recommendations),
            "occasion": request.event.occasion,
            "formality": request.event.formality
        }
        
    except Exception as e:
        logger.error(f"Error generating item recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating recommendations: {str(e)}"
        )


@router.post("/recommendations/outfit")
async def recommend_outfit(request: RecommendOutfitRequest) -> RecommendedOutfit:
    """
    Get a complete coordinated outfit recommendation.
    
    This endpoint creates a complete outfit by:
    - Selecting coordinated items from different categories
    - Ensuring color harmony between items
    - Matching formality levels across items
    - Considering weather appropriateness
    - Avoiding recently worn items
    
    Args:
        request: Contains user_id and event context
        
    Returns:
        RecommendedOutfit with coordinated items and total score
        
    Raises:
        HTTPException: 
            - 400: Invalid request parameters
            - 404: User not found or insufficient closet items
            - 500: Server error
    """
    try:
        logger.info(f"Generating outfit recommendation for user {request.user_id}, occasion: {request.context.occasion}")
        
        engine = get_recommendation_engine()
        
        # Convert context to dict
        context_dict = request.context.model_dump()
        
        # Get complete outfit recommendation
        outfit = await engine.recommend_complete_outfit(
            user_id=request.user_id,
            context=context_dict
        )
        
        if not outfit.get("items"):
            raise HTTPException(
                status_code=404,
                detail="Unable to generate outfit recommendation. User may not have enough closet items."
            )
        
        logger.info(f"Generated outfit with {len(outfit['items'])} items, score: {outfit['total_score']}")
        
        return RecommendedOutfit(**outfit)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating outfit recommendation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating outfit recommendation: {str(e)}"
        )


@router.get("/recommendations/quick")
async def get_quick_recommendations(
    user_id: str = Query(..., description="User ID"),
    occasion: str = Query("casual", description="Event occasion"),
    temperature: Optional[float] = Query(None, description="Temperature in Fahrenheit")
) -> Dict[str, Any]:
    """
    Get quick item recommendations with minimal parameters.
    
    This is a simplified endpoint for quick recommendations without
    requiring a full event context object.
    
    Args:
        user_id: User ID
        occasion: Event occasion (default: casual)
        temperature: Optional temperature in Fahrenheit
        
    Returns:
        Dictionary with recommended items
    """
    try:
        logger.info(f"Generating quick recommendations for user {user_id}, occasion: {occasion}")
        
        engine = get_recommendation_engine()
        
        # Build simple event context
        event = {
            "occasion": occasion,
            "formality": 0.3 if occasion == "casual" else 0.7 if occasion == "work" else 0.9,
        }
        
        if temperature is not None:
            event["weather"] = {"temperature": temperature}
        
        # Get recommendations
        recommendations = await engine.recommend_items_for_event(
            user_id=user_id,
            event=event
        )
        
        # Return top 10
        return {
            "recommendations": recommendations[:10],
            "count": len(recommendations[:10]),
            "occasion": occasion
        }
        
    except Exception as e:
        logger.error(f"Error generating quick recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating recommendations: {str(e)}"
        )
