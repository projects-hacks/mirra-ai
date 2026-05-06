"""Perfect Corp API Type Definitions.

This module defines TypedDict classes for Perfect Corp API responses
to ensure type safety and prevent parameter mismatches.

Based on Perfect Corp API v2.0 documentation.
"""

from typing import Any, TypedDict, List, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# SKIN ANALYSIS
# ============================================================

class SkinMetricScore(TypedDict):
    """Individual skin metric score."""
    raw_score: float
    ui_score: int  # 0-100


class SkinAnalysisResult(TypedDict, total=False):
    """Response from skin-analysis API.
    
    Available dst_actions (SD format):
    - wrinkle, pore, texture, acne, oiliness, radiance
    - eye_bag, age_spot, dark_circle_v2, droopy_upper_eyelid, droopy_lower_eyelid
    - firmness, moisture, redness, tear_trough, skin_type
    
    Available dst_actions (HD format - prefix with hd_):
    - hd_wrinkle, hd_pore, hd_texture, hd_acne, hd_oiliness, hd_radiance
    - hd_eye_bag, hd_age_spot, hd_dark_circle, hd_droopy_upper_eyelid, hd_droopy_lower_eyelid
    - hd_firmness, hd_moisture, hd_redness, hd_tear_trough, hd_skin_type
    """
    # Overall score
    all: dict  # {"score": float}
    skin_age: int
    
    # Individual metrics (SD format)
    wrinkle: SkinMetricScore
    pore: SkinMetricScore
    texture: SkinMetricScore
    acne: SkinMetricScore
    oiliness: SkinMetricScore
    radiance: SkinMetricScore
    eye_bag: SkinMetricScore
    age_spot: SkinMetricScore
    dark_circle_v2: SkinMetricScore  # NOTE: v2 suffix required
    droopy_upper_eyelid: SkinMetricScore
    droopy_lower_eyelid: SkinMetricScore
    firmness: SkinMetricScore
    moisture: SkinMetricScore
    redness: SkinMetricScore
    tear_trough: SkinMetricScore
    skin_type: SkinMetricScore
    
    # HD format (if requested)
    hd_wrinkle: SkinMetricScore
    hd_pore: SkinMetricScore
    hd_texture: SkinMetricScore
    hd_acne: SkinMetricScore
    hd_oiliness: SkinMetricScore
    hd_radiance: SkinMetricScore
    hd_eye_bag: SkinMetricScore
    hd_age_spot: SkinMetricScore
    hd_dark_circle: SkinMetricScore
    hd_droopy_upper_eyelid: SkinMetricScore
    hd_droopy_lower_eyelid: SkinMetricScore
    hd_firmness: SkinMetricScore
    hd_moisture: SkinMetricScore
    hd_redness: SkinMetricScore
    hd_tear_trough: SkinMetricScore
    hd_skin_type: SkinMetricScore


# ============================================================
# SKIN TONE ANALYSIS
# ============================================================

class SkinToneColor(TypedDict, total=False):
    """Color information from skin-tone-analysis."""
    skin_color: str  # Hex color
    eye_color: Optional[str]  # Hex color
    eye_color_name: Optional[str]
    lip_color: Optional[str]  # Hex color
    eyebrow_color: Optional[str]  # Hex color
    hair_color: Optional[str]  # Hex color
    hair_color_name: Optional[str]


class FaceQuality(TypedDict):
    """Face quality metrics from skin-tone-analysis."""
    has_face: bool
    area: Literal["good", "bad"]
    frontal: Literal["good", "bad"]
    lighting: Literal["good", "bad"]
    faceangle: Literal["good", "downward", "upward", "left", "right"]


class SkinToneAnalysisResult(TypedDict):
    """Response from skin-tone-analysis API."""
    color: SkinToneColor
    face_quality: FaceQuality


# ============================================================
# FACE ATTRIBUTES ANALYSIS
# ============================================================

