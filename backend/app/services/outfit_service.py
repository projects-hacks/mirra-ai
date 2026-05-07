"""Shared outfit orchestration for REST flows."""
from __future__ import annotations

from typing import Any

from app.services.agent import agent_service
from app.services.context_builder import build_match_context
from app.services.matching_engine import MatchContext, matching_engine
from app.services.proof_card_generator import proof_card_generator
from app.services.supabase_client import supabase


def shopping_queries_for_gaps(gaps: list[str], context: MatchContext) -> dict[str, str]:
    """Map matcher gap sentences to Google Shopping style queries (Serper).

    Raw gaps like \"No shoes for work\" are human-readable but poor search keywords.
    Queries stay gender-neutral for inclusive demos; occasion + formality + season
    still anchor Serper results.
    """
    occasion = context.occasion.value
    formality = (context.formality or "smart casual").lower()
    season = context.season.value
    queries: dict[str, str] = {}

    for gap in gaps:
        gl = gap.lower()
        if "empty" in gl and "closet" in gl:
            queries[gap] = f"wardrobe capsule essentials minimalist {occasion} {season}"
            continue
        if "shoes" in gl or "boot" in gl or "sneaker" in gl:
            if "low-scoring" in gl:
                queries[gap] = f"{occasion} shoes {formality} leather closed toe {season}"
            else:
                queries[gap] = f"professional {occasion} shoes office {formality} closed toe"
            continue
        if "dress" in gl:
            queries[gap] = f"{occasion} {formality} dress {season}"
            continue
        if "bottom" in gl or "pants" in gl or "jeans" in gl or "skirt" in gl:
            queries[gap] = f"{occasion} {formality} pants trousers {season}"
            continue
        if "top" in gl or "shirt" in gl or "blouse" in gl or "sweater" in gl:
            queries[gap] = f"{occasion} {formality} shirt blouse top {season}"
            continue
        if "accessor" in gl or "jewelry" in gl or "jewellery" in gl:
            queries[gap] = f"{occasion} {formality} jewelry earrings necklace minimalist"
            continue
        # Fallback: strip narrative prefix
        condensed = (
            gap.replace("No ", "")
            .replace("Low-scoring ", "")
            .replace(" (consider alternatives)", "")
            .strip()
        )
        queries[gap] = f"buy {condensed} {occasion}"

    return queries


async def match_closet(
    user_id: str | None,
    occasion: str | None,
    location: str,
    selfie_bytes: bytes | None = None,
) -> dict[str, Any]:
    """Match closet items against occasion, weather, and color context."""
    if not user_id:
        return {"error": "User authentication required for closet matching"}

    try:
        context = await build_match_context(
            occasion=occasion,
            location=location,
            user_preferences={},
            user_id=user_id,
            selfie_bytes=selfie_bytes,
        )

        response = supabase.table("closet_items").select("*").eq("user_id", user_id).execute()
        closet_items = response.data if response.data else []

        if not closet_items:
            empty_gaps = ["Your closet is empty. Add items to get personalized matches."]
            gap_fill = shopping_queries_for_gaps(empty_gaps, context)
            agent_insight = await agent_service.generate_outfit_reasoning(
                {},
                empty_gaps,
                {
                    "occasion": context.occasion.value,
                    "weather": f"{context.weather_temp}°F, {context.weather_condition}",
                    "season": context.season.value,
                    "formality": context.formality,
                    "shopping_queries": gap_fill,
                },
            )
            return {
                "matches": {},
                "gaps": empty_gaps,
                "gap_fill_queries": gap_fill,
                "agent_insight": agent_insight,
                "context": {
                    "occasion": context.occasion.value,
                    "weather": f"{context.weather_temp}°F, {context.weather_condition}",
                    "season": context.season.value,
                    "color_analysis": "Perfect Corp" if context.color_profile else "rule-based",
                },
            }

        matches = matching_engine.match_items(closet_items, context)
        gaps = matching_engine.identify_gaps(matches, context)

        formatted_matches = {
            category.value: [
                {
                    "id": match.item_id,
                    "name": match.item_name,
                    "category": match.category.value,
                    "score": round(match.score, 1),
                    "reasons": match.reasons,
                    "imageUrl": match.image_url,
                }
                for match in matches_list[:3]
            ]
            for category, matches_list in matches.items()
        }

        gap_fill_queries = shopping_queries_for_gaps(gaps, context)
        ctx_dict = {
            "occasion": context.occasion.value,
            "weather": f"{context.weather_temp}°F, {context.weather_condition}",
            "season": context.season.value,
            "formality": context.formality,
            "shopping_queries": gap_fill_queries,
        }
        agent_insight = await agent_service.generate_outfit_reasoning(
            formatted_matches,
            gaps,
            ctx_dict,
        )

        return {
            "matches": formatted_matches,
            "gaps": gaps,
            "gap_fill_queries": gap_fill_queries,
            "agent_insight": agent_insight,
            "context": {
                "occasion": context.occasion.value,
                "weather": f"{context.weather_temp}°F, {context.weather_condition}",
                "season": context.season.value,
                "formality": context.formality,
                "color_analysis": "Perfect Corp" if context.color_profile else "rule-based",
            },
        }
    except Exception as exc:
        return {"error": f"Closet matching failed: {str(exc)}"}


