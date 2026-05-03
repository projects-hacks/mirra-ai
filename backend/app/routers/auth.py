"""
Authentication router for OAuth flow.

This module handles the OAuth authentication flow with Supabase,
ensuring PKCE code verifier is stored server-side for security.
"""

from fastapi import APIRouter, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Any
import os

from app.services.supabase_client import supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Constants ───────────────────────────────────────

SUPABASE_NOT_CONFIGURED = "Supabase client not configured"


# ── Models ──────────────────────────────────────────


class AuthInitResponse(BaseModel):
    """Response for auth initialization."""
    auth_url: str
    message: str


class AuthCallbackResponse(BaseModel):
    """Response for auth callback."""
    success: bool
    user_id: str | None = None
    email: str | None = None
    message: str


# ── Endpoints ───────────────────────────────────────


@router.get("/login", responses={
    500: {"description": "Supabase client not configured or OAuth initialization failed"}
})
async def initiate_google_oauth(request: Request) -> AuthInitResponse:
    """
    Initiate Google OAuth flow.
    
    This endpoint starts the OAuth flow and returns the authorization URL.
    The PKCE code verifier is stored server-side in Supabase session storage.
    
    Returns:
        AuthInitResponse with authorization URL
        
    Raises:
        HTTPException: 500 if Supabase client not configured or OAuth fails
    """
    try:
        if not supabase:
            raise HTTPException(
                status_code=500,
                detail=SUPABASE_NOT_CONFIGURED
            )
        
        # Get the frontend URL from environment or request origin
        frontend_url = os.getenv("FRONTEND_URL")
        if not frontend_url:
            # Use the Origin header from the request
            origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
            frontend_url = origin if origin else "http://localhost:3000"
        
        redirect_url = f"{frontend_url}/auth/callback"
        
        # Initiate OAuth with Supabase (PKCE handled automatically)
        response = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": redirect_url,
            }
        })
        
        if not response or not response.url:
            raise HTTPException(
                status_code=500,
                detail="Failed to initiate OAuth flow"
            )
        
        return AuthInitResponse(
            auth_url=response.url,
            message="OAuth flow initiated successfully"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OAuth initialization failed: {str(e)}"
        )


@router.get("/callback")
async def handle_oauth_callback(
    code: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    response: Response = None,
    request: Request = None
) -> RedirectResponse:
    """
    Handle OAuth callback from Supabase.
    
    This endpoint receives the authorization code from Supabase,
    exchanges it for a session, and redirects to the frontend.
    
    Query Parameters:
        code: Authorization code from OAuth provider
        error: Error code if OAuth failed
        error_description: Human-readable error description
    
    Returns:
        RedirectResponse to frontend with success/error status
    """
    # Get frontend URL from environment or request origin
    frontend_url = os.getenv("FRONTEND_URL")
    if not frontend_url:
        # Use the Referer header to determine where the request came from
        referer = request.headers.get("referer", "").rstrip("/") if request else ""
        frontend_url = referer if referer else "http://localhost:3000"
    
    # Handle OAuth errors
    if error:
        error_msg = error_description or error
        return RedirectResponse(
            url=f"{frontend_url}/?auth_error={error_msg}",
            status_code=302
        )
    
    # Validate authorization code
    if not code:
        return RedirectResponse(
            url=f"{frontend_url}/?auth_error=No authorization code received",
            status_code=302
        )
    
    try:
        if not supabase:
            raise HTTPException(
                status_code=500,
                detail=SUPABASE_NOT_CONFIGURED
            )
        
        # Exchange code for session (PKCE verification happens here)
        auth_response = supabase.auth.exchange_code_for_session(code)
        
        if not auth_response or not auth_response.session:
            raise HTTPException(
                status_code=401,
                detail="Failed to exchange code for session"
            )
        
        # Get user data
        user = auth_response.user
        if not user or not user.email:
            raise HTTPException(
                status_code=401,
                detail="User data not found in session"
            )
        
        # Session is now established in Supabase
        # Redirect to frontend with success
        return RedirectResponse(
            url=f"{frontend_url}/?auth_success=true&user_id={user.id}",
            status_code=302
        )
        
    except Exception as e:
        return RedirectResponse(
            url=f"{frontend_url}/?auth_error={str(e)}",
            status_code=302
        )


@router.post("/logout", responses={
    500: {"description": "Supabase client not configured or logout failed"}
})
async def logout() -> dict[str, str]:
    """
    Logout current user.
    
    This endpoint signs out the user and clears the session.
    
    Returns:
        Success message
        
    Raises:
        HTTPException: 500 if Supabase client not configured or logout fails
    """
    try:
        if not supabase:
            raise HTTPException(
                status_code=500,
                detail=SUPABASE_NOT_CONFIGURED
            )
        
        supabase.auth.sign_out()
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Logout failed: {str(e)}"
        )


@router.get("/session", responses={
    401: {"description": "No active session"},
    500: {"description": "Supabase client not configured or session retrieval failed"}
})
async def get_session() -> dict[str, Any]:
    """
    Get current session information.
    
    This endpoint returns the current user session if authenticated.
    
    Returns:
        Session data including user information
        
    Raises:
        HTTPException: 401 if no active session, 500 if Supabase client not configured
    """
    try:
        if not supabase:
            raise HTTPException(
                status_code=500,
                detail=SUPABASE_NOT_CONFIGURED
            )
        
        session = supabase.auth.get_session()
        
        if not session:
            raise HTTPException(
                status_code=401,
                detail="No active session"
            )
        
        return {
            "authenticated": True,
            "user": session.user,
            "expires_at": session.expires_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get session: {str(e)}"
        )
