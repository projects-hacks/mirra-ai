"""Voice WebSocket — proxies browser ↔ Deepgram Voice Agent."""
import asyncio
import json
from pathlib import Path

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.services.tool_executor import execute_tool

DG_URL = "wss://api.deepgram.com/v1/agent/converse"
SYSTEM_PROMPT = (Path(__file__).parent.parent.parent.parent / "agent" / "system-prompt.md").read_text()

_sessions: dict[int, dict] = {}


def _function_definitions() -> list[dict]:
    return [
        {"name": "analyze_skin", "description": "Analyze skin condition from selfie.", "parameters": {"type": "object", "properties": {}}},
        {"name": "analyze_skin_tone", "description": "Detect skin undertone and color profile.", "parameters": {"type": "object", "properties": {}}},
        {"name": "try_on_clothes", "description": "Virtual try-on a garment.", "parameters": {"type": "object", "properties": {"product_id": {"type": "string"}}, "required": ["product_id"]}},
        {"name": "try_on_makeup", "description": "Apply virtual makeup.", "parameters": {"type": "object", "properties": {"lip_color": {"type": "string"}, "lip_texture": {"type": "string", "enum": ["matte", "gloss", "satin", "sheer"]}}}},
        {"name": "try_on_earrings", "description": "Virtual try-on earrings.", "parameters": {"type": "object", "properties": {"product_id": {"type": "string"}}, "required": ["product_id"]}},
        {"name": "change_hairstyle", "description": "Change hairstyle.", "parameters": {"type": "object", "properties": {"style": {"type": "string"}}, "required": ["style"]}},
        {"name": "check_calendar", "description": "Get today's calendar events.", "parameters": {"type": "object", "properties": {}}},
        {"name": "check_weather", "description": "Get current weather.", "parameters": {"type": "object", "properties": {"location": {"type": "string"}}}},
        {"name": "search_products", "description": "Search products to buy.", "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "max_price": {"type": "number"}}, "required": ["query"]}},
        {"name": "generate_proof_card", "description": "Generate approval card with match scores.", "parameters": {"type": "object", "properties": {"look_name": {"type": "string"}, "tone_match": {"type": "number"}, "style_fit": {"type": "number"}}}},
    ]


def build_agent_settings() -> dict:
    return {
        "type": "Settings",
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
            "greeting": "Hi! I'm Mirra. Let me scan your face real quick so I can help you look your best today.",
        },
    }


async def voice_websocket(ws: WebSocket) -> None:
    await ws.accept()
    sid = id(ws)
    _sessions[sid] = {"selfie": None}

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
                    if data.get("type") == "FunctionCallRequest":
                        result = await execute_tool(data["function_name"], data.get("input", {}), _sessions[sid].get("selfie"))
                        await dg.send(json.dumps({"type": "FunctionCallResponse", "function_call_id": data["function_call_id"], "output": json.dumps(result)}))
                        await ws.send_text(json.dumps({"type": "vto_result", "tool": data["function_name"], **result}))
                    else:
                        await ws.send_text(msg)

            async def client_to_dg():
                while True:
                    data = await ws.receive()
                    if "bytes" in data:
                        await dg.send(data["bytes"])
                    elif "text" in data:
                        msg = json.loads(data["text"])
                        if msg.get("type") == "selfie":
                            _sessions[sid]["selfie"] = msg["data"]

            await asyncio.gather(dg_to_client(), client_to_dg())
    except WebSocketDisconnect:
        pass
    finally:
        _sessions.pop(sid, None)
