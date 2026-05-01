"""Closet router — CRUD for user's closet items via Supabase."""
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.supabase_client import supabase

router = APIRouter()


class ClosetItemCreate(BaseModel):
    user_id: str
    name: str
    category: str
    color: str | None = None
    brand: str | None = None
    image: str | None = None  # base64
    occasions: list[str] = []


@router.get("/")
async def get_closet(user_id: str):
    result = supabase.table("closet_items").select("*").eq("user_id", user_id).execute()
    return {"items": result.data}


@router.post("/")
async def add_item(item: ClosetItemCreate):
    result = supabase.table("closet_items").insert(item.model_dump(exclude={"image"})).execute()
    return result.data[0] if result.data else {"error": "Failed to create"}


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    supabase.table("closet_items").delete().eq("id", item_id).execute()
    return {"deleted": True}
