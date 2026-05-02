"""Voice WebSocket — proxies browser ↔ Deepgram Voice Agent."""
import asyncio
import json
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

DG_URL = "wss://api.deepgram.com/v1/agent/converse"
SYSTEM_PROMPT = (Path(__file__).parent.parent.parent.parent / "agent" / "system-prompt.md").read_text()


def _function_definitions() -> list[dict]:
    return [
        {"name": ToolName.ANALYZE_SKIN, "description": "Analyze skin condition from selfie.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.ANALYZE_SKIN_TONE, "description": "Detect skin undertone and color profile.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.ANALYZE_FACE, "description": "Detect face shape and proportions.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.TRY_ON_CLOTHES, "description": "Virtual try-on a garment.", "parameters": {"type": "object", "properties": {"product_id": {"type": "string"}}, "required": ["product_id"]}},
        {"name": ToolName.TRY_ON_MAKEUP, "description": "Apply virtual makeup.", "parameters": {"type": "object", "properties": {"lip_color": {"type": "string"}, "lip_texture": {"type": "string", "enum": ["matte", "gloss", "satin", "sheer"]}}}},
        {"name": ToolName.TRY_ON_EARRINGS, "description": "Virtual try-on earrings.", "parameters": {"type": "object", "properties": {"product_id": {"type": "string"}}, "required": ["product_id"]}},
        {"name": ToolName.TRY_ON_NECKLACE, "description": "Virtual try-on necklace.", "parameters": {"type": "object", "properties": {"product_id": {"type": "string"}}, "required": ["product_id"]}},
        {"name": ToolName.CHANGE_HAIRSTYLE, "description": "Change hairstyle.", "parameters": {"type": "object", "properties": {"style": {"type": "string"}}, "required": ["style"]}},
        {"name": ToolName.CHECK_CALENDAR, "description": "Get today's calendar events.", "parameters": {"type": "object", "properties": {}}},
        {"name": ToolName.CHECK_WEATHER, "description": "Get current weather.", "parameters": {"type": "object", "properties": {"location": {"type": "string"}}}},
        {"name": ToolName.SEARCH_PRODUCTS, "description": "Search products to buy.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "max_price": {"type": "number"}}, "required": ["query"]}},
        {"name": ToolName.GENERATE_PROOF_CARD, "description": "Generate approval card with match scores.", "parameters": {"type": "object", "properties": {"look_name": {"type": "string"}, "tone_match": {"type": "number"}, "style_fit": {"type": "number"}}}},
    ]


def build_agent_settings() -> dict:
    return {
        "type": DeepgramMessageType.SETTINGS,
        "audio": {
            "input": {"encoding": "linear16", "sample_rate": 24000},
            "output": {"encoding": "linear16", "sample_rate": 24000, "container": "wav"},
        },
        "agent": {
            "language": "en",
            "listen": {"provider": {"type": "deepgram", "model": "nova-3"}},
            "think": {
                "provider": {"type": "google", "temperature": 0.7},
                "endpoint": {
                    "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:streamGenerateContent?alt=sse",
                    "headers": {"x-goog-api-key": settings.GOOGLE_AI_STUDIO_KEY},
                },
                "prompt": SYSTEM_PROMPT,
                "functions": _function_definitions(),
            },
            "speak": {"provider": {"type": "deepgram", "model": "aura-2-thalia-en"}},
        },
    }


async def voice_websocket(ws: WebSocket) -> None:
    await ws.accept()
    sid = id(ws)
    session = {"selfie": None, "user_id": None, "ready": False}

    await cache.set(f"{CachePrefix.SESSION}:{sid}", {"connected": True}, ttl=3600)

    try:
        async with websockets.connect(
            DG_URL, additional_headers={"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}
        ) as dg:
            await dg.send(json.dumps(build_agent_settings()))

            async def dg_to_client():
                async for msg in dg:
                    if isinstance(msg, bytes):
                        await ws.send_bytes(msg)
                        continue
                    data = json.loads(msg)
                    if data.get("type") == DeepgramMessageType.FUNCTION_CALL_REQUEST:
                        result = await execute_tool(
                            data["function_name"],
                            data.get("input", {}),
                            session.get("selfie"),
                            session.get("user_id"),
                        )
                        await dg.send(json.dumps({
                            "type": DeepgramMessageType.FUNCTION_CALL_RESPONSE,
                            "function_call_id": data["function_call_id"],
                            "output": json.dumps(result),
                        }))
                        await ws.send_text(json.dumps({
                            "type": WSServerMessageType.VTO_RESULT,
                            "tool": data["function_name"],
                            **result,
                        }))
                    else:
                        await ws.send_text(msg)

            async def client_to_dg():
                while True:
                    data = await ws.receive()
                    if "bytes" in data:
                        await dg.send(data["bytes"])
                    elif "text" in data:
                        msg = json.loads(data["text"])
                        match msg.get("type"):
                            case WSClientMessageType.SELFIE:
                                session["selfie"] = msg["data"]
                            case WSClientMessageType.READY:
                                session["ready"] = True
                                session["user_id"] = msg.get("user_id")
                                await dg.send(json.dumps({
                                    "type": DeepgramMessageType.INJECT_MESSAGE,
                                    "message": "Hi! I'm Mirra. I can see you — let me help you look your best today.",
                                }))

            await asyncio.gather(dg_to_client(), client_to_dg())
    except WebSocketDisconnect:
        pass
    finally:
        await cache.delete(f"{CachePrefix.SESSION}:{sid}")
