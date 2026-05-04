"""Tests for AI Metadata Extractor service."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import json

from app.services.ai_metadata_extractor import (
    AIMetadataExtractor,
    AIMetadataExtractorError,
    extract_metadata,
)
from app.models.closet import ExtractedMetadata


@pytest.fixture
def mock_api_key():
    """Mock API key for testing."""
    return "test-api-key-12345"


@pytest.fixture
def sample_image_url():
    """Sample image URL for testing."""
    return "https://example.com/test-image.jpg"


@pytest.fixture
def sample_image_data():
    """Sample image data (fake JPEG bytes)."""
    return b"\xff\xd8\xff\xe0\x00\x10JFIF"  # JPEG header


@pytest.fixture
def sample_gemini_response():
    """Sample successful Gemini API response."""
    return {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps({
                                "category": "dress",
                                "subcategory": "midi dress",
                                "primary_color": "navy blue",
                                "color_hex": "#1E3A8A",
                                "secondary_colors": ["white"],
                                "brand": "Unknown",
                                "material": "cotton",
                                "pattern": "solid",
                                "formality": 0.7,
                                "occasions": ["work", "date"],
                                "seasons": ["spring", "summer", "fall"],
                                "confidence_scores": {
                                    "category": 0.95,
                                    "color": 0.90,
                                    "brand": 0.30
                                }
                            })
                        }
                    ]
                }
            }
        ]
    }


@pytest.fixture
def sample_metadata():
    """Sample extracted metadata."""
    return ExtractedMetadata(
        category="dress",
        subcategory="midi dress",
        primary_color="navy blue",
        color_hex="#1E3A8A",
        secondary_colors=["white"],
        brand="Unknown",
        material="cotton",
        pattern="solid",
        formality=0.7,
        occasions=["work", "date"],
        seasons=["spring", "summer", "fall"],
        confidence_scores={
            "category": 0.95,
            "color": 0.90,
            "brand": 0.30
        }
    )


class TestAIMetadataExtractor:
    """Test suite for AIMetadataExtractor."""
    
    def test_init_with_api_key(self, mock_api_key):
        """Test initialization with explicit API key."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        assert extractor.api_key == mock_api_key
    
    def test_init_without_api_key_raises_error(self):
        """Test initialization without API key raises error."""
        with patch('app.services.ai_metadata_extractor.settings') as mock_settings:
            mock_settings.GOOGLE_AI_STUDIO_KEY = ""
            with pytest.raises(ValueError, match="GOOGLE_AI_STUDIO_KEY is required"):
                AIMetadataExtractor()
    
    @pytest.mark.asyncio
    async def test_extract_metadata_success(
        self,
        mock_api_key,
        sample_image_url,
        sample_image_data,
        sample_gemini_response,
        sample_metadata
    ):
        """Test successful metadata extraction."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        
        # Mock the download and API call
        with patch.object(extractor, '_download_image', new_callable=AsyncMock) as mock_download:
            with patch.object(extractor, '_call_gemini_vision', new_callable=AsyncMock) as mock_api:
                mock_download.return_value = sample_image_data
                mock_api.return_value = sample_gemini_response
                
                result = await extractor.extract_metadata(sample_image_url)
                
                assert result.category == sample_metadata.category
                assert result.primary_color == sample_metadata.primary_color
                assert result.color_hex == sample_metadata.color_hex
                assert result.formality == sample_metadata.formality
                
                mock_download.assert_called_once_with(sample_image_url)
                mock_api.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_extract_metadata_with_user_context(
        self,
        mock_api_key,
        sample_image_url,
        sample_image_data,
        sample_gemini_response
    ):
        """Test metadata extraction with user context."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        user_context = {"preferred_brands": ["Nike", "Adidas"]}
        
        with patch.object(extractor, '_download_image', new_callable=AsyncMock) as mock_download:
            with patch.object(extractor, '_call_gemini_vision', new_callable=AsyncMock) as mock_api:
                mock_download.return_value = sample_image_data
                mock_api.return_value = sample_gemini_response
                
                await extractor.extract_metadata(sample_image_url, user_context)
                
                # Verify user context was passed to API call
                mock_api.assert_called_once_with(sample_image_data, user_context)
    
    @pytest.mark.asyncio
    async def test_extract_metadata_retry_on_rate_limit(
        self,
        mock_api_key,
        sample_image_url,
        sample_image_data,
        sample_gemini_response
    ):
        """Test retry logic on rate limit error."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        
        with patch.object(extractor, '_download_image', new_callable=AsyncMock) as mock_download:
            with patch.object(extractor, '_call_gemini_vision', new_callable=AsyncMock) as mock_api:
                mock_download.return_value = sample_image_data
                
                # First call fails with rate limit, second succeeds
                mock_api.side_effect = [
                    AIMetadataExtractorError("rate_limit", "Rate limit exceeded"),
                    sample_gemini_response
                ]
                
                # Should succeed after retry
                result = await extractor.extract_metadata(sample_image_url)
                assert result.category == "dress"
                assert mock_api.call_count == 2
    
    @pytest.mark.asyncio
    async def test_extract_metadata_fails_after_max_retries(
        self,
        mock_api_key,
        sample_image_url,
        sample_image_data
    ):
        """Test failure after max retries."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        
        with patch.object(extractor, '_download_image', new_callable=AsyncMock) as mock_download:
            with patch.object(extractor, '_call_gemini_vision', new_callable=AsyncMock) as mock_api:
                mock_download.return_value = sample_image_data
                
                # Always fail with rate limit
                mock_api.side_effect = AIMetadataExtractorError("rate_limit", "Rate limit exceeded")
                
                with pytest.raises(AIMetadataExtractorError, match="rate_limit"):
                    await extractor.extract_metadata(sample_image_url)
                
                assert mock_api.call_count == 3  # Max retries
    
    @pytest.mark.asyncio
    async def test_parse_response_with_markdown_code_blocks(self, mock_api_key):
        """Test parsing response with markdown code blocks."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        
        # Response with markdown code blocks
        response_data = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "```json\n" + json.dumps({
                                    "category": "jacket",
                                    "primary_color": "black",
                                    "color_hex": "#000000",
                                    "formality": 0.6,
                                    "occasions": ["casual"],
                                    "seasons": ["fall", "winter"],
                                    "confidence_scores": {}
                                }) + "\n```"
                            }
                        ]
                    }
                }
            ]
        }
        
        result = extractor._parse_response(response_data)
        assert result.category == "jacket"
        assert result.primary_color == "black"
    
    @pytest.mark.asyncio
    async def test_parse_response_invalid_json(self, mock_api_key):
        """Test parsing response with invalid JSON."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        
        response_data = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "This is not valid JSON"
                            }
                        ]
                    }
                }
            ]
        }
        
        with pytest.raises(AIMetadataExtractorError, match="json_parse_error"):
            extractor._parse_response(response_data)
    
    @pytest.mark.asyncio
    async def test_parse_response_missing_required_fields(self, mock_api_key):
        """Test parsing response with missing required fields."""
        extractor = AIMetadataExtractor(api_key=mock_api_key)
        
        response_data = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": json.dumps({
                                    "category": "dress"
                                    # Missing required fields: primary_color, color_hex
                                })
                            }
                        ]
                    }
                }
            ]
        }
        
        with pytest.raises(AIMetadataExtractorError, match="validation_error"):
            extractor._parse_response(response_data)


