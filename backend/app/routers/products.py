"""Products REST endpoints backed by Serper search."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query

from app.services import serper
from app.services.product_image_resolver import ProductImageResolverError, resolve_product_image

router = APIRouter()


class ResolveImageRequest(BaseModel):
    url: str


@router.get("/search")
async def search_products(
    q: str = Query(..., min_length=1),
    max_price: float | None = Query(default=None),
) -> dict[str, Any]:
    return await serper.search(q, max_price)


@router.post("/resolve-image")
async def resolve_image(body: ResolveImageRequest) -> dict[str, Any]:
    try:
        resolved = await resolve_product_image(body.url)
    except ProductImageResolverError as exc:
        raise HTTPException(status_code=400, detail=exc.to_detail()) from exc
    return resolved.to_dict()
