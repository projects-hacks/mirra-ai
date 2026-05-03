"""Quick test: hit Perfect Corp Skin Analysis API with a real image."""
import asyncio
import sys
import os
import time

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.services.perfectcorp import call_api, upload_image

# Tight crop portrait — face must fill >60% of image width per PC docs
TEST_IMAGE_URL = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop&crop=face"


async def test_skin_analysis():
    """Test the full skin analysis pipeline: upload → task → poll → result."""
    import httpx

    print("=" * 60)
    print("MIRRA — Perfect Corp Live API Test")
    print("=" * 60)
    print(f"\nAPI Key: {settings.PERFECT_CORP_API_KEY[:8]}...{settings.PERFECT_CORP_API_KEY[-4:]}")
    print(f"Base URL: {settings.PERFECT_CORP_BASE_URL}")
    print(f"USE_MOCKS: {settings.USE_MOCKS}")
    print()

    # Step 1: Download a test image
    print("[1/4] Downloading test image...")
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        img_resp = await client.get(TEST_IMAGE_URL)
        img_resp.raise_for_status()
        image_bytes = img_resp.content
    print(f"  ✅ Downloaded {len(image_bytes):,} bytes ({len(image_bytes)/1024:.0f} KB)")

    # Step 2: Test skin analysis (SD — wrinkle, pore, texture, acne)
    print("\n[2/4] Running Skin Analysis (SD: wrinkle, pore, texture, acne)...")
    t0 = time.time()
    try:
        result = await call_api("skin-analysis", image_bytes, {
            "dst_actions": ["wrinkle", "pore", "texture", "acne"],
            "format": "json",
        })
        elapsed = time.time() - t0
        print(f"  ✅ Completed in {elapsed:.1f}s")
        print(f"  Task status: {result.get('task_status')}")

        # Extract scores
        results = result.get("results", result.get("result", {}))
        if isinstance(results, dict):
            output = results.get("output", [])
            if isinstance(output, list):
                for item in output:
                    print(f"  • {item.get('type', '?')}: ui_score={item.get('ui_score')}, raw_score={item.get('raw_score', 0):.1f}")
            else:
                # Might be score_info format
                for k, v in results.items():
                    if isinstance(v, dict) and "ui_score" in v:
                        print(f"  • {k}: ui_score={v['ui_score']}, raw_score={v.get('raw_score', 0):.1f}")
                    elif k == "all" and isinstance(v, dict):
                        print(f"  • overall: {v.get('score', '?')}")
                    elif k == "skin_age":
                        print(f"  • skin_age: {v}")

    except Exception as e:
        elapsed = time.time() - t0
        print(f"  ❌ FAILED after {elapsed:.1f}s: {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = asyncio.run(test_skin_analysis())
    sys.exit(0 if success else 1)
