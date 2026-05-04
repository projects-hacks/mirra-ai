"""Pydantic models for onboarding API endpoints."""
import re
from typing import Literal, Any
from pydantic import BaseModel, field_validator, Field


# ── Constants ───────────────────────────────────────

USER_ID_DESCRIPTION = "User ID from Supabase Auth"
USER_ID_VALIDATION_ERROR = "user_id must be non-empty"


class InitRequest(BaseModel):
    """Request model for onboarding initialization."""
    user_id: str = Field(..., min_length=1, description=USER_ID_DESCRIPTION)

    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user_id is non-empty."""
        if not v or not v.strip():
            raise ValueError(USER_ID_VALIDATION_ERROR)
        return v


class AnalyzeRequest(BaseModel):
    """Request model for appearance analysis."""
    user_id: str = Field(..., min_length=1, description=USER_ID_DESCRIPTION)
    selfie: str = Field(..., description="Base64-encoded JPEG selfie (with or without data URL prefix)")

    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user_id is non-empty."""
        if not v or not v.strip():
            raise ValueError(USER_ID_VALIDATION_ERROR)
        return v

    @field_validator('selfie')
    @classmethod
    def validate_selfie(cls, v: str) -> str:
        """Validate selfie is a valid base64 string (optionally with data URL prefix)."""
        if not v or not v.strip():
            raise ValueError('selfie must be non-empty')
        
        # Store original for logging
        original_length = len(v)
        
        # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        if v.startswith('data:'):
            parts = v.split(',', 1)
            if len(parts) != 2:
                raise ValueError('Invalid data URL format')
            v = parts[1]
        
        # Validate base64 format (alphanumeric + / + = padding)
        if not re.match(r'^[A-Za-z0-9+/]*={0,2}$', v):
            raise ValueError(f'selfie must be a valid base64 string (length: {original_length}, after prefix removal: {len(v)})')
        
        # Warn if image seems too small (< 10KB base64 ≈ 7.5KB binary)
        if len(v) < 13000:  # ~10KB base64
            import logging
            logging.getLogger(__name__).warning(
                f"Selfie may be too small: {len(v)} base64 chars ≈ {len(v) * 3 // 4 / 1024:.1f}KB. "
                "Perfect Corp requires images with long side ≤ 4096px and face >60% of width."
            )
        
        return v$', v):
            raise ValueError('selfie must be a valid base64 string')
        
        return v


class SeedClosetRequest(BaseModel):
    """Request model for closet seeding."""
    user_id: str = Field(..., min_length=1, description=USER_ID_DESCRIPTION)

    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user_id is non-empty."""
        if not v or not v.strip():
            raise ValueError(USER_ID_VALIDATION_ERROR)
        return v


class CompleteRequest(BaseModel):
    """Request model for onboarding completion."""
    user_id: str = Field(..., min_length=1, description=USER_ID_DESCRIPTION)
    calendar_connected: bool = Field(default=False, description="Whether calendar was connected")

    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user_id is non-empty."""
        if not v or not v.strip():
            raise ValueError(USER_ID_VALIDATION_ERROR)
        return v


class SkinScores(BaseModel):
    """Skin analysis scores (0-100)."""
    overall: int = Field(..., ge=0, le=100, description="Overall skin score")
    moisture: int = Field(..., ge=0, le=100, description="Moisture level score")
    acne: int = Field(..., ge=0, le=100, description="Acne score")
    wrinkles: int = Field(..., ge=0, le=100, description="Wrinkles score (mapped from 'wrinkle')")
    pores: int = Field(..., ge=0, le=100, description="Pores score (mapped from 'pore')")
    dark_circles: int = Field(..., ge=0, le=100, description="Dark circles score (mapped from 'dark_circle')")
    # Additional comprehensive metrics
    texture: int = Field(..., ge=0, le=100, description="Skin texture score")
    redness: int = Field(..., ge=0, le=100, description="Redness score")
    oiliness: int = Field(..., ge=0, le=100, description="Oiliness score")
    age_spot: int = Field(..., ge=0, le=100, description="Age spot score")
    radiance: int = Field(..., ge=0, le=100, description="Radiance score")
    eye_bag: int = Field(..., ge=0, le=100, description="Eye bag score")
    droopy_upper_eyelid: int = Field(..., ge=0, le=100, description="Droopy upper eyelid score")
    droopy_lower_eyelid: int = Field(..., ge=0, le=100, description="Droopy lower eyelid score")
    firmness: int = Field(..., ge=0, le=100, description="Skin firmness score")


class SkinTone(BaseModel):
    """Skin tone analysis results."""
    skin_color: str = Field(..., description="Hex color code for skin")
    eye_color: str | None = Field(None, description="Hex color code for eyes")
    eye_color_name: str | None = Field(None, description="Eye color name")
    lip_color: str | None = Field(None, description="Hex color code for lips")
    eyebrow_color: str | None = Field(None, description="Hex color code for eyebrows")
    hair_color: str | None = Field(None, description="Hex color code for hair")
    hair_color_name: str | None = Field(None, description="Hair color name")


class FaceShape(BaseModel):
    """Face shape analysis results."""
    shape: str = Field(..., description="Face shape classification")
    age: int | None = Field(None, description="Estimated age")
    gender: str | None = Field(None, description="Detected gender")
    facial_ratios: dict[str, Any] = Field(default_factory=dict, description="Facial proportion ratios")
    eye_shape: str | None = Field(None, description="Eye shape classification")
    eye_size: str | None = Field(None, description="Eye size classification")
    eyelid_type: str | None = Field(None, description="Eyelid type")
    lip_shape: str | None = Field(None, description="Lip shape classification")
    nose_width: str | None = Field(None, description="Nose width classification")
    nose_length: str | None = Field(None, description="Nose length classification")


class BodyModel(BaseModel):
    """Complete body model with skin and face analysis."""
    skin_scores: SkinScores
    skin_tone: SkinTone
    face_shape: FaceShape


class InitResponse(BaseModel):
    """Response model for onboarding initialization."""
    success: bool
    profile: dict
    preferences: dict


class AnalyzeResponse(BaseModel):
    """Response model for appearance analysis."""
    success: bool
    body_model: BodyModel
    skin_scan: dict
    greeting: str


class SeedClosetResponse(BaseModel):
    """Response model for closet seeding."""
    success: bool
    item_count: int


class CompleteResponse(BaseModel):
    """Response model for onboarding completion."""
    success: bool
    profile: dict | None
