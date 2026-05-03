"""Tool executor — routes function calls to the correct tool module."""
import base64
from typing import Any

from app.core.validation import validate, ValidationError
from app.core.constants import ToolName
from app.tools import skin_tools, fashion_tools, beauty_tools, hair_tools, accessory_tools
from app.services import weather, calendar, serper


async def execute_tool(name: str, args: dict[str, Any], selfie_b64: str | None = None, user_id: str | None = None) -> dict:
    """Route a function call to the correct tool and return the result."""
    selfie_bytes = _decode_selfie(selfie_b64) if selfie_b64 else None

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
        case ToolName.GENERATE_PROOF_CARD:
            return {"card": args}
        case _:
            return {"error": f"Unknown tool: {name}"}


def _decode_selfie(b64: str) -> bytes:
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
