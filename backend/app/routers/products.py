"""Products REST endpoints backed by Serper search."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from app.services import serper

router = APIRouter()


@router.get("/search")
async def search_products(
    q: str = Query(..., min_length=1),
    max_price: float | None = Query(default=None),
) -> dict[str, Any]:
    return await serper.search(q, max_price)
