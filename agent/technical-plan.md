# Mirra — Technical Implementation Plan v2

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  BROWSER (Next.js 14 on Vercel)                       │
│  Camera (selfie) · Mic (voice) · Conversation UI      │
│  base64 img · PCM audio · REST/WS calls               │
└──────────┬───────────────┬──────────────┬────────────┘
           │               │              │
           ▼               ▼              ▼
┌──────────────────────────────────────────────────────┐
│  BACKEND (FastAPI + Python on Linode K8s)              │
│                                                        │
│  WS /ws/voice     — Deepgram Voice Agent proxy         │
│                     (STT + Gemini 3.1 Pro + TTS)       │
│                     Intercepts FunctionCallRequest     │
│  POST /api/vto/*  — Perfect Corp REST proxy            │
│  GET  /api/context— Google Calendar + Open-Meteo       │
│  CRUD /api/closet — Supabase closet/body model         │
└──────────┬───────────┬──────────┬──────────┬─────────┘
           │           │          │          │
     Perfect Corp   Deepgram   Google      Supabase
     REST APIs      Agent WS   Calendar   Postgres
```

### Key Architecture Decisions
| Decision | Why |
|---|---|
| **Gemini 3.1 Pro** (via Deepgram) | Best function calling, native Deepgram support, BYO endpoint |
| **Deepgram full Voice Agent** | STT+Think+TTS in one WS — handles barge-in, echo cancel, function calling |
| **FastAPI** (Python) | Native async, WebSocket, better AI/ML ecosystem |
| **Supabase** | Real persistence, auth, cross-device, realtime |
| **Google Calendar API** | Real calendar integration, not mocked |

### Voice Pipeline (Deepgram manages everything)
```
Browser Mic → PCM audio → Backend WS → Deepgram Voice Agent WS
                                              ↓
                                   STT: nova-3 (speech → text)
                                              ↓
                                   Think: Gemini 3.1 Pro (reason + tools)
                                              ↓
                              FunctionCallRequest → our backend executes tool
                              FunctionCallResponse → agent continues
                                              ↓
                                   TTS: aura-2-thalia-en (text → speech)
                                              ↓
                              audio chunks → Backend WS → Browser Speaker
```

Deepgram handles the entire STT→Think→TTS pipeline. We only intercept function calls to execute Perfect Corp APIs.

---

## 2. Monorepo Structure

```
mirra-ai/
├── agent/                           # AI reference docs
│   ├── perfect-corp-api-reference.md
│   ├── deepgram-voice-agent-reference.md
│   ├── system-prompt.md
│   └── technical-plan.md
├── frontend/                        # Next.js 14 (Vercel)
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   └── globals.css
│   ├── components/
│   │   ├── ConversationPanel.jsx
│   │   ├── VisualPanel.jsx
│   │   ├── ProofCard.jsx
│   │   ├── VoiceButton.jsx
│   │   ├── ProductCard.jsx
│   │   ├── SkinReport.jsx
│   │   └── LoadingOverlay.jsx
│   ├── hooks/
│   │   ├── useVoiceAgent.js
│   │   ├── useCamera.js
│   │   └── useSupabase.js
│   ├── lib/
│   │   ├── api.js
│   │   ├── supabase.js
│   │   └── constants.js
│   ├── public/
│   │   ├── products/                # 20 pre-tested product images
│   │   └── closet/                  # 15 pre-seeded closet images
│   ├── package.json
│   └── vercel.json
├── backend/                         # FastAPI (Linode K8s)
│   ├── app/
│   │   ├── main.py                  # FastAPI app + WS
│   │   ├── routers/
│   │   │   ├── voice.py             # Deepgram STT/TTS WS
│   │   │   ├── agent.py             # Gemini orchestration
│   │   │   ├── vto.py               # Perfect Corp proxy
│   │   │   └── context.py           # Calendar, weather, closet
│   │   ├── services/
│   │   │   ├── perfectcorp.py       # Perfect Corp API client
│   │   │   ├── deepgram_stt.py      # STT via WebSocket
│   │   │   ├── deepgram_tts.py      # TTS via REST
│   │   │   ├── gemini.py            # Gemini 2.5 Pro + tools
│   │   │   ├── calendar.py          # Google Calendar API
│   │   │   ├── serper.py            # Google Shopping
│   │   │   ├── weather.py           # Open-Meteo
│   │   │   └── supabase_client.py   # Supabase client
│   │   ├── tools/
│   │   │   ├── skin_tools.py
│   │   │   ├── beauty_tools.py
│   │   │   ├── fashion_tools.py
│   │   │   ├── accessory_tools.py
│   │   │   ├── hair_tools.py
│   │   │   └── shopping_tools.py
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic settings
│   │   │   └── mock_interceptor.py
│   │   └── data/
│   │       ├── closet_seed.json
│   │       └── products_catalog.json
│   ├── mocks/                       # Captured API responses
│   ├── requirements.txt
│   ├── Dockerfile
│   └── k8s/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── ingress.yaml
├── mirra_final_prd.md
└── README.md
```

---

## 3. Tech Stack & Dependencies

### Frontend (Next.js on Vercel)
```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@supabase/supabase-js": "^2.45"
  }
}
```

### Backend (FastAPI on Linode K8s)
```txt
# requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
websockets==13.0
httpx==0.27.0
python-dotenv==1.0.0
supabase==2.10.0
google-auth-oauthlib==1.2.0
google-api-python-client==2.150.0
pydantic-settings==2.5.0
pillow==10.4.0
```

### External Services
| Service | What | Auth | Cost |
|---|---|---|---|
| Perfect Corp API | VTO + Skin + Face analysis | Bearer token | 1000 units (hackathon) |
| Deepgram Voice Agent | STT + Think + TTS (one WS) | API key | $200 credit |
| Gemini 3.1 Pro | Agent brain (via Deepgram BYO) | Google AI Studio key | Free tier / ~$5 |
| Google Calendar API | Real calendar events | OAuth2 | Free |
| Supabase | Postgres + Auth + Storage | API key | Free tier |
| Serper | Google Shopping results | API key | Free 2500/mo |
| Open-Meteo | Weather data | None | Free |

---

## 4. Perfect Corp Integration (Critical Path)

### Async Task Pattern (Python)
```python
# services/perfectcorp.py
import httpx
import asyncio
from app.core.config import settings
from app.core.mock_interceptor import should_mock, get_mock

BASE = "https://yce-api-01.makeupar.com"
HEADERS = {"Authorization": f"Bearer {settings.PERFECT_CORP_API_KEY}"}

async def call_api(task_type: str, image_bytes: bytes, params: dict) -> dict:
    if should_mock():
        return get_mock(task_type)

    async with httpx.AsyncClient(timeout=60) as client:
        # 1. Get upload URL + file_id
        file_res = await client.post(
            f"{BASE}/s2s/v2.0/file/{task_type}",
            json={"files": [{"content_type": "image/png",
                             "file_name": "input.png",
                             "file_size": len(image_bytes)}]},
            headers=HEADERS,
        )
        file_data = file_res.json()["data"]["files"][0]
        file_id = file_data["file_id"]
        upload = file_data["requests"][0]

        # 2. Upload binary
        await client.put(upload["url"], content=image_bytes,
                         headers=upload["headers"])

        # 3. Create task
        task_res = await client.post(
            f"{BASE}/s2s/v2.0/task/{task_type}",
            json={"src_file_id": file_id, **params},
            headers=HEADERS,
        )
        task_id = task_res.json()["data"]["task_id"]

        # 4. Poll until done
        for _ in range(30):
            await asyncio.sleep(2)
            poll = await client.get(
                f"{BASE}/s2s/v2.0/task/{task_type}/{task_id}",
                headers=HEADERS,
            )
            data = poll.json()["data"]
            if data["task_status"] == "success":
                return data
            if data["task_status"] == "error":
                raise Exception(data.get("error", "API error"))

        raise TimeoutError(f"Task {task_id} timed out")
```

---

## 5. Deepgram Voice Agent + Gemini 3.1 Pro

Deepgram natively supports Google Gemini models. We use the **full Voice Agent** (STT→Think→TTS in one WebSocket) with Gemini 3.1 Pro via BYO endpoint.

### Deepgram Settings (sent after WS connect)
```json
{
  "type": "Settings",
  "audio": {
    "input": { "encoding": "linear16", "sample_rate": 24000 },
    "output": { "encoding": "linear16", "sample_rate": 24000, "container": "wav" }
  },
  "agent": {
    "language": "en",
    "listen": {
      "provider": { "type": "deepgram", "model": "nova-3" }
    },
    "think": {
      "provider": { "type": "google", "temperature": 0.7 },
      "endpoint": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:streamGenerateContent?alt=sse",
        "headers": { "x-goog-api-key": "YOUR_GOOGLE_AI_STUDIO_KEY" }
      },
      "prompt": "<MIRRA SYSTEM PROMPT FROM agent/system-prompt.md>",
      "functions": [
        {
          "name": "analyze_skin",
          "description": "Analyze user's skin condition from selfie.",
          "parameters": { "type": "object", "properties": {} }
        },
        {
          "name": "try_on_clothes",
          "description": "Virtual try-on a garment.",
          "parameters": { "type": "object", "properties": {
            "product_id": { "type": "string" }
          }, "required": ["product_id"] }
        },
        {
          "name": "try_on_earrings",
          "description": "Virtual try-on earrings.",
          "parameters": { "type": "object", "properties": {
            "product_id": { "type": "string" }
          }, "required": ["product_id"] }
        },
        {
          "name": "check_calendar",
          "description": "Get today's calendar events.",
          "parameters": { "type": "object", "properties": {} }
        },
        {
          "name": "check_weather",
          "description": "Get current weather.",
          "parameters": { "type": "object", "properties": {
            "location": { "type": "string" }
          } }
        },
        {
          "name": "search_products",
          "description": "Search for products to buy.",
          "parameters": { "type": "object", "properties": {
            "query": { "type": "string" },
            "max_price": { "type": "number" }
          }, "required": ["query"] }
        },
        {
          "name": "generate_proof_card",
          "description": "Generate visual approval card.",
          "parameters": { "type": "object", "properties": {
            "look_name": { "type": "string" },
            "tone_match": { "type": "number" },
            "style_fit": { "type": "number" }
          } }
        }
      ]
    },
    "speak": {
      "provider": { "type": "deepgram", "model": "aura-2-thalia-en" }
    },
    "greeting": "Hi! I'm Mirra. Let me scan your face real quick..."
  }
}
```

### Voice WebSocket Route (Backend proxies + intercepts function calls)
```python
# routers/voice.py
import websockets, json
from fastapi import WebSocket
from app.services.tool_executor import execute_tool
from app.core.config import settings

DG_URL = "wss://api.deepgram.com/v1/agent/converse"

async def voice_websocket(client_ws: WebSocket):
    await client_ws.accept()

    # Connect to Deepgram Voice Agent
    async with websockets.connect(
        DG_URL,
        extra_headers={"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}
    ) as dg_ws:
        # Send settings
        await dg_ws.send(json.dumps(get_agent_settings()))

        async def forward_dg_to_client():
            async for msg in dg_ws:
                if isinstance(msg, bytes):
                    # TTS audio → browser
                    await client_ws.send_bytes(msg)
                else:
                    data = json.loads(msg)
                    if data.get("type") == "FunctionCallRequest":
                        # Execute tool (Perfect Corp, Calendar, etc.)
                        result = await execute_tool(
                            data["function_name"], data["input"]
                        )
                        # Send result back to Deepgram
                        await dg_ws.send(json.dumps({
                            "type": "FunctionCallResponse",
                            "function_call_id": data["function_call_id"],
                            "output": json.dumps(result)
                        }))
                        # Also notify frontend
                        await client_ws.send_text(json.dumps({
                            "type": "vto_result", **result
                        }))
                    else:
                        # Forward transcripts, thinking, etc.
                        await client_ws.send_text(msg)

        async def forward_client_to_dg():
            while True:
                data = await client_ws.receive()
                if "bytes" in data:
                    await dg_ws.send(data["bytes"])  # Mic audio
                elif "text" in data:
                    msg = json.loads(data["text"])
                    if msg["type"] == "selfie":
                        current_session.selfie = msg["data"]

        await asyncio.gather(
            forward_dg_to_client(),
            forward_client_to_dg()
        )
```

---

## 7. Google Calendar Integration

```python
# services/calendar.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta

async def get_todays_events(credentials_json: dict) -> list:
    creds = Credentials.from_authorized_user_info(credentials_json)
    service = build("calendar", "v3", credentials=creds)

    now = datetime.utcnow()
    end = now + timedelta(days=1)

    events = service.events().list(
        calendarId="primary",
        timeMin=now.isoformat() + "Z",
        timeMax=end.isoformat() + "Z",
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    return [
        {
            "title": e["summary"],
            "start": e["start"].get("dateTime", e["start"].get("date")),
            "end": e["end"].get("dateTime", e["end"].get("date")),
            "location": e.get("location"),
        }
        for e in events.get("items", [])
    ]
```

For the demo: pre-authorize one Google account with OAuth2. Store refresh token in Supabase. Calendar shows real events like "Board Meeting 2pm" and "Date Night 8pm".

---

## 8. Supabase Schema

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  google_calendar_token jsonb,
  created_at timestamptz default now()
);

-- Body Model (skin scores, preferences, history)
create table body_model (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  skin_scores jsonb,          -- latest skin analysis
  skin_tone jsonb,            -- undertone, depth, colors
  face_shape jsonb,           -- face geometry
  preferences jsonb,          -- style prefs learned over time
  updated_at timestamptz default now()
);

-- Closet
create table closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  name text not null,
  category text not null,     -- 'dress', 'jacket', 'shoes', etc.
  color text,
  brand text,
  image_url text,             -- Supabase Storage URL
  occasions text[],           -- ['office','date','casual']
  last_worn timestamptz,
  times_worn int default 0,
  created_at timestamptz default now()
);

-- Proof Cards (approval history)
create table proof_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  look_name text,
  occasion text,
  tone_match float,
  style_fit float,
  skin_safe boolean,
  owned_items jsonb,
  new_items jsonb,
  total_cost float,
  approved boolean,
  result_image_url text,
  created_at timestamptz default now()
);

-- Session memory
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  conversation jsonb,         -- full conversation history
  selfie_url text,
  created_at timestamptz default now()
);
```

```python
# services/supabase_client.py
from supabase import create_client
from app.core.config import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

async def get_closet(user_id: str):
    return supabase.table("closet_items")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute().data

async def save_skin_scores(user_id: str, scores: dict):
    supabase.table("body_model")\
        .upsert({"user_id": user_id, "skin_scores": scores})\
        .execute()
```

---

## 9. Deployment

### Frontend → Vercel
```json
{
  "env": {
    "NEXT_PUBLIC_BACKEND_URL": "https://mirra-api.yourdomain.com",
    "NEXT_PUBLIC_WS_URL": "wss://mirra-api.yourdomain.com",
    "NEXT_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "xxx"
  }
}
```

### Backend → Linode K8s
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
COPY mocks/ ./mocks/
COPY agent/ ./agent/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mirra-backend
spec:
  replicas: 2
  selector:
    matchLabels: { app: mirra-backend }
  template:
    metadata:
      labels: { app: mirra-backend }
    spec:
      containers:
      - name: mirra-backend
        image: registry.yourdomain.com/mirra-backend:latest
        ports: [{ containerPort: 8000 }]
        envFrom:
        - secretRef:
            name: mirra-secrets
        resources:
          requests: { memory: "256Mi", cpu: "250m" }
          limits: { memory: "512Mi", cpu: "500m" }
---
apiVersion: v1
kind: Service
metadata:
  name: mirra-backend
spec:
  selector: { app: mirra-backend }
  ports: [{ port: 80, targetPort: 8000 }]
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mirra-backend
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/websocket-services: mirra-backend
spec:
  tls:
  - hosts: [mirra-api.yourdomain.com]
    secretName: mirra-api-tls
  rules:
  - host: mirra-api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service: { name: mirra-backend, port: { number: 80 } }
```

---

## 10. Environment Variables

```bash
# Backend (.env)
PERFECT_CORP_API_KEY=xxx
DEEPGRAM_API_KEY=xxx
GOOGLE_AI_STUDIO_KEY=xxx         # For Gemini 3.1 Pro via Deepgram BYO
SERPER_API_KEY=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
GOOGLE_CALENDAR_CREDENTIALS=xxx  # JSON string
USE_MOCKS=true
PORT=8000
CORS_ORIGIN=https://mirra.vercel.app
```

---

## 11. Build Timeline

| Day | Person A (Frontend) | Person B (Backend) |
|---|---|---|
| **1** | Init Next.js. Design system CSS. Camera hook. Supabase client setup. | Init FastAPI. Perfect Corp client (Python async). Mock interceptor. Capture mocks. Supabase schema + seed. |
| **2** | Conversation panel. Visual panel. Voice button + Web Audio. | Gemini agent with tools. Skin Analysis + Tone + Face integration. Google Calendar OAuth. |
| **3** | VTO result display. Product cards. Closet UI from Supabase. | Makeup VTO + Clothes VTO + Hair VTO. Owned-first engine. Weather + Calendar tools. |
| **4** | Proof Card. Loading states. Audio playback from Deepgram TTS. | Deepgram STT/TTS pipeline. Voice WS route. Earrings + Necklace VTO. |
| **5** | Polish animations. Error handling. Deploy Vercel. | Live API testing (~200 units). Docker build. Deploy K8s. |
| **6** | **BOTH:** Record demo (90s). Devpost. Submit. |
