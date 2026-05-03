"""Tool executor — routes function calls to the correct tool module."""
import base64
from typing import Any

from app.core.validation import validate, ValidationError
from app.core.constants import ToolName
from app.tools import skin_tools, fashion_tools, beauty_tools, hair_tools, accessory_tools
from app.services import weather, calendar, serper
from app.services.context_builder import build_match_context
from app.services.matching_engine import matching_engine
from app.services.supabase_client import supabase
from app.services.proof_card_generator import proof_card_generator


async def execute_tool(name: str, args: dict[str, Any], selfie_b64: str | None = None, user_id: str | None = None) -> dict:
    """Route a function call to the correct tool and return the result."""
    try:
        selfie_bytes = _decode_selfie(selfie_b64) if selfie_b64 else None
    except ValidationError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Image processing failed: {str(e)}"}

    match name:
        case ToolName.ANALYZE_SKIN:
            return await _require_selfie(selfie_bytes, skin_tools.analyze_skin, user_id=user_id)
        case ToolName.ANALYZE_SKIN_TONE:
            return await _require_selfie(selfie_bytes, skin_tools.analyze_skin_tone, user_id=user_id)
        case ToolName.ANALYZE_FACE:
            return await _require_selfie(selfie_bytes, skin_tools.analyze_face, user_id=user_id)
        case ToolName.TRY_ON_CLOTHES:
            return await _require_selfie(
                selfie_bytes, fashion_tools.try_on_clothes,
                garment_url=args["garment_url"],
                garment_category=args.get("garment_category", "upper"),
            )
        case ToolName.TRY_ON_MAKEUP:
            return await _require_selfie(
                selfie_bytes, beauty_tools.try_on_makeup,
                effects=args.get("effects", []),
            )
        case ToolName.TRY_ON_EARRINGS:
            return await _require_selfie(
                selfie_bytes, accessory_tools.try_on_earrings,
                earring_url=args["earring_url"],
            )
        case ToolName.TRY_ON_NECKLACE:
            return await _require_selfie(
                selfie_bytes, accessory_tools.try_on_necklace,
                necklace_url=args["necklace_url"],
            )
        case ToolName.CHANGE_HAIRSTYLE:
            return await _require_selfie(
                selfie_bytes, hair_tools.change_hairstyle,
                ref_hair_url=args["ref_hair_url"],
            )
        case ToolName.CHECK_CALENDAR:
            return await calendar.get_todays_events()
        case ToolName.CHECK_WEATHER:
            return await weather.get_weather(args.get("location", "San Francisco"))
        case ToolName.SEARCH_PRODUCTS:
            return await serper.search(args["query"], args.get("max_price"))
        case ToolName.MATCH_CLOSET:
            return await _match_closet(
                user_id=user_id,
                occasion=args.get("occasion"),
                location=args.get("location", "San Francisco"),
                selfie_bytes=selfie_bytes,  # Pass selfie for color analysis if needed
            )
        case ToolName.GENERATE_PROOF_CARD:
            return await _generate_proof_card(
                user_id=user_id,
                args=args,
            )
        case _:
            return {"error": f"Unknown tool: {name}"}


def _decode_selfie(b64: str) -> bytes:
    # Strip data URL prefix if present (e.g., "data:image/jpeg;base64,")
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[1] if "," in b64 else b64
    image_bytes = base64.b64decode(b64)
    validate(image_bytes)
    return image_bytes


async def _require_selfie(selfie_bytes: bytes | None, tool_fn, **kwargs) -> dict:
    if not selfie_bytes:
        return {"error": "No selfie available — please capture your face first"}
    try:
        return await tool_fn(selfie_bytes, **kwargs)
    except ValidationError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Tool execution failed: {str(e)}"}


