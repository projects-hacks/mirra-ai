"""Test to verify the response structure matches frontend expectations."""
import json
from app.models.onboarding import AnalyzeResponse, BodyModel, SkinScores, SkinTone, FaceShape

# Create a sample response matching what the service returns
sample_body_model = {
    "skin_scores": {
        "overall": 75,
        "moisture": 80,
        "acne": 70,
        "wrinkles": 85,
        "pores": 75,
        "dark_circles": 65,
        "texture": 78,
        "redness": 72,
        "oiliness": 68,
        "age_spot": 82,
        "radiance": 76,
        "eye_bag": 70,
        "droopy_upper_eyelid": 88,
        "droopy_lower_eyelid": 86,
        "firmness": 74
    },
    "skin_tone": {
        "skin_color": "#D4A574",
        "eye_color": "#8B4513",
        "eye_color_name": "Brown",
        "lip_color": "#C87872",
        "eyebrow_color": "#3D2817",
        "hair_color": "#2C1810",
        "hair_color_name": "Dark Brown"
    },
    "face_shape": {
        "shape": "Oval",
        "age": 28,
        "gender": "Female",
        "facial_ratios": {"width_to_height": 0.75},
        "eye_shape": "Almond",
        "eye_size": "Medium",
        "eyelid_type": "Double",
        "lip_shape": "Full",
        "nose_width": "Medium",
        "nose_length": "Medium"
    }
}

sample_response = {
    "success": True,
    "body_model": sample_body_model,
    "skin_scan": {
        "user_id": "test-user",
        "scores": sample_body_model["skin_scores"],
        "skin_age": 26,
        "scan_context": "morning"
    },
    "greeting": "Your skin's looking great with a score of 75! Let's keep it that way."
}

try:
    # Validate the response structure
    response = AnalyzeResponse(**sample_response)
    print("✓ Response structure validation passed!")
    print(f"\nSample response JSON:")
    print(json.dumps(sample_response, indent=2))
    print(f"\n✓ All fields validated successfully")
    print(f"  - SkinScores: {len(sample_body_model['skin_scores'])} metrics")
    print(f"  - SkinTone: {len([k for k, v in sample_body_model['skin_tone'].items() if v is not None])} fields")
    print(f"  - FaceShape: {len([k for k, v in sample_body_model['face_shape'].items() if v is not None])} fields")
except Exception as e:
    print(f"❌ Validation failed: {e}")
    import traceback
    traceback.print_exc()
