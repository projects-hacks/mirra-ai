"""Pydantic models for closet-related API endpoints."""
import re
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, field_validator


class ExtractedMetadata(BaseModel):
    """Metadata extracted from closet item images using AI vision."""
    
    category: str = Field(..., description="Primary category (jacket, dress, shoes, etc.)")
    subcategory: Optional[str] = Field(None, description="More specific type (e.g., 'midi dress', 'bomber jacket')")
    primary_color: str = Field(..., description="Dominant color name")
    color_hex: str = Field(..., description="Approximate hex code for primary color")
    secondary_colors: List[str] = Field(default_factory=list, description="Other prominent colors")
    brand: str = Field(default="Unknown", description="Brand name if visible or recognizable")
    material: Optional[str] = Field(None, description="Fabric type (cotton, leather, denim, etc.)")
    pattern: Optional[str] = Field(None, description="Pattern type (solid, striped, floral, plaid, etc.)")
    formality: float = Field(default=0.5, ge=0.0, le=1.0, description="Formality level (0=casual, 1=formal)")
    occasions: List[str] = Field(default_factory=list, description="Suitable occasions (casual, work, date, formal, athletic)")
    seasons: List[str] = Field(default_factory=list, description="Suitable seasons (spring, summer, fall, winter)")
    confidence_scores: Dict[str, float] = Field(default_factory=dict, description="Confidence scores for each field (0.0-1.0)")
    
    @field_validator('color_hex')
    @classmethod
    def validate_hex(cls, v: str) -> str:
        """Validate hex color format."""
        if not v:
            return v
        # Add # prefix if missing
        if not v.startswith('#'):
            v = f'#{v}'
        # Validate format
        if not re.match(r'^#[0-9A-Fa-f]{6}$', v):
            raise ValueError(f'Invalid hex color: {v}')
        return v.upper()
    
    @field_validator('formality')
    @classmethod
    def validate_formality(cls, v: float) -> float:
        """Ensure formality is within valid range."""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Formality must be between 0.0 and 1.0')
        return v
