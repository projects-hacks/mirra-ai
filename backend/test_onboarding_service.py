"""Test onboarding service implementation."""
import asyncio
import base64
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.onboarding import OnboardingService, DEMO_CLOSET_ITEMS, _retry_with_backoff


async def test_init():
    """Test init method."""
    service = OnboardingService()
    
    with patch('app.services.onboarding.supabase') as mock_supabase:
        # Mock profile response
        mock_profile = MagicMock()
        mock_profile.data = {"id": "user-123", "email": "test@example.com", "onboarded": False}
        mock_profile_query = MagicMock()
        mock_profile_query.single.return_value.execute.return_value = mock_profile
        
        # Mock preferences response
        mock_prefs = MagicMock()
        mock_prefs.data = {"user_id": "user-123", "budget_min": 0, "budget_max": 500}
        mock_prefs_query = MagicMock()
        mock_prefs_query.single.return_value.execute.return_value = mock_prefs
        
        # Setup mock chain
        mock_supabase.from_.side_effect = [
            MagicMock(select=lambda *args: MagicMock(eq=lambda *args: mock_profile_query)),
            MagicMock(select=lambda *args: MagicMock(eq=lambda *args: mock_prefs_query)),
        ]
        
        result = service.init("user-123")
        
        assert result["success"] is True
        assert result["profile"]["id"] == "user-123"
        assert result["preferences"]["user_id"] == "user-123"
        print("✓ test_init passed")


async def test_analyze():
    """Test analyze method with mocked API calls."""
    service = OnboardingService()
    
    # Create a simple test image (1x1 pixel JPEG)
    test_image = base64.b64encode(b'\xff\xd8\xff\xe0\x00\x10JFIF').decode()
    selfie_base64 = f"data:image/jpeg;base64,{test_image}"
    
    with patch('app.services.onboarding.supabase') as mock_supabase, \
         patch('app.services.onboarding._call_api_with_circuit_breaker') as mock_api, \
         patch('app.services.onboarding.cache_set') as _mock_cache:
        
        # Mock API responses
        mock_api.side_effect = [
            # skin-analysis
            {
                "data": {
                    "result": {
                        "all": 75,
                        "moisture": {"score": 70},
                        "acne": {"score": 85},
                        "wrinkle": {"score": 80},
                        "pore": {"score": 75},
                        "dark_circle_v2": {"score": 60},
                    }
                }
            },
            # skin-tone
            {
                "data": {
                    "result": {
                        "skin_tone": {
                            "undertone": "warm",
                            "depth": "medium",
                            "hex": "#D4A574",
                        },
                        "color_season": "warm_autumn",
                    }
                }
            },
            # face-attributes
            {
                "data": {
                    "result": {
                        "face_shape": "oval",
                        "symmetry_score": 87.5,
                        "face_proportions": {"forehead_ratio": 0.33},
                    }
                }
            },
        ]
        
        # Mock database responses
        mock_upsert = MagicMock()
        mock_upsert.execute.return_value = MagicMock(data=[{"user_id": "user-123"}])
        mock_insert = MagicMock()
        mock_insert.execute.return_value = MagicMock(data=[{"user_id": "user-123"}])
        
        mock_supabase.from_.side_effect = [
            MagicMock(upsert=lambda *args: mock_upsert),
            MagicMock(insert=lambda *args: mock_insert),
        ]
        
        result = await service.analyze("user-123", selfie_base64)
        
        assert result["success"] is True
        assert result["body_model"]["skin_scores"]["overall"] == 75
        assert result["body_model"]["skin_tone"]["undertone"] == "warm"
        assert result["body_model"]["face_shape"]["shape"] == "oval"
        assert "greeting" in result
        assert "dark circles" in result["greeting"]  # Score is 60, below 70
        print("✓ test_analyze passed")


async def test_seed_closet():
    """Test seed_closet method."""
    service = OnboardingService()
    
    with patch('app.services.onboarding.supabase') as mock_supabase, \
         patch('app.services.onboarding.cache_set') as _mock_cache:
        
        # Mock database response
        mock_insert = MagicMock()
        mock_insert.execute.return_value = MagicMock(data=[{"id": f"item-{i}"} for i in range(15)])
        mock_supabase.from_.return_value.insert.return_value = mock_insert
        
        result = await service.seed_closet("user-123")
        
        assert result["success"] is True
        assert result["item_count"] == 15
        
        # Verify insert was called with correct data
        call_args = mock_supabase.from_.return_value.insert.call_args[0][0]
        assert len(call_args) == 15
        assert all(item["user_id"] == "user-123" for item in call_args)
        
        # Verify category distribution
        categories = [item["category"] for item in call_args]
        assert categories.count("jacket") >= 2
        assert categories.count("dress") >= 2
        assert categories.count("top") >= 2
        assert categories.count("bottom") >= 2
        assert categories.count("shoes") >= 2
        
        print("✓ test_seed_closet passed")


