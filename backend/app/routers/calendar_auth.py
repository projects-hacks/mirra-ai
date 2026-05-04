"""Google Calendar OAuth flow."""
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.core.config import settings
from app.services.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter()

# OAuth 2.0 scopes for Google Calendar
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

# OAuth client configuration from environment
GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET = settings.GOOGLE_CLIENT_SECRET
REDIRECT_URI = f"{settings.CORS_ORIGIN.replace('3000', '8000')}/api/calendar/oauth/callback"  # Backend URL


def _get_flow() -> Flow:
    """Create OAuth flow instance."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Google Calendar OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }
    
    return Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )


@router.get("/oauth/authorize")
async def authorize_calendar(user_id: str = Query(..., description="User ID to associate calendar with")):
    """
    Initiate Google Calendar OAuth flow.
    
    Args:
        user_id: User ID to associate the calendar connection with
        
    Returns:
        Redirect to Google OAuth consent screen
    """
    try:
        flow = _get_flow()
        
        # Generate authorization URL
        authorization_url, state = flow.authorization_url(
            access_type='offline',  # Request refresh token
            include_granted_scopes='true',
            prompt='consent',  # Force consent screen to get refresh token
            state=user_id  # Pass user_id as state for callback
        )
        
        logger.info(f"Redirecting user {user_id} to Google OAuth")
        return RedirectResponse(url=authorization_url)
        
    except Exception as e:
        logger.error(f"OAuth authorization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate OAuth: {str(e)}")


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="User ID passed as state"),
    error: Optional[str] = Query(None, description="Error from OAuth provider")
):
    """
    Handle OAuth callback from Google.
    
    Args:
        code: Authorization code from Google
        state: User ID (passed as state parameter)
        error: Error message if OAuth failed
        
    Returns:
        Redirect to frontend with success/error status
    """
    user_id = state
    
    # Handle OAuth errors
    if error:
        logger.error(f"OAuth error for user {user_id}: {error}")
        return RedirectResponse(url=f"{settings.CORS_ORIGIN}/profile?calendar_error={error}")
    
    try:
        # Exchange authorization code for tokens
        flow = _get_flow()
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        # Test the credentials by fetching calendar info
        service = build("calendar", "v3", credentials=credentials)
        calendar_list = service.calendarList().get(calendarId='primary').execute()
        
        logger.info(f"Successfully connected calendar for user {user_id}: {calendar_list.get('summary', 'Primary')}")
        
        # Store credentials in database
        creds_dict = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        # Update user_preferences with calendar credentials
        supabase.from_("user_preferences").upsert(
            {
                "user_id": user_id,
                "calendar_connected": True,
                "google_calendar_token": json.dumps(creds_dict)
            },
            on_conflict="user_id"
        ).execute()
        
        logger.info(f"✓ Calendar connected for user {user_id}")
        
        # Redirect back to profile with success
        return RedirectResponse(url=f"{settings.CORS_ORIGIN}/profile?calendar_success=true")
        
    except Exception as e:
        logger.error(f"OAuth callback failed for user {user_id}: {str(e)}")
        return RedirectResponse(url=f"{settings.CORS_ORIGIN}/profile?calendar_error=connection_failed")


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