async def _match_closet(user_id: str | None, occasion: str | None, location: str, selfie_bytes: bytes | None = None) -> dict:
    """
    Match user's closet items to context (occasion, weather, calendar)
    Returns top matches per category + identified gaps
    
    HYBRID COLOR MATCHING:
    - Uses Perfect Corp color analysis if available (cached, zero latency)
    - Automatically refreshes if stale (>90 days)
    - Falls back to rule-based if unavailable
    """
    if not user_id:
        return {"error": "User authentication required for closet matching"}
    
    try:
        # Build context from calendar, weather, user input, and color profile
        context = await build_match_context(
            occasion=occasion,
            location=location,
            user_preferences={},  # TODO: fetch from user profile
            user_id=user_id,  # For color profile lookup
            selfie_bytes=selfie_bytes,  # Only used if color profile is stale/missing
        )
        
        # Fetch user's closet items from Supabase
        response = supabase.table("closet_items").select("*").eq("user_id", user_id).execute()
        closet_items = response.data if response.data else []
        
        if not closet_items:
            return {
                "matches": {},
                "gaps": ["Your closet is empty. Add items to get personalized matches."],
                "context": {
                    "occasion": context.occasion.value,
                    "weather": f"{context.weather_temp}°F, {context.weather_condition}",
                    "season": context.season.value,
                    "color_analysis": "Perfect Corp" if context.color_profile else "rule-based",
                },
            }
        
        # Run matching engine (uses hybrid color matching)
        matches = matching_engine.match_items(closet_items, context)
        gaps = matching_engine.identify_gaps(matches, context)
        
        # Format results for frontend
        formatted_matches = {
            category.value: [
                {
                    "id": m.item_id,
                    "name": m.item_name,
                    "category": m.category.value,
                    "score": round(m.score, 1),
                    "reasons": m.reasons,
                    "imageUrl": m.image_url,
                }
                for m in matches_list[:3]  # Top 3 per category
            ]
            for category, matches_list in matches.items()
        }
        
        return {
            "matches": formatted_matches,
            "gaps": gaps,
            "context": {
                "occasion": context.occasion.value,
                "weather": f"{context.weather_temp}°F, {context.weather_condition}",
                "season": context.season.value,
                "formality": context.formality,
                "color_analysis": "Perfect Corp" if context.color_profile else "rule-based",
            },
        }
    except Exception as e:
        return {"error": f"Closet matching failed: {str(e)}"}


async def _generate_proof_card(user_id: str | None, args: dict) -> dict:
    """
    Generate proof card with calculated match scores
    
    Args from voice agent:
        look_name: Name for the look
        vto_image_url: VTO result image (optional)
        selected_items: List of items in the outfit
        occasion: Occasion context
    """
    if not user_id:
        return {"error": "User authentication required for proof card generation"}
    
    try:
        # Extract arguments
        look_name = args.get('look_name', 'Your Look')
        vto_image_url = args.get('vto_image_url')
        selected_items = args.get('selected_items', [])
        occasion = args.get('occasion', 'casual')
        
        # Build VTO result dict if image URL provided
        vto_result = {'image_url': vto_image_url} if vto_image_url else None
        
        # Fetch user's color profile for tone matching
        user_profile = None
        if supabase:
            result = supabase.table("body_model")\
                .select("color_palette, skin_scores")\
                .eq("user_id", user_id)\
                .single()\
                .execute()
            
            if result.data:
                user_profile = result.data
        
        # Separate owned vs new items
        closet_items = [item for item in selected_items if item.get('owned', False)]
        
        # Build context
        context = {
            'occasion': occasion,
            'weather': args.get('weather', ''),
            'season': args.get('season', 'spring'),
        }
        
        # Generate proof card
        proof_card = proof_card_generator.generate(
            look_name=look_name,
            vto_result=vto_result,
            selected_items=selected_items,
            closet_items=closet_items,
            context=context,
            user_profile=user_profile,
        )
        
        # Convert dataclass to dict
        card_dict = {
            'look_name': proof_card.look_name,
            'vto_image_url': proof_card.vto_image_url,
            'tone_match': round(proof_card.tone_match, 1),
            'style_fit': round(proof_card.style_fit, 1),
            'skin_safe': proof_card.skin_safe,
            'owned_items': proof_card.owned_items,
            'new_items': proof_card.new_items,
            'total_new_spend': proof_card.total_new_spend,
            'occasion': proof_card.occasion,
            'weather': proof_card.weather,
            'season': proof_card.season,
        }
        
        # Optionally persist to database
        if supabase:
            supabase.table("proof_cards").insert({
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
            }).execute()
        
        return {"card": card_dict}
    
    except Exception as e:
        return {"error": f"Proof card generation failed: {str(e)}"}
