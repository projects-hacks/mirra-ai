"""VTO router — direct REST endpoints for non-voice VTO calls."""
import base64
import json
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.models.perfectcorp_types import VTOImageResponseModel
from app.services import perfectcorp
from app.core.deps import read_image
from app.core.validation import ImageOrientationPolicy, ValidationError, prepare_image_bytes
from app.services.product_image_resolver import ProductImageResolverError, resolve_product_image
from app.tools import fashion_tools, beauty_tools, accessory_tools, hair_tools
from app.tools.makeup_effect_normalize import normalize_makeup_effects
from app.tools.base_vto import extract_result_image_url

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
    return HTTPException(
        status_code=500,
        detail={
            "category": perfectcorp.MirraErrorCategory.PROVIDER_INTERNAL.value,
            "message": "Try-on failed unexpectedly.",
            "provider_message": str(exc),
        },
    )


def _detail(
    category: str,
    message: str,
    *,
    provider_message: str | None = None,
    provider_code: str | None = None,
    source: str | None = None,
) -> dict[str, str]:
    detail = {"category": category, "message": message}
    if provider_message:
        detail["provider_message"] = provider_message
    if provider_code:
        detail["provider_code"] = provider_code
    if source:
        detail["source"] = source
    return detail


def _normalize_image_response(payload: Any, source: str) -> dict[str, Any]:
    image_url = None
    provider_payload: dict[str, Any] | None = payload if isinstance(payload, dict) else None

    if isinstance(payload, dict):
        image_url = extract_result_image_url(payload)
    elif isinstance(payload, str):
        image_url = payload

    if not isinstance(image_url, str) or not image_url:
        raise HTTPException(
            status_code=502,
            detail={
                "category": "provider_response_invalid",
                "message": "The provider response did not include a usable image URL.",
                "source": source,
            },
        )

    response: dict[str, Any] = {"image_url": image_url}
    if provider_payload:
        response["provider_payload"] = provider_payload
        for key, value in provider_payload.items():
            if key != "image_url":
                response[key] = value
    return response


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


@router.post("/clothes", response_model=VTOImageResponseModel)
async def try_on_clothes(
    selfie: UploadFile = File(...),
    garment_url: str = Form(default=""),
    garment: UploadFile | None = File(default=None),
    garment_category: str = Form(default="upper"),
) -> dict[str, Any]:
    selfie_bytes = await read_image(
        selfie,
        orientation=ImageOrientationPolicy.ALLOW_LANDSCAPE,
    )
    url = (garment_url or "").strip()
    garment_bytes: bytes | None = None
    resolved_url: str | None = None

    if garment is not None:
        raw = await garment.read()
        if not raw:
            raise HTTPException(
                status_code=400,
                detail=_detail(
                    perfectcorp.MirraErrorCategory.INVALID_INPUT.value,
                    "The garment image file was empty.",
                    source="clothes",
                ),
            )
        if url:
            raise HTTPException(
                status_code=400,
                detail=_detail(
                    perfectcorp.MirraErrorCategory.INVALID_INPUT.value,
                    "Send either garment_url or a garment file, not both.",
                    source="clothes",
                ),
            )
        try:
            garment_bytes = prepare_image_bytes(raw, ImageOrientationPolicy.ALLOW_LANDSCAPE)
        except ValidationError as exc:
            raise HTTPException(
                status_code=400,
                detail=_detail(
                    perfectcorp.MirraErrorCategory.INVALID_INPUT.value,
                    str(exc),
                    source="clothes",
                ),
            ) from exc
    elif url:
        resolved_url = await _resolve_reference_url(url)
    else:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                perfectcorp.MirraErrorCategory.INVALID_INPUT.value,
                "Provide garment_url (link to a garment or product image) or upload garment as a file.",
                source="clothes",
            ),
        )

    provider_category = CLOTHES_CATEGORY_MAP.get(garment_category)
    if not provider_category:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                perfectcorp.MirraErrorCategory.UNSUPPORTED_CATEGORY.value,
                "This clothing category is not supported yet.",
                provider_message=f"garment_category={garment_category}",
                source="clothes",
            ),
        )

    try:
        return _normalize_image_response(
            await fashion_tools.try_on_clothes(
                selfie_bytes,
                garment_url=resolved_url,
                garment_bytes=garment_bytes,
                garment_category=provider_category,
            ),
            "clothes",
        )
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


@router.post("/makeup", response_model=VTOImageResponseModel)
async def try_on_makeup(
    selfie: UploadFile = File(...),
    effects: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    try:
        parsed_effects = json.loads(effects)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=_detail(
                perfectcorp.MirraErrorCategory.INVALID_INPUT.value,
                "The makeup configuration could not be read.",
                provider_message="Invalid effects JSON",
                source="makeup",
            ),
        ) from exc
    if not isinstance(parsed_effects, list):
        raise HTTPException(
            status_code=400,
            detail=_detail(
                perfectcorp.MirraErrorCategory.INVALID_INPUT.value,
                "The makeup configuration must be a list of effects.",
                provider_message="effects must be a JSON array",
                source="makeup",
            ),
        )
    if not normalize_makeup_effects(parsed_effects):
        raise HTTPException(
            status_code=400,
            detail=_detail(
                perfectcorp.MirraErrorCategory.INVALID_INPUT.value,
                "At least one valid makeup effect is required.",
                provider_message="effects array contained no usable effect objects",
                source="makeup",
            ),
        )
    try:
        return _normalize_image_response(
            await beauty_tools.try_on_makeup(selfie_bytes, parsed_effects),
            "makeup",
        )
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


@router.post("/earrings", response_model=VTOImageResponseModel)
async def try_on_earrings(
    selfie: UploadFile = File(...),
    earring_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    resolved_url = await _resolve_reference_url(earring_url)
    try:
        return _normalize_image_response(
            await accessory_tools.try_on_earrings(selfie_bytes, resolved_url),
            "earrings",
        )
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


@router.post("/necklace", response_model=VTOImageResponseModel)
async def try_on_necklace(
    selfie: UploadFile = File(...),
    necklace_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    resolved_url = await _resolve_reference_url(necklace_url)
    try:
        return _normalize_image_response(
            await accessory_tools.try_on_necklace(selfie_bytes, resolved_url),
            "necklace",
        )
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc


@router.post("/hair", response_model=VTOImageResponseModel)
async def try_on_hair(
    selfie: UploadFile = File(...),
    ref_hair_url: str = Form(...),
) -> dict[str, Any]:
    selfie_bytes = await read_image(selfie)
    resolved_url = await _resolve_reference_url(ref_hair_url)
    try:
        return _normalize_image_response(
            await hair_tools.change_hairstyle(selfie_bytes, resolved_url),
            "hair",
        )
    except Exception as exc:
        raise _provider_error_to_http(exc) from exc
