#!/usr/bin/env python3
"""
Test Perfect Corp API with real selfie to see all available fields.
Downloads selfie from database and calls all three APIs.
"""
import asyncio
import base64
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.perfectcorp import call_api


async def test_all_apis():
    """Test all three Perfect Corp APIs with a real selfie."""
    
    # Read the downloaded selfie
    selfie_path = "/tmp/test_selfie.jpg"
    with open(selfie_path, "rb") as f:
        selfie_bytes = f.read()
    
    print(f"✓ Loaded selfie: {len(selfie_bytes)} bytes")
    print(f"=" * 80)
    
    # Test 1: Skin Analysis
    print("\n1️⃣  SKIN ANALYSIS API")
    print("=" * 80)
    try:
        skin_result = await call_api(
            "skin-analysis",
            selfie_bytes,
            {
                "dst_actions": [
                    "wrinkle", "pore", "texture", "acne", "redness", "oiliness",
                    "age_spot", "radiance", "moisture", "dark_circle_v2", "eye_bag",
                    "droopy_upper_eyelid", "droopy_lower_eyelid", "firmness"
                ],
                "format": "json",
                "face_angle_strictness_level": "low"
            }
        )
        print(json.dumps(skin_result, indent=2))
        
        # Check for skin_age
        if "result" in skin_result:
            result = skin_result["result"]
            if "skin_age" in result:
                print(f"\n✓ skin_age found: {result['skin_age']}")
            else:
                print(f"\n✗ skin_age NOT found in result")
                print(f"Available keys in result: {list(result.keys())}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "=" * 80)
    
    # Test 2: Skin Tone Analysis
    print("\n2️⃣  SKIN TONE ANALYSIS API")
    print("=" * 80)
    try:
        tone_result = await call_api(
            "skin-tone-analysis",
            selfie_bytes,
            {"face_angle_strictness_level": "low"}
        )
        print(json.dumps(tone_result, indent=2))
        
        # Check for color fields
        if "results" in tone_result and "color" in tone_result["results"]:
            color = tone_result["results"]["color"]
            print(f"\n✓ Color fields found:")
            for key in ["skin_color", "eye_color", "eye_color_name", "lip_color", 
                       "eyebrow_color", "hair_color", "hair_color_name"]:
                value = color.get(key)
                if value:
                    print(f"  ✓ {key}: {value}")
                else:
                    print(f"  ✗ {key}: NOT FOUND")
        else:
            print(f"\n✗ Color data not found in results")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "=" * 80)
    
    # Test 3: Face Attributes Analysis
    print("\n3️⃣  FACE ATTRIBUTES ANALYSIS API")
    print("=" * 80)
    try:
        face_result = await call_api(
            "face-attr-analysis",
            selfie_bytes,
            {"face_angle_strictness_level": "low"}
        )
        print(json.dumps(face_result, indent=2))
        
        # Check for face attribute fields
        if "results" in face_result:
            results = face_result["results"]
            print(f"\n✓ Face attribute fields found:")
            for key in ["faceShape", "age", "gender", "eyeShape", "eyeSize", 
                       "eyelid", "lipShape", "noseWidth", "noseLength"]:
                value = results.get(key)
                if value is not None:
                    print(f"  ✓ {key}: {value}")
                else:
                    print(f"  ✗ {key}: NOT FOUND")
        else:
            print(f"\n✗ Results not found")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "=" * 80)
    print("\n✅ Test complete!")


if __name__ == "__main__":
    asyncio.run(test_all_apis())