def generate_proof_card(user_id: str | None, args: dict[str, Any]) -> dict[str, Any]:
    """Generate and persist a proof card for a selected outfit."""
    if not user_id:
        return {"error": "User authentication required for proof card generation"}
    if not supabase:
        return {"error": "Supabase is not configured; cannot persist proof cards."}

    try:
        look_name = args.get("look_name", "Your Look")
        vto_image_url = args.get("vto_image_url")
        selected_items = args.get("selected_items", [])
        occasion = args.get("occasion", "casual")

        vto_result = {"image_url": vto_image_url} if vto_image_url else None

        # Avoid .single(): many users have no body_model row; PostgREST returns an error for 0 rows.
        user_profile = None
        bm_result = (
            supabase.table("body_model")
            .select("color_palette, skin_scores")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if bm_result.data:
            user_profile = bm_result.data[0]

        closet_items = [item for item in selected_items if item.get("owned", False)]
        context = {
            "occasion": occasion,
            "weather": args.get("weather", ""),
            "season": args.get("season", "spring"),
        }

        proof_card = proof_card_generator.generate(
            look_name=look_name,
            vto_result=vto_result,
            selected_items=selected_items,
            closet_items=closet_items,
            context=context,
            user_profile=user_profile,
        )

        card_dict = {
            "look_name": proof_card.look_name,
            "vto_image_url": proof_card.vto_image_url,
            "tone_match": round(proof_card.tone_match, 1),
            "style_fit": round(proof_card.style_fit, 1),
            "skin_safe": proof_card.skin_safe,
            "owned_items": proof_card.owned_items,
            "new_items": proof_card.new_items,
            "total_new_spend": proof_card.total_new_spend,
            "occasion": proof_card.occasion,
            "weather": proof_card.weather,
            "season": proof_card.season,
        }

        # Persist and surface the row id so the client can approve / track later.
        insert_response = (
            supabase.table("proof_cards")
            .insert(
                {
                    "user_id": user_id,
                    "look_name": proof_card.look_name,
                    "occasion": proof_card.occasion,
                    "tone_match": proof_card.tone_match,
                    "style_fit": proof_card.style_fit,
                    "skin_safe": proof_card.skin_safe,
                    "owned_items": proof_card.owned_items,
                    "new_items": proof_card.new_items,
                    "total_cost": proof_card.total_new_spend,
                    "result_image_url": proof_card.vto_image_url,
                }
            )
            .execute()
        )

        if insert_response.data:
            card_dict["id"] = insert_response.data[0].get("id")

        return {"card": card_dict}
    except Exception as exc:
        return {"error": f"Proof card generation failed: {str(exc)}"}
