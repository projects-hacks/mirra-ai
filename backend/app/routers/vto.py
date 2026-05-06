"""VTO router — direct REST endpoints for non-voice VTO calls."""
import base64
import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services import perfectcorp
from app.core.deps import read_image
from app.services.product_image_resolver import ProductImageResolverError, resolve_product_image
from app.tools import fashion_tools, beauty_tools, accessory_tools, hair_tools

router = APIRouter()
CLOTHES_CATEGORY_MAP = {
    "upper": "upper_body",
    "upper_body": "upper_body",
    "lower": "lower_body",
    "lower_body": "lower_body",
    "full": "full_body",
    "full_body": "full_body",
}


class SkinAnalysisRequest(BaseModel):
    image: str  # base64


class TryOnRequest(BaseModel):
    selfie: str  # base64
    product_id: str
    vto_type: str  # clothes, earrings, etc.


def _provider_error_to_http(exc: Exception) -> HTTPException:
    if isinstance(exc, perfectcorp.PerfectCorpAPIError):
        category = exc.category()
        status_code = 401 if category == perfectcorp.MirraErrorCategory.PROVIDER_AUTH else 400
        return HTTPException(status_code=status_code, detail=exc.to_detail())
    if isinstance(exc, TimeoutError):
        return HTTPException(
            status_code=504,
            detail={
                "category": perfectcorp.MirraErrorCategory.API_TIMEOUT.value,
                "message": "The render took too long. Please retry.",
                "provider_message": str(exc),
            },
        )
    return HTTPException(status_code=500, detail="Try-on failed unexpectedly.")


async def _resolve_reference_url(raw_url: str) -> str:
    try:
        return (await resolve_product_image(raw_url)).resolved_image_url
    except ProductImageResolverError as exc:
        raise HTTPException(status_code=400, detail=exc.to_detail()) from exc


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
    resolved_url = await _resolve_reference_url(garment_url)
    provider_category = CLOTHES_CATEGORY_MAP.get(garment_category)
    if not provider_category:
        raise HTTPException(
            status_code=400,
            detail={
                "category": perfectcorp.MirraErrorCategory.UNSUPPORTED_CATEGORY.value,
                "message": "This clothing category is not supported yet.",
                "provider_message": f"garment_category={garment_category}",
            },
        )

    try:
        return await fashion_tools.try_on_clothes(selfie_bytes, resolved_url, provider_category)
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


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
    try:
        return await beauty_tools.try_on_makeup(selfie_bytes, parsed_effects)
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


@router.post("/earrings")
async def try_on_earrings(
    selfie: UploadFile = File(...),
    earring_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    resolved_url = await _resolve_reference_url(earring_url)
    try:
        return await accessory_tools.try_on_earrings(selfie_bytes, resolved_url)
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


@router.post("/necklace")
async def try_on_necklace(
    selfie: UploadFile = File(...),
    necklace_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    resolved_url = await _resolve_reference_url(necklace_url)
    try:
        return await accessory_tools.try_on_necklace(selfie_bytes, resolved_url)
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


@router.post("/hair")
async def try_on_hair(
    selfie: UploadFile = File(...),
    ref_hair_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    resolved_url = await _resolve_reference_url(ref_hair_url)
    try:
        return await hair_tools.change_hairstyle(selfie_bytes, resolved_url)
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc
