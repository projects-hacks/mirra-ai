"""AI Metadata Extractor service using Gemini 3.1 Pro Vision API."""
import asyncio
import json
import logging
from typing import Optional, Dict, Any

import httpx

from app.core.config import settings
from app.core.llm_config import (
    GEMINI_API_BASE_URL,
    GEMINI_MODEL_NAME,
    GEMINI_TEMPERATURE,
    GEMINI_TOP_K,
    GEMINI_TOP_P,
    GEMINI_MAX_OUTPUT_TOKENS,
    GEMINI_TIMEOUT_SECONDS,
    MAX_RETRIES,
    RETRY_BASE_DELAY_SECONDS,
    IMAGE_DOWNLOAD_TIMEOUT_SECONDS,
)
from app.core.closet_constants import (
    get_all_categories,
    get_all_occasions,
    get_all_seasons,
)
from app.models.closet import ExtractedMetadata

logger = logging.getLogger(__name__)


# Extraction prompt for Gemini Vision
def _build_extraction_prompt() -> str:
    """Build the extraction prompt with current constants."""
    categories = ", ".join(get_all_categories())
    occasions = ", ".join(get_all_occasions())
    seasons = ", ".join(get_all_seasons())
    
    return f"""
Analyze this clothing/accessory item and extract the following information:

1. **Category**: Choose ONE from: {categories}

2. **Subcategory**: More specific type (e.g., "midi dress", "bomber jacket")

3. **Primary Color**: The dominant color name

4. **Color Hex**: Approximate hex code for the primary color (format: #RRGGBB)

5. **Secondary Colors**: List of other prominent colors (if any)

6. **Brand**: If visible on tags or recognizable by design (or "Unknown")

7. **Material**: Fabric type if identifiable (cotton, leather, denim, etc.)

8. **Pattern**: solid, striped, floral, plaid, etc.

9. **Formality**: Rate 0.0-1.0 (0=very casual, 0.5=smart casual, 1.0=formal)

10. **Occasions**: List of suitable occasions ({occasions})

11. **Seasons**: List of suitable seasons ({seasons})

12. **Confidence Scores**: For each field, provide confidence 0.0-1.0

Return ONLY valid JSON matching this exact schema (no markdown, no code blocks):
{{
  "category": "string",
  "subcategory": "string",
  "primary_color": "string",
  "color_hex": "#RRGGBB",
  "secondary_colors": ["string"],
  "brand": "string",
  "material": "string",
  "pattern": "string",
  "formality": 0.5,
  "occasions": ["string"],
  "seasons": ["string"],
  "confidence_scores": {{
    "category": 0.95,
    "color": 0.90,
    "brand": 0.60
  }}
}}
"""


EXTRACTION_PROMPT = _build_extraction_prompt()


class AIMetadataExtractorError(Exception):
    """Custom exception for AI metadata extraction errors."""
    
    def __init__(self, error_code: str, error_message: str):
        self.error_code = error_code
        self.error_message = error_message
        super().__init__(f"{error_code}: {error_message}")
    
    def is_retryable(self) -> bool:
        """Check if this error should be retried."""
        retryable_codes = ["rate_limit", "timeout", "server_error", "network_error"]
        return any(code in self.error_code.lower() for code in retryable_codes)


