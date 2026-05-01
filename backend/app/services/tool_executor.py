"""Tool executor — routes function calls to the correct service."""
import base64
from typing import Any

from app.services import perfectcorp, weather, calendar, serper


async def execute_tool(name: str, args: dict[str, Any], selfie_b64: str | None = None) -> dict:
    """Execute a Mirra tool by name and return the result."""
    selfie_bytes = base64.b64decode(selfie_b64) if selfie_b64 else None

    match name:
        case "analyze_skin":
            return await _skin_analysis(selfie_bytes)
        case "analyze_skin_tone":
            return await _skin_tone(selfie_bytes)
        case "try_on_clothes":
            return await _clothes_vto(selfie_bytes, args["product_id"])
        case "try_on_makeup":
            return await _makeup_vto(selfie_bytes, args)
        case "try_on_earrings":
            return await _earrings_vto(selfie_bytes, args["product_id"])
        case "change_hairstyle":
            return await _hairstyle(selfie_bytes, args["style"])
        case "check_calendar":
            return await calendar.get_todays_events()
        case "check_weather":
            return await weather.get_weather(args.get("location", "San Francisco"))
        case "search_products":
            return await serper.search(args["query"], args.get("max_price"))
        case "generate_proof_card":
            return {"card": args}
        case _:
            return {"error": f"Unknown tool: {name}"}


async def _skin_analysis(selfie: bytes | None) -> dict:
    if not selfie:
        return {"error": "No selfie available"}
    result = await perfectcorp.call_api("skin-analysis", selfie, {
        "dst_actions": ["wrinkle", "pore", "texture", "acne", "moisture", "oiliness", "redness", "radiance", "firmness", "dark_circle_v2", "eye_bag", "age_spot"],
        "format": "json",
    })
    return {"scores": result}


async def _skin_tone(selfie: bytes | None) -> dict:
    if not selfie:
        return {"error": "No selfie available"}
    return await perfectcorp.call_api("skin-tone", selfie)


async def _clothes_vto(selfie: bytes | None, product_id: str) -> dict:
    if not selfie:
        return {"error": "No selfie available"}
    # TODO: load product image from catalog by product_id
    return await perfectcorp.call_api("clothes-vto", selfie, {"product_id": product_id})


async def _makeup_vto(selfie: bytes | None, params: dict) -> dict:
    if not selfie:
        return {"error": "No selfie available"}
    return await perfectcorp.call_api("makeup-vto", selfie, params)


async def _earrings_vto(selfie: bytes | None, product_id: str) -> dict:
    if not selfie:
        return {"error": "No selfie available"}
    return await perfectcorp.call_api("earrings-vto", selfie, {"product_id": product_id})


async def _hairstyle(selfie: bytes | None, style: str) -> dict:
    if not selfie:
        return {"error": "No selfie available"}
    return await perfectcorp.call_api("hairstyle", selfie, {"style": style})
