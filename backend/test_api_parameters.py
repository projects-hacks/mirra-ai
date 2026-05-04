"""Test Perfect Corp API parameters to find correct format."""
import asyncio
import sys
import os
import time
import httpx

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

BASE = settings.PERFECT_CORP_BASE_URL
HEADERS = {"Authorization": f"Bearer {settings.PERFECT_CORP_API_KEY}"}

# Test image URL
TEST_IMAGE_URL = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop&crop=face"


async def upload_test_image(client: httpx.AsyncClient, task_type: str, image_bytes: bytes) -> str:
    """Upload image and return file_id."""
    version = "v2.0"
    file_path = task_type.split("/")[0] if "/" in task_type else task_type
    
    # Request upload URL
    file_res = await client.post(
        f"{BASE}/s2s/{version}/file/{file_path}",
        json={"files": [{"content_type": "image/jpeg", "file_name": "input.jpg", "file_size": len(image_bytes)}]},
        headers=HEADERS,
    )
    file_res.raise_for_status()
    file_data = file_res.json()["data"]["files"][0]
    
    # Upload to S3
    upload_req = file_data["requests"][0]
    await client.put(upload_req["url"], content=image_bytes, headers=upload_req.get("headers", {}))
    
    return file_data["file_id"]


async def test_skin_analysis(client: httpx.AsyncClient, image_bytes: bytes):
    """Test skin-analysis with different dst_actions formats."""
    print("\n" + "=" * 80)
    print("TEST 1: SKIN-ANALYSIS")
    print("=" * 80)
    
    # Test 1: Try with dark_circle (old format)
    print("\n[Test 1a] Using old format: dark_circle, wrinkle, pore...")
    try:
        file_id = await upload_test_image(client, "skin-analysis", image_bytes)
        print(f"✓ Uploaded: {file_id}")
        
        payload = {
            "src_file_id": file_id,
            "dst_actions": ["wrinkle", "pore", "texture", "acne", "dark_circle"]
        }
        print(f"Payload: {payload}")
        
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/skin-analysis",
            json=payload,
            headers=HEADERS,
        )
        print(f"Status: {task_res.status_code}")
        print(f"Response: {task_res.text[:500]}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 2: Try with dark_circle_v2 (new format)
    print("\n[Test 1b] Using new format: dark_circle_v2, wrinkle, pore...")
    try:
        file_id = await upload_test_image(client, "skin-analysis", image_bytes)
        print(f"✓ Uploaded: {file_id}")
        
        payload = {
            "src_file_id": file_id,
            "dst_actions": ["wrinkle", "pore", "texture", "acne", "dark_circle_v2"]
        }
        print(f"Payload: {payload}")
        
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/skin-analysis",
            json=payload,
            headers=HEADERS,
        )
        print(f"Status: {task_res.status_code}")
        print(f"Response: {task_res.text[:500]}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Try with HD versions
    print("\n[Test 1c] Using HD format: hd_wrinkle, hd_pore, hd_dark_circle...")
    try:
        file_id = await upload_test_image(client, "skin-analysis", image_bytes)
        print(f"✓ Uploaded: {file_id}")
        
        payload = {
            "src_file_id": file_id,
            "dst_actions": ["hd_wrinkle", "hd_pore", "hd_texture", "hd_acne", "hd_dark_circle"]
        }
        print(f"Payload: {payload}")
        
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/skin-analysis",
            json=payload,
            headers=HEADERS,
        )
        print(f"Status: {task_res.status_code}")
        print(f"Response: {task_res.text[:500]}")
    except Exception as e:
        print(f"✗ Error: {e}")