class FaceAttributesResult(TypedDict, total=False):
    """Response from face-attr-analysis API.
    
    Available features (camelCase format):
    - faceShape, age, gender
    - eyeShape, eyeSize, eyeAngle, eyeDistance, eyelid
    - eyebrowShape, eyebrowThickness, eyebrowDistance, eyebrowShortness
    - cheekbones, lipShape, noseWidth, noseLength
    - eyeColor, lipColor, eyebrowColor, hairColor
    - horizontalThird, verticalFifth, faceAspectRatio, eyeAspectRatio
    - eyebrowPosition, eyebrowArch, eyeHeightToEyebrowDistance
    - noseAspectRatio, noseWidthToMouthWidth, noseToLipToChin, upperLipToLowerLip
    """
    # Basic attributes
    faceShape: str  # e.g., "Oval", "Round", "Square"
    age: int
    gender: Literal["male", "female"]
    
    # Eye attributes
    eyeShape: List[str]  # e.g., ["almond"]
    eyeSize: List[str]  # e.g., ["medium"]
    eyeAngle: List[str]
    eyeDistance: List[str]
    eyelid: List[str]  # e.g., ["double"]
    eyeColor: str  # Hex color
    
    # Eyebrow attributes
    eyebrowShape: List[str]
    eyebrowThickness: List[str]
    eyebrowDistance: List[str]
    eyebrowShortness: List[str]
    eyebrowPosition: List[str]
    eyebrowArch: List[str]
    eyebrowColor: str  # Hex color
    
    # Facial features
    cheekbones: List[str]
    lipShape: List[str]  # e.g., ["full"]
    lipColor: str  # Hex color
    noseWidth: List[str]  # e.g., ["medium"]
    noseLength: List[str]  # e.g., ["medium"]
    hairColor: str  # Hex color
    
    # Facial ratios (advanced)
    horizontalThird: float
    verticalFifth: float
    faceAspectRatio: float
    eyeAspectRatio: float
    eyeHeightToEyebrowDistance: float
    noseAspectRatio: float
    noseWidthToMouthWidth: float
    noseToLipToChin: float
    upperLipToLowerLip: float


# ============================================================
# COMMON API STRUCTURES
# ============================================================

class PerfectCorpTaskResponse(TypedDict):
    """Common task response structure."""
    task_id: str
    task_status: Literal["pending", "running", "success", "error"]
    error: Optional[str]
    error_code: Optional[str]
    results: dict  # Type depends on task_type


class PerfectCorpFileUpload(TypedDict):
    """File upload response."""
    file_id: str
    requests: List[dict]  # Pre-signed upload URLs


class MirraErrorDetail(BaseModel):
    """Normalized user-facing error payload returned by Mirra API routes."""

    category: str
    message: str
    provider_message: str | None = None
    provider_code: str | None = None
    source: str | None = None
    task_type: str | None = None


class VTOImageResponseModel(BaseModel):
    """Normalized VTO success payload consumed by the frontend."""

    model_config = ConfigDict(extra="allow")

    image_url: str
    result_image_url: str | None = None
    url: str | None = None
    provider_payload: dict[str, Any] | None = None


class SkinAnalyzeResponseModel(BaseModel):
    """Normalized skin-analysis response.

    Perfect Corp skin analysis returns the provider-specific score map under
    `scores`; UI consumers should not depend on the raw provider envelope.
    """

    model_config = ConfigDict(extra="allow")

    scores: dict[str, Any]
    skin_age: int | None = None
    suggestions: list[Any] = Field(default_factory=list)


class SkinSimulateResponseModel(BaseModel):
    """Normalized skin-simulation response."""

    model_config = ConfigDict(extra="allow")

    simulation_url: str
    image_url: str | None = None
    intensities_used: dict[str, float] = Field(default_factory=dict)


# ============================================================
# ERROR CODES
# ============================================================