class AIMetadataExtractor:
    """Extract closet item metadata from images using Gemini Vision API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the extractor with API key."""
        self.api_key = api_key or settings.GEMINI_API_KEY or settings.GOOGLE_AI_STUDIO_KEY
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is required for AI metadata extraction")
    
    async def extract_metadata(
        self,
        image_url: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> ExtractedMetadata:
        """
        Analyze closet item image and extract structured metadata.
        
        Args:
            image_url: URL to the closet item image
            user_context: Optional user preferences for better extraction
            
        Returns:
            ExtractedMetadata with category, color, brand, etc.
            
        Raises:
            AIMetadataExtractorError: If extraction fails
        """
        logger.info(f"Extracting metadata from image: {image_url}")
        
        # Retry logic for transient errors
        for attempt in range(MAX_RETRIES):
            try:
                # Download the image
                image_data = await self._download_image(image_url)
                
                # Call Gemini Vision API
                response_data = await self._call_gemini_vision(image_data, user_context)
                
                # Parse and validate response
                metadata = self._parse_response(response_data)
                
                logger.info(f"Successfully extracted metadata: category={metadata.category}, color={metadata.primary_color}")
                return metadata
                
            except AIMetadataExtractorError as e:
                if e.is_retryable() and attempt < MAX_RETRIES - 1:
                    delay = RETRY_BASE_DELAY_SECONDS * (attempt + 1)
                    logger.warning(f"Retryable error on attempt {attempt + 1}/{MAX_RETRIES}: {e}")
                    await asyncio.sleep(delay)
                    continue
                else:
                    logger.error(f"Failed to extract metadata after {attempt + 1} attempts: {e}")
                    raise
            except Exception as e:
                logger.error(f"Unexpected error during metadata extraction: {e}")
                raise AIMetadataExtractorError("unexpected_error", str(e))
    
    async def _download_image(self, image_url: str) -> bytes:
        """Download image from URL."""
        try:
            async with httpx.AsyncClient(timeout=IMAGE_DOWNLOAD_TIMEOUT_SECONDS) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                return response.content
        except httpx.TimeoutException:
            raise AIMetadataExtractorError("timeout", "Image download timed out")
        except httpx.HTTPStatusError as e:
            raise AIMetadataExtractorError("download_error", f"Failed to download image: {e}")
        except Exception as e:
            raise AIMetadataExtractorError("network_error", f"Network error: {e}")
    
    async def _call_gemini_vision(
        self,
        image_data: bytes,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Call Gemini Vision API with image and prompt."""
        import base64
        
        # Encode image to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Build the request payload
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": EXTRACTION_PROMPT
                        },
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": GEMINI_TEMPERATURE,
                "topK": GEMINI_TOP_K,
                "topP": GEMINI_TOP_P,
                "maxOutputTokens": GEMINI_MAX_OUTPUT_TOKENS,
            }
        }
        
        # Add user context if provided
        if user_context:
            context_text = f"\n\nUser context: {json.dumps(user_context)}"
            payload["contents"][0]["parts"][0]["text"] += context_text
        
        # Call Gemini API
        url = f"{GEMINI_API_BASE_URL}/models/{GEMINI_MODEL_NAME}:generateContent"
        headers = {
            "Content-Type": "application/json"
        }
        params = {
            "key": self.api_key
        }
        
        try:
            async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                    params=params
                )
                
                # Handle rate limiting
                if response.status_code == 429:
                    raise AIMetadataExtractorError("rate_limit", "API rate limit exceeded")
                
                # Handle server errors
                if response.status_code >= 500:
                    raise AIMetadataExtractorError("server_error", f"Server error: {response.status_code}")
                
                # Handle client errors
                if response.status_code >= 400:
                    error_detail = response.text
                    raise AIMetadataExtractorError(
                        f"api_error_{response.status_code}",
                        f"API error: {error_detail}"
                    )
                
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            raise AIMetadataExtractorError("timeout", "Gemini API request timed out")
        except AIMetadataExtractorError:
            raise
        except Exception as e:
            raise AIMetadataExtractorError("api_call_error", f"Failed to call Gemini API: {e}")
    
    def _parse_response(self, response_data: Dict[str, Any]) -> ExtractedMetadata:
        """Parse Gemini API response and extract metadata."""
        try:
            # Extract the generated text from response
            candidates = response_data.get("candidates", [])
            if not candidates:
                raise AIMetadataExtractorError("parse_error", "No candidates in response")
            
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            if not parts:
                raise AIMetadataExtractorError("parse_error", "No parts in response content")
            
            text = parts[0].get("text", "")
            if not text:
                raise AIMetadataExtractorError("parse_error", "Empty text in response")
            
            # Clean up the response (remove markdown code blocks if present)
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            # Parse JSON
            try:
                metadata_dict = json.loads(text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {text}")
                raise AIMetadataExtractorError("json_parse_error", f"Invalid JSON: {e}")
            
            # Validate and create ExtractedMetadata object
            try:
                metadata = ExtractedMetadata(**metadata_dict)
                return metadata
            except Exception as e:
                logger.error(f"Failed to validate metadata: {e}")
                raise AIMetadataExtractorError("validation_error", f"Invalid metadata format: {e}")
                
        except AIMetadataExtractorError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error parsing response: {e}")
            raise AIMetadataExtractorError("parse_error", f"Failed to parse response: {e}")


# Singleton instance
_extractor: Optional[AIMetadataExtractor] = None


def get_extractor() -> AIMetadataExtractor:
    """Get or create the singleton AIMetadataExtractor instance."""
    global _extractor
    if _extractor is None:
        _extractor = AIMetadataExtractor()
    return _extractor


async def extract_metadata(
    image_url: str,
    user_context: Optional[Dict[str, Any]] = None
) -> ExtractedMetadata:
    """
    Convenience function to extract metadata from an image URL.
    
    Args:
        image_url: URL to the closet item image
        user_context: Optional user preferences for better extraction
        
    Returns:
        ExtractedMetadata with category, color, brand, etc.
    """
    extractor = get_extractor()
    return await extractor.extract_metadata(image_url, user_context)