async def test_complete():
    """Test complete method."""
    service = OnboardingService()
    
    with patch('app.services.onboarding.supabase') as mock_supabase:
        # Mock profile update
        mock_profile_update = MagicMock()
        mock_profile_update.execute.return_value = MagicMock(
            data=[{"id": "user-123", "onboarded": True}]
        )
        
        # Mock preferences update
        mock_prefs_update = MagicMock()
        mock_prefs_update.execute.return_value = MagicMock(data=[{"user_id": "user-123"}])
        
        mock_supabase.from_.side_effect = [
            MagicMock(update=lambda *args: MagicMock(eq=lambda *args: mock_profile_update)),
            MagicMock(update=lambda *args: MagicMock(eq=lambda *args: mock_prefs_update)),
        ]
        
        result = await service.complete("user-123", calendar_connected=True)
        
        assert result["success"] is True
        assert result["profile"]["onboarded"] is True
        print("✓ test_complete passed")


async def test_retry_with_backoff():
    """Test retry logic with exponential backoff."""
    call_count = 0
    
    async def failing_fn():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise RuntimeError("Temporary failure")
        return "success"
    
    result = await _retry_with_backoff(failing_fn, max_retries=2, base_delay=0.01)
    
    assert result == "success"
    assert call_count == 3  # Initial + 2 retries
    print("✓ test_retry_with_backoff passed")


async def test_greeting_generation():
    """Test greeting generation logic."""
    service = OnboardingService()
    
    # Test with low dark circles score
    greeting1 = service._generate_greeting({
        "overall": 75,
        "moisture": 80,
        "acne": 85,
        "wrinkles": 80,
        "pores": 75,
        "dark_circles": 60,
    })
    assert "75" in greeting1
    assert "dark circles" in greeting1
    
    # Test with all good scores
    greeting2 = service._generate_greeting({
        "overall": 90,
        "moisture": 85,
        "acne": 90,
        "wrinkles": 88,
        "pores": 87,
        "dark_circles": 85,
    })
    assert "90" in greeting2
    assert "great" in greeting2
    
    print("✓ test_greeting_generation passed")


async def test_demo_closet_items_structure():
    """Test that demo closet items have correct structure."""
    assert len(DEMO_CLOSET_ITEMS) == 15
    
    # Check category distribution
    categories = [item["category"] for item in DEMO_CLOSET_ITEMS]
    assert categories.count("jacket") >= 2
    assert categories.count("dress") >= 2
    assert categories.count("top") >= 2
    assert categories.count("bottom") >= 2
    assert categories.count("shoes") >= 2
    
    # Check required fields
    required_fields = [
        "name", "category", "subcategory", "color", "color_hex",
        "brand", "price", "occasions", "seasons", "formality", "image_url"
    ]
    
    for item in DEMO_CLOSET_ITEMS:
        for field in required_fields:
            assert field in item, f"Missing field {field} in item {item['name']}"
        
        # Check formality range
        assert 0 <= item["formality"] <= 1
        
        # Check occasions and seasons are lists
        assert isinstance(item["occasions"], list)
        assert isinstance(item["seasons"], list)
        assert len(item["occasions"]) > 0
        assert len(item["seasons"]) > 0
    
    # Check for navy blazer with high formality
    navy_blazer = next((item for item in DEMO_CLOSET_ITEMS if "Navy" in item["name"] and "Blazer" in item["name"]), None)
    assert navy_blazer is not None
    assert navy_blazer["formality"] >= 0.8
    assert "business" in navy_blazer["occasions"]
    
    # Check for casual items
    casual_items = [item for item in DEMO_CLOSET_ITEMS if item["formality"] < 0.4]
    assert len(casual_items) >= 3
    
    print("✓ test_demo_closet_items_structure passed")


async def main():
    """Run all tests."""
    print("\n=== Running Onboarding Service Tests ===\n")
    
    try:
        await test_init()
        await test_analyze()
        await test_seed_closet()
        await test_complete()
        await test_retry_with_backoff()
        await test_greeting_generation()
        await test_demo_closet_items_structure()
        
        print("\n✅ All tests passed!\n")
        return 0
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