class TestExtractedMetadata:
    """Test suite for ExtractedMetadata model."""
    
    def test_valid_metadata(self):
        """Test creating valid metadata."""
        metadata = ExtractedMetadata(
            category="dress",
            primary_color="blue",
            color_hex="#0000FF",
            formality=0.5
        )
        assert metadata.category == "dress"
        assert metadata.color_hex == "#0000FF"
    
    def test_hex_color_validation(self):
        """Test hex color validation."""
        # Valid hex without #
        metadata = ExtractedMetadata(
            category="dress",
            primary_color="blue",
            color_hex="0000FF",
            formality=0.5
        )
        assert metadata.color_hex == "#0000FF"
        
        # Invalid hex
        with pytest.raises(ValueError, match="Invalid hex color"):
            ExtractedMetadata(
                category="dress",
                primary_color="blue",
                color_hex="invalid",
                formality=0.5
            )
    
    def test_formality_validation(self):
        """Test formality range validation."""
        # Valid formality
        metadata = ExtractedMetadata(
            category="dress",
            primary_color="blue",
            color_hex="#0000FF",
            formality=0.5
        )
        assert metadata.formality == 0.5
        
        # Invalid formality (too high)
        with pytest.raises(ValueError):
            ExtractedMetadata(
                category="dress",
                primary_color="blue",
                color_hex="#0000FF",
                formality=1.5
            )
        
        # Invalid formality (negative)
        with pytest.raises(ValueError):
            ExtractedMetadata(
                category="dress",
                primary_color="blue",
                color_hex="#0000FF",
                formality=-0.1
            )
    
    def test_default_values(self):
        """Test default values for optional fields."""
        metadata = ExtractedMetadata(
            category="dress",
            primary_color="blue",
            color_hex="#0000FF"
        )
        assert metadata.brand == "Unknown"
        assert metadata.formality == 0.5
        assert metadata.secondary_colors == []
        assert metadata.occasions == []
        assert metadata.seasons == []
        assert metadata.confidence_scores == {}


@pytest.mark.asyncio
async def test_convenience_function(mock_api_key, sample_image_url, sample_gemini_response):
    """Test the convenience extract_metadata function."""
    with patch('app.services.ai_metadata_extractor.settings') as mock_settings:
        mock_settings.GOOGLE_AI_STUDIO_KEY = mock_api_key
        
        with patch('app.services.ai_metadata_extractor.AIMetadataExtractor.extract_metadata', new_callable=AsyncMock) as mock_extract:
            expected_metadata = ExtractedMetadata(
                category="dress",
                primary_color="blue",
                color_hex="#0000FF",
                formality=0.5
            )
            mock_extract.return_value = expected_metadata
            
            result = await extract_metadata(sample_image_url)
            
            assert result == expected_metadata
            mock_extract.assert_called_once_with(sample_image_url, None)