async def test_face_attr_analysis(client: httpx.AsyncClient, image_bytes: bytes):
    """Test face-attr-analysis with different features formats."""
    print("\n" + "=" * 80)
    print("TEST 2: FACE-ATTR-ANALYSIS")
    print("=" * 80)
    
    # Test 1: Try with lowercase (old format)
    print("\n[Test 2a] Using lowercase: faceshape, agegender, eyes, lips, nose...")
    try:
        file_id = await upload_test_image(client, "face-attr-analysis", image_bytes)
        print(f"✓ Uploaded: {file_id}")
        
        payload = {
            "src_file_id": file_id,
            "features": ["faceshape", "agegender", "facialratio", "eyes", "lips", "nose"]
        }
        print(f"Payload: {payload}")
        
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/face-attr-analysis",
            json=payload,
            headers=HEADERS,
        )
        print(f"Status: {task_res.status_code}")
        print(f"Response: {task_res.text[:500]}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 2: Try with camelCase (new format)
    print("\n[Test 2b] Using camelCase: faceShape, age, gender, eyeShape, lipShape, noseWidth...")
    try:
        file_id = await upload_test_image(client, "face-attr-analysis", image_bytes)
        print(f"✓ Uploaded: {file_id}")
        
        payload = {
            "src_file_id": file_id,
            "features": ["faceShape", "age", "gender", "eyeShape", "lipShape", "noseWidth", "noseLength"]
        }
        print(f"Payload: {payload}")
        
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/face-attr-analysis",
            json=payload,
            headers=HEADERS,
        )
        print(f"Status: {task_res.status_code}")
        print(f"Response: {task_res.text[:500]}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Try with all available features
    print("\n[Test 2c] Using all available features from error message...")
    try:
        file_id = await upload_test_image(client, "face-attr-analysis", image_bytes)
        print(f"✓ Uploaded: {file_id}")
        
        payload = {
            "src_file_id": file_id,
            "features": [
                "faceShape", "age", "gender",
                "eyeShape", "eyeSize", "eyelid",
                "lipShape", "noseWidth", "noseLength",
                "eyeColor", "lipColor", "eyebrowColor", "hairColor"
            ]
        }
        print(f"Payload: {payload}")
        
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/face-attr-analysis",
            json=payload,
            headers=HEADERS,
        )
        print(f"Status: {task_res.status_code}")
        print(f"Response: {task_res.text[:500]}")
    except Exception as e:
        print(f"✗ Error: {e}")


async def test_skin_tone_analysis(client: httpx.AsyncClient, image_bytes: bytes):
    """Test skin-tone-analysis."""
    print("\n" + "=" * 80)
    print("TEST 3: SKIN-TONE-ANALYSIS")
    print("=" * 80)
    
    print("\n[Test 3a] Basic skin-tone-analysis...")
    try:
        file_id = await upload_test_image(client, "skin-tone-analysis", image_bytes)
        print(f"✓ Uploaded: {file_id}")
        
        payload = {
            "src_file_id": file_id
        }
        print(f"Payload: {payload}")
        
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/skin-tone-analysis",
            json=payload,
            headers=HEADERS,
        )
        print(f"Status: {task_res.status_code}")
        
        if task_res.status_code == 200:
            task_id = task_res.json()["data"]["task_id"]
            print(f"✓ Task created: {task_id}")
            
            # Poll for result
            print("Polling for result...")
            for i in range(10):
                await asyncio.sleep(2)
                poll_res = await client.get(
                    f"{BASE}/s2s/v2.0/task/skin-tone-analysis/{task_id}",
                    headers=HEADERS,
                )
                data = poll_res.json()["data"]
                status = data.get("task_status")
                print(f"  Poll {i+1}: {status}")
                
                if status == "success":
                    print(f"✓ Success! Response: {data}")
                    break
                elif status == "error":
                    print(f"✗ Error: {data}")
                    break
        else:
            print(f"Response: {task_res.text[:500]}")
    except Exception as e:
        print(f"✗ Error: {e}")


async def main():
    """Run all tests."""
    print("=" * 80)
    print("PERFECT CORP API PARAMETER TESTING")
    print("=" * 80)
    print(f"\nAPI Key: {settings.PERFECT_CORP_API_KEY[:8]}...{settings.PERFECT_CORP_API_KEY[-4:]}")
    print(f"Base URL: {BASE}")
    
    # Download test image
    print("\nDownloading test image...")
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as img_client:
        img_resp = await img_client.get(TEST_IMAGE_URL)
        img_resp.raise_for_status()
        image_bytes = img_resp.content
    print(f"✓ Downloaded {len(image_bytes):,} bytes")
    
    # Run tests
    async with httpx.AsyncClient(timeout=60) as client:
        await test_skin_analysis(client, image_bytes)
        await test_face_attr_analysis(client, image_bytes)
        await test_skin_tone_analysis(client, image_bytes)
    
    print("\n" + "=" * 80)
    print("TESTING COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
