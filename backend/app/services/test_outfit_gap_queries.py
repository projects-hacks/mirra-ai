"""Shopping query strings derived from outfit matcher gaps."""
from __future__ import annotations

from app.core.closet_constants import Occasion, Season
from app.services.matching_engine import MatchContext
from app.services.outfit_service import shopping_queries_for_gaps


def test_shoes_gap_becomes_shopping_query():
    ctx = MatchContext(
        occasion=Occasion.WORK,
        weather_temp=68,
        weather_condition="clear",
        formality="business",
        season=Season.SPRING,
        user_preferences={},
    )
    gaps = ["No shoes for work"]
    q = shopping_queries_for_gaps(gaps, ctx)
    assert gaps[0] in q
    assert "shoes" in q[gaps[0]].lower()
    assert "office" in q[gaps[0]].lower() or "professional" in q[gaps[0]].lower()


def test_empty_closet_gap_query():
    ctx = MatchContext(
        occasion=Occasion.CASUAL,
        weather_temp=70,
        weather_condition="clear",
        formality="casual",
        season=Season.SUMMER,
        user_preferences={},
    )
    gaps = ["Your closet is empty. Add items to get personalized matches."]
    q = shopping_queries_for_gaps(gaps, ctx)
    assert "essentials" in q[gaps[0]].lower() or "capsule" in q[gaps[0]].lower()
