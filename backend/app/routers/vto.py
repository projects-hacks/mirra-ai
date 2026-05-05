"""VTO router — direct REST endpoints for non-voice VTO calls."""
import base64
import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services import perfectcorp
from app.core.deps import read_image
from app.tools import fashion_tools, beauty_tools, accessory_tools, hair_tools

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


@router.post("/clothes")
async def try_on_clothes(
    selfie: UploadFile = File(...),
    garment_url: str = Form(...),
    garment_category: str = Form(default="upper"),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    return await fashion_tools.try_on_clothes(selfie_bytes, garment_url, garment_category)


@router.post("/makeup")
async def try_on_makeup(
    selfie: UploadFile = File(...),
    effects: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    try:
        parsed_effects = json.loads(effects)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid effects JSON") from exc
    if not isinstance(parsed_effects, list):
        raise HTTPException(status_code=400, detail="effects must be a JSON array")
    return await beauty_tools.try_on_makeup(selfie_bytes, parsed_effects)


@router.post("/earrings")
async def try_on_earrings(
    selfie: UploadFile = File(...),
    earring_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    return await accessory_tools.try_on_earrings(selfie_bytes, earring_url)


@router.post("/necklace")
async def try_on_necklace(
    selfie: UploadFile = File(...),
    necklace_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    return await accessory_tools.try_on_necklace(selfie_bytes, necklace_url)


@router.post("/hair")
async def try_on_hair(
    selfie: UploadFile = File(...),
    ref_hair_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    return await hair_tools.change_hairstyle(selfie_bytes, ref_hair_url)
