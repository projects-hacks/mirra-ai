"""Supabase client singleton."""
from supabase import create_client
from app.core.config import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY) if settings.SUPABASE_URL else None
