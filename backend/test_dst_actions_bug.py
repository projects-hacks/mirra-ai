"""Test that dst_actions is properly included in the API payload."""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.perfectcorp import call_api

# Test image URL
TEST_IMAGE_URL = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop&crop=face"


async def test_dst_actions_included():
    """Verify that dst_actions is included in the API request."""
    import httpx
    
    print("=" * 80)
    print("TEST: dst_actions Parameter Bug Fix")
    print("=" * 80)
    
    # Download test image
    print("\n[1/2] Downloading test image...")
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        img_resp = await client.get(TEST_IMAGE_URL)
        img_resp.raise_for_status()
        image_bytes = img_resp.content
    print(f"✓ Downloaded {len(image_bytes):,} bytes")
    
    # Test skin-analysis with dst_actions
    print("\n[2/2] Testing skin-analysis with dst_actions...")
    try:
        result = await call_api("skin-analysis", image_bytes, {
            "dst_actions": ["wrinkle", "pore", "texture", "acne", "dark_circle_v2"],
            "format": "json",
            "face_angle_strictness_level": "low"
        })
        
        print(f"✓ API call succeeded!")
        print(f"  Task status: {result.get('task_status')}")
        
        # Check if we got results
        results = result.get("result", result.get("results", {}))
        if results:
            print(f"  ✓ Got results with {len(results)} keys")
            print(f"  Result keys: {list(results.keys())}")
            
            # Check for expected metrics
            expected_metrics = ["wrinkle", "pore", "texture", "acne", "dark_circle_v2"]
            found_metrics = [m for m in expected_metrics if m in results]
            print(f"  ✓ Found {len(found_metrics)}/{len(expected_metrics)} expected metrics")
            
            # Also check if results has 'output' array (alternative format)
            if "output" in results:
                output = results["output"]
                print(f"  ✓ Found 'output' array with {len(output)} items")
                if output:
                    print(f"  Sample output item: {output[0]}")
            
            if len(found_metrics) == len(expected_metrics) or "output" in results:
                print("\n" + "=" * 80)
                print("✅ TEST PASSED - dst_actions is properly included!")
                print("=" * 80)
                return True
            else:
                print(f"\n⚠️  Missing metrics: {set(expected_metrics) - set(found_metrics)}")
        else:
            print("  ⚠️  No results in response")
            
    except Exception as e:
        print(f"✗ API call failed: {e}")
        
        # Check if it's the dst_actions error
        if "dst_actions" in str(e):
            print("\n" + "=" * 80)
            print("❌ TEST FAILED - dst_actions is still missing from payload!")
            print("=" * 80)
            return False
        else:
            print(f"\n⚠️  Different error (not dst_actions related): {e}")
    
    return False


if __name__ == "__main__":
    success = asyncio.run(test_dst_actions_included())
    sys.exit(0 if success else 1)