# Non-retryable errors (user input issues)
NON_RETRYABLE_ERROR_CODES = [
    "error_face_angle",
    "error_face_angle_downward",
    "error_face_angle_upward",
    "error_face_angle_left",
    "error_face_angle_right",
    "error_src_face_too_small",
    "error_face_position_invalid",
    "error_lighting_dark",
    "error_below_min_image_size",
    "error_no_face_detected",
    "error_multiple_faces",
]

# Retryable errors (transient issues)
RETRYABLE_ERROR_CODES = [
    "unknown_internal",
    "error_timeout",
    "error_service_unavailable",
]

# User-friendly error messages
ERROR_MESSAGES = {
    "error_face_angle": "Please face the camera directly and keep your head straight.",
    "error_face_angle_downward": "Please tilt your head up slightly.",
    "error_face_angle_upward": "Please tilt your head down slightly.",
    "error_face_angle_left": "Please turn your face slightly to the right.",
    "error_face_angle_right": "Please turn your face slightly to the left.",
    "error_src_face_too_small": "Please move closer to the camera so your face fills more of the frame.",
    "error_face_position_invalid": "Please center your face in the frame and ensure it's fully visible.",
    "error_lighting_dark": "Please move to a better-lit area for clearer analysis.",
    "error_below_min_image_size": "Image quality is too low. Please use a higher resolution camera.",
    "error_no_face_detected": "No face detected. Please ensure your face is clearly visible.",
    "error_multiple_faces": "Multiple faces detected. Please ensure only one person is in the frame.",
}


# ============================================================
# PARAMETER CONSTANTS
# ============================================================

# Skin Analysis dst_actions (SD format)
SKIN_ANALYSIS_SD_ACTIONS = [
    "wrinkle", "pore", "texture", "acne", "oiliness", "radiance",
    "eye_bag", "age_spot", "dark_circle_v2", "droopy_upper_eyelid", "droopy_lower_eyelid",
    "firmness", "moisture", "redness", "tear_trough", "skin_type"
]

# Skin Analysis dst_actions (HD format)
SKIN_ANALYSIS_HD_ACTIONS = [
    "hd_wrinkle", "hd_pore", "hd_texture", "hd_acne", "hd_oiliness", "hd_radiance",
    "hd_eye_bag", "hd_age_spot", "hd_dark_circle", "hd_droopy_upper_eyelid", "hd_droopy_lower_eyelid",
    "hd_firmness", "hd_moisture", "hd_redness", "hd_tear_trough", "hd_skin_type"
]

# Face Attributes features (camelCase format)
FACE_ATTR_BASIC_FEATURES = ["faceShape", "age", "gender"]
FACE_ATTR_EYE_FEATURES = ["eyeShape", "eyeSize", "eyeAngle", "eyeDistance", "eyelid", "eyeColor"]
FACE_ATTR_EYEBROW_FEATURES = ["eyebrowShape", "eyebrowThickness", "eyebrowDistance", "eyebrowShortness", "eyebrowColor"]
FACE_ATTR_FACIAL_FEATURES = ["cheekbones", "lipShape", "lipColor", "noseWidth", "noseLength", "hairColor"]
FACE_ATTR_RATIO_FEATURES = [
    "horizontalThird", "verticalFifth", "faceAspectRatio", "eyeAspectRatio",
    "eyebrowPosition", "eyebrowArch", "eyeHeightToEyebrowDistance",
    "noseAspectRatio", "noseWidthToMouthWidth", "noseToLipToChin", "upperLipToLowerLip"
]

# All available face attributes features
FACE_ATTR_ALL_FEATURES = (
    FACE_ATTR_BASIC_FEATURES +
    FACE_ATTR_EYE_FEATURES +
    FACE_ATTR_EYEBROW_FEATURES +
    FACE_ATTR_FACIAL_FEATURES +
    FACE_ATTR_RATIO_FEATURES
)
