"""Onboarding API endpoints — orchestrates complete user onboarding flow."""
import logging
from fastapi import APIRouter, HTTPException, status, Request

from app.models.onboarding import (
    InitRequest,
    InitResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    SeedClosetRequest,
    SeedClosetResponse,
    CompleteRequest,
    CompleteResponse,
)
from app.services.onboarding import OnboardingService

logger = logging.getLogger(__name__)

router = APIRouter()
onboarding_service = OnboardingService()


@router.post("/init")
async def init_onboarding(request: Request, body: InitRequest) -> InitResponse:
    """Initialize onboarding session after authentication.
    
    Automatically detects user location from IP address if profile has default location.
    
    Args:
        request: FastAPI request object (to get client IP)
        body: InitRequest with user_id
        
    Returns:
        InitResponse with success status, profile, and preferences
        
    Raises:
        HTTPException: 404 if user not found, 500 for other errors
    """
    try:
        # Get client IP address
        client_ip = request.client.host if request.client else None
        
        # If behind proxy (e.g., Nginx, Cloudflare), get real IP from headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        # Skip localhost/private IPs
        if client_ip and (client_ip.startswith("127.") or client_ip.startswith("192.168.") or client_ip.startswith("10.")):
            logger.info(f"Skipping IP detection for private IP: {client_ip}")
            client_ip = None
        
        logger.info(f"Init onboarding for user {body.user_id} from IP {client_ip}")
        
        result = await onboarding_service.init(body.user_id, ip_address=client_ip)
        return InitResponse(**result)
    except ValueError as e:
        logger.error(f"User not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Onboarding init failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize onboarding"
        )


@router.post("/analyze")
async def analyze_appearance(request: AnalyzeRequest) -> AnalyzeResponse:
    """Execute parallel appearance analysis.
    
    Calls three Perfect Corp APIs in parallel:
    - skin-analysis
    - skin-tone
    - face-attributes
    
    Stores results in database and cache, generates personalized greeting.
    
    Args:
        request: AnalyzeRequest with user_id and base64 selfie
        
    Returns:
        AnalyzeResponse with body_model, skin_scan, and greeting
        
    Raises:
        HTTPException: 400 for invalid input, 500 for processing errors
    """
    try:
        result = await onboarding_service.analyze(request.user_id, request.selfie)
        return AnalyzeResponse(**result)
    except ValueError as e:
        logger.error(f"Invalid selfie data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid selfie data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Appearance analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze appearance"
        )


@router.post("/seed-closet")
async def seed_closet(request: SeedClosetRequest) -> SeedClosetResponse:
    """Pre-populate user's closet with 15 demo items.
    
    Inserts demo items spanning multiple categories with variety of
    formality levels and occasions.
    
    Args:
        request: SeedClosetRequest with user_id
        
    Returns:
        SeedClosetResponse with success status and item count
        
    Raises:
        HTTPException: 500 if seeding fails
    """
    try:
        result = await onboarding_service.seed_closet(request.user_id)
        return SeedClosetResponse(**result)
    except Exception as e:
        logger.error(f"Closet seeding failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed closet"
        )


@router.post("/complete")
async def complete_onboarding(request: CompleteRequest) -> CompleteResponse:
    """Mark onboarding as complete and finalize setup.
    
    Updates profile.onboarded to true and calendar_connected if applicable.
    
    Args:
        request: CompleteRequest with user_id and calendar_connected flag
        
    Returns:
        CompleteResponse with success status and updated profile
        
    Raises:
        HTTPException: 500 if completion fails
    """
    try:
        result = await onboarding_service.complete(
            request.user_id,
            request.calendar_connected
        )
        return CompleteResponse(**result)
    except Exception as e:
        logger.error(f"Onboarding completion failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )
