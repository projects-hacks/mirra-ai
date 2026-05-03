"""Pydantic models for onboarding API endpoints."""
import re
from typing import Literal
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
        
        # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        if v.startswith('data:'):
            parts = v.split(',', 1)
            if len(parts) != 2:
                raise ValueError('Invalid data URL format')
            v = parts[1]
        
        # Validate base64 format (alphanumeric + / + = padding)
        if not re.match(r'^[A-Za-z0-9+/]*={0,2}$', v):
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
    wrinkles: int = Field(..., ge=0, le=100, description="Wrinkles score")
    pores: int = Field(..., ge=0, le=100, description="Pores score")
    dark_circles: int = Field(..., ge=0, le=100, description="Dark circles score")


class SkinTone(BaseModel):
    """Skin tone analysis results."""
    undertone: Literal['warm', 'cool', 'neutral'] = Field(..., description="Skin undertone")
    depth: Literal['light', 'medium', 'deep'] = Field(..., description="Skin depth")
    hex: str = Field(..., description="Hex color code")
    color_season: str = Field(..., description="Color season classification")


class FaceShape(BaseModel):
    """Face shape analysis results."""
    shape: str = Field(..., description="Face shape classification")
    symmetry_score: float = Field(..., description="Facial symmetry score")
    proportions: dict[str, float] = Field(..., description="Facial proportions")


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
