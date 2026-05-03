"""Voice WebSocket — proxies browser ↔ Deepgram Voice Agent."""
import asyncio
import json
import logging
from pathlib import Path

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core import cache
from app.core.constants import (
    DeepgramMessageType, WSClientMessageType, WSServerMessageType,
    ToolName, CachePrefix,
)
from app.services.tool_executor import execute_tool

logger = logging.getLogger(__name__)

# Correct Deepgram Voice Agent endpoint
DG_URL = "wss://agent.deepgram.com/v1/agent/converse"

# In Docker: /app/app/routers/voice.py → .parent×3 = /app → /app/agent/system-prompt.md
# Locally:   backend/app/routers/voice.py → .parent×3 = backend → backend/agent/system-prompt.md
_PROMPT_PATH = Path(__file__).parent.parent.parent / "agent" / "system-prompt.md"
SYSTEM_PROMPT = _PROMPT_PATH.read_text()

GREETING = "Hey! I'm Mirra. What are we styling today?"


def _function_definitions() -> list[dict]:
    return [
        {"name": ToolName.ANALYZE_SKIN, "description": "Analyze skin condition from selfie — wrinkles, pores, acne, texture, moisture, and 10+ concerns. Returns scores 1-100.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.ANALYZE_SKIN_TONE, "description": "Detect skin undertone, depth, and color profile from selfie.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.ANALYZE_FACE, "description": "Detect face shape and proportions from selfie.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.TRY_ON_CLOTHES, "description": "Virtual try-on a garment on the user's selfie. Requires a public URL to the garment image.", "parameters": {"type": "object", "properties": {"garment_url": {"type": "string", "description": "Public URL of the garment image"}, "garment_category": {"type": "string", "enum": ["upper", "lower", "full"], "description": "Type of garment: upper (top/jacket), lower (pants/skirt), full (dress)"}}, "required": ["garment_url"]}},
        {"name": ToolName.TRY_ON_MAKEUP, "description": "Apply virtual makeup effects (lip, blush, eyeliner, etc.) on user's selfie.", "parameters": {"type": "object", "properties": {"effects": {"type": "array", "items": {"type": "object"}, "description": "Array of makeup effect objects with category, pattern, palettes"}}}},
        {"name": ToolName.TRY_ON_EARRINGS, "description": "Virtual try-on earrings on user's selfie.", "parameters": {"type": "object", "properties": {"earring_url": {"type": "string", "description": "Public URL of the earring image"}}, "required": ["earring_url"]}},
        {"name": ToolName.TRY_ON_NECKLACE, "description": "Virtual try-on necklace on user's selfie.", "parameters": {"type": "object", "properties": {"necklace_url": {"type": "string", "description": "Public URL of the necklace image"}}, "required": ["necklace_url"]}},
        {"name": ToolName.CHANGE_HAIRSTYLE, "description": "Transfer a hairstyle from a reference photo to user's selfie.", "parameters": {"type": "object", "properties": {"ref_hair_url": {"type": "string", "description": "Public URL of a reference hairstyle photo"}}, "required": ["ref_hair_url"]}},
        {"name": ToolName.CHECK_CALENDAR, "description": "Get today's calendar events.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.CHECK_WEATHER, "description": "Get current weather.", "parameters": {"type": "object", "properties": {"location": {"type": "string"}}}},
        {"name": ToolName.SEARCH_PRODUCTS, "description": "Search products to buy.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "max_price": {"type": "number"}}, "required": ["query"]}},
        {"name": ToolName.MATCH_CLOSET, "description": "Match user's closet items to current context (occasion, weather, calendar). Returns top matches per category and identifies gaps.", "parameters": {"type": "object", "properties": {"occasion": {"type": "string", "description": "Occasion type (optional, inferred from calendar if not provided)"}, "location": {"type": "string", "description": "Location for weather lookup (default: San Francisco)"}}}},
        {"name": ToolName.GENERATE_PROOF_CARD, "description": "Generate proof card with calculated match scores for an outfit. Shows VTO result, tone match, style fit, skin safety, and item breakdown (owned vs new).", "parameters": {"type": "object", "properties": {"look_name": {"type": "string", "description": "Name for the look (e.g., 'Date Night - Romantic')"}, "vto_image_url": {"type": "string", "description": "URL of VTO result image (optional)"}, "selected_items": {"type": "array", "items": {"type": "object"}, "description": "Array of items in the outfit (owned + new)"}, "occasion": {"type": "string", "description": "Occasion context (e.g., 'date', 'office', 'casual')"}, "weather": {"type": "string", "description": "Weather context (optional)"}, "season": {"type": "string", "description": "Season context (optional)"}}, "required": ["look_name", "selected_items"]}},
    ]


def _build_think_provider() -> dict:
    """Build the think provider config for Deepgram Voice Agent.

    Uses Deepgram's managed LLM — no external API key needed.
    Optimized for real-time voice: latency matters more than raw quality.

    Latency tiers (from Deepgram docs):
      - gpt-4.1-mini / gpt-4o-mini (Standard) ~600ms — best balance
      - gemini-3-flash-preview (Standard) — good alternative
      - gpt-4.1 / gemini-3-pro-preview (Advanced) ~800ms+ — best quality
    """
    logger.info("LLM: Deepgram managed gpt-4.1-mini (Standard, low latency)")
    return {
        "type": "open_ai",
        "model": "gpt-4.1-mini",
        "temperature": 0.7,
    }


def build_agent_settings() -> dict:
    """Build the Settings message per Deepgram Voice Agent API spec."""
    settings_msg: dict = {
        "type": DeepgramMessageType.SETTINGS,
        "audio": {
            "input": {"encoding": "linear16", "sample_rate": 24000},
            "output": {"encoding": "linear16", "sample_rate": 24000, "container": "none"},
        },
        "agent": {
            "language": "en",
            "listen": {"provider": {"type": "deepgram", "model": "nova-3"}},
            "think": {
                "provider": _build_think_provider(),
                "prompt": SYSTEM_PROMPT,
                "functions": _function_definitions(),
            },
            "speak": {"provider": {"type": "deepgram", "model": "aura-2-thalia-en", "speed": 0.85}},
            "greeting": GREETING,
        },
    }

    return settings_msg


async def _handle_function_call(func: dict, dg, ws: WebSocket, session: dict) -> None:
    """Handle a single function call from Deepgram's FunctionCallRequest."""
    func_name = func["name"]
    func_id = func["id"]
    # arguments comes as a JSON string
    args = json.loads(func.get("arguments", "{}"))

    logger.info(f"Function call: {func_name}({args})")

    # Notify frontend that a tool is being executed
    await ws.send_text(json.dumps({
        "type": WSServerMessageType.VTO_RESULT,
        "tool": func_name,
        "status": "running",
    }))

    # Execute the tool
    result = await execute_tool(
        func_name,
        args,
        session.get("selfie"),
        session.get("user_id"),
    )

    # Send response back to Deepgram (content must be a JSON string)
    await dg.send(json.dumps({
        "type": DeepgramMessageType.FUNCTION_CALL_RESPONSE,
        "name": func_name,
        "content": json.dumps(result),
        "id": func_id,
    }))

    # Send result to frontend
    await ws.send_text(json.dumps({
        "type": WSServerMessageType.VTO_RESULT,
        "tool": func_name,
        "status": "complete",
        **result,
    }))


async def voice_websocket(ws: WebSocket) -> None:
    await ws.accept()
    sid = id(ws)
    session: dict = {"selfie": None, "user_id": None, "ready": False}

    await cache.set(f"{CachePrefix.SESSION}:{sid}", {"connected": True}, ttl=3600)

    try:
        async with websockets.connect(
            DG_URL, extra_headers={"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}
        ) as dg:
            # Wait for Welcome message before sending Settings (required by protocol)
            welcome = await dg.recv()
            logger.info(f"Deepgram welcome: {welcome[:100] if isinstance(welcome, str) else 'binary'}")

            # Send Settings as first client message
            settings_payload = json.dumps(build_agent_settings())
            logger.info(f"Sending Settings ({len(settings_payload)} bytes)")
            await dg.send(settings_payload)

            async def dg_to_client():
                """Forward Deepgram messages to browser client."""
                async for msg in dg:
                    if isinstance(msg, bytes):
                        # Audio data — forward directly
                        await ws.send_bytes(msg)
                        continue

                    data = json.loads(msg)
                    msg_type = data.get("type")

                    if msg_type == DeepgramMessageType.FUNCTION_CALL_REQUEST:
                        # Process each function in the functions array
                        for func in data.get("functions", []):
                            if func.get("client_side", True):
                                await _handle_function_call(func, dg, ws, session)
                    elif msg_type == "InjectionRefused":
                        logger.warning(f"Injection refused: {data.get('message')}")
                    elif msg_type == "Error":
                        logger.error(f"Deepgram error: {data}")
                        await ws.send_text(json.dumps({
                            "type": WSServerMessageType.ERROR,
                            "message": data.get("message", "Voice agent error"),
                        }))
                    else:
                        # Forward all other messages (ConversationText, AgentThinking, etc.)
                        await ws.send_text(msg)

            async def client_to_dg():
                """Forward browser client messages to Deepgram."""
                while True:
                    data = await ws.receive()
                    if "bytes" in data:
                        # Audio data — forward directly
                        await dg.send(data["bytes"])
                    elif "text" in data:
                        msg = json.loads(data["text"])
                        msg_type = msg.get("type")
                        match msg_type:
                            # ── Our custom messages (DO NOT forward to Deepgram) ──
                            case WSClientMessageType.SELFIE:
                                session["selfie"] = msg["data"]
                                logger.info("Selfie received")
                            case WSClientMessageType.READY:
                                session["ready"] = True
                                session["user_id"] = msg.get("user_id")
                                logger.info(f"Session ready, user: {session['user_id']}")
                            case WSClientMessageType.STOP:
                                logger.info("Client stopped listening")
                            # ── Deepgram messages (forward) ──
                            case "KeepAlive" | "UpdatePrompt" | "UpdateSpeak" | "UpdateThink" | "InjectAgentMessage" | "InjectUserMessage":
                                await dg.send(data["text"])
                            case _:
                                logger.warning(f"Unknown client message type: {msg_type}")

            await asyncio.gather(dg_to_client(), client_to_dg())
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {sid}")
    except Exception as e:
        logger.error(f"Voice session error: {e}")
    finally:
        await cache.delete(f"{CachePrefix.SESSION}:{sid}")
