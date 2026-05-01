"""VTO router — direct REST endpoints for non-voice VTO calls."""
import base64
from fastapi import APIRouter
from pydantic import BaseModel

from app.services import perfectcorp

router = APIRouter()


class SkinAnalysisRequest(BaseModel):
    image: str  # base64


class TryOnRequest(BaseModel):
    selfie: str  # base64
    product_id: str
    vto_type: str  # clothes, earrings, etc.


@router.post("/skin-analysis")
async def skin_analysis(req: SkinAnalysisRequest):
    image_bytes = base64.b64decode(req.image)
    result = await perfectcorp.call_api("skin-analysis", image_bytes, {
        "dst_actions": ["wrinkle", "pore", "texture", "acne", "moisture", "oiliness", "redness", "radiance", "firmness", "dark_circle_v2", "eye_bag", "age_spot"],
        "format": "json",
    })
    return {"scores": result}


@router.post("/try-on")
async def try_on(req: TryOnRequest):
    selfie_bytes = base64.b64decode(req.selfie)
    result = await perfectcorp.call_api(f"{req.vto_type}-vto", selfie_bytes, {"product_id": req.product_id})
    return result
