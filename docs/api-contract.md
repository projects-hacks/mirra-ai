# Mirra — Frontend ↔ Backend API Contract

All communication between frontend and backend.

## Base URLs
- **Local dev:** `http://localhost:8000`
- **Production:** `https://mirra-api.yourdomain.com`
- **WebSocket:** `ws://localhost:8000/ws/voice` (dev) / `wss://mirra-api.yourdomain.com/ws/voice` (prod)

---

## 1. Voice WebSocket — `/ws/voice`

Bidirectional WebSocket. Frontend sends mic audio + selfie. Backend proxies to Deepgram and returns transcripts, tool results, and TTS audio.

### Client → Server
| Type | Format | Payload |
|---|---|---|
| Mic audio | Binary (bytes) | Raw PCM linear16, 24kHz, mono |
| Selfie | JSON | `{ "type": "selfie", "data": "<base64 png>" }` |
| Stop | JSON | `{ "type": "stop" }` |

### Server → Client
| Type | Format | Payload |
|---|---|---|
| TTS audio | Binary (bytes) | WAV audio chunks |
| Transcript | JSON | `{ "type": "ConversationText", "role": "user", "content": "..." }` |
| Agent text | JSON | `{ "type": "ConversationText", "role": "agent", "content": "..." }` |
| Thinking | JSON | `{ "type": "AgentThinking" }` |
| Tool call | JSON | `{ "type": "FunctionCallRequest", "function_name": "analyze_skin" }` |
| VTO result | JSON | `{ "type": "vto_result", "tool": "try_on_clothes", "image_url": "..." }` |
| Skin result | JSON | `{ "type": "vto_result", "tool": "analyze_skin", "scores": {...} }` |
| Proof card | JSON | `{ "type": "vto_result", "tool": "generate_proof_card", "card": {...} }` |
| Error | JSON | `{ "type": "error", "message": "..." }` |

---

## 2. REST Endpoints

### Health
```
GET /health
→ { "status": "ok", "version": "1.0.0" }
```

### Closet
```
GET /api/closet?user_id={id}
→ { "items": [{ "id": "own-001", "name": "Navy Blazer", "category": "jacket", ... }] }

POST /api/closet
Body: { "user_id": "...", "name": "...", "category": "...", "image": "<base64>" }
→ { "id": "own-003", "image_url": "https://..." }

DELETE /api/closet/{item_id}
→ { "deleted": true }
```

### Body Model
```
GET /api/body-model?user_id={id}
→ { "skin_scores": {...}, "skin_tone": {...}, "face_shape": {...}, "preferences": {...} }

PUT /api/body-model
Body: { "user_id": "...", "skin_scores": {...} }
→ { "updated": true }
```

### Products
```
GET /api/products?occasion={occasion}&category={category}
→ { "products": [{ "id": "dress-001", "name": "...", "price": 98, ... }] }

GET /api/products/search?q={query}&max_price={price}
→ { "results": [{ "title": "...", "price": 45, "url": "...", "image": "..." }] }
```

### Context
```
GET /api/context/weather?location={city}
→ { "temp_f": 72, "condition": "Partly Cloudy", "humidity": 45 }

GET /api/context/calendar?user_id={id}
→ { "events": [{ "title": "Board Meeting", "start": "14:00", "location": "Office" }] }
```

### VTO (Direct — for non-voice flows)
```
POST /api/vto/skin-analysis
Body: { "image": "<base64>" }
→ { "scores": { "all": 75.76, "skin_age": 37, "moisture": {...}, ... } }

POST /api/vto/try-on
Body: { "selfie": "<base64>", "product_id": "dress-001", "vto_type": "clothes" }
→ { "result_image_url": "https://..." }
```

### Proof Cards
```
GET /api/proof-cards?user_id={id}
→ { "cards": [{ "id": "...", "look_name": "Board Meeting", "tone_match": 97, ... }] }

POST /api/proof-cards
Body: { "user_id": "...", "look_name": "...", "items": [...], "tone_match": 97, ... }
→ { "id": "...", "created_at": "..." }
```

---

## 3. Error Format
All errors return:
```json
{
  "error": true,
  "message": "Human-readable error message",
  "code": "PERFECT_CORP_TIMEOUT"
}
```

Error codes:
| Code | Meaning |
|---|---|
| `PERFECT_CORP_TIMEOUT` | VTO task didn't complete in 60s |
| `PERFECT_CORP_ERROR` | VTO task returned error |
| `INVALID_IMAGE` | Image too large, wrong format, no face detected |
| `DEEPGRAM_ERROR` | Voice agent connection failed |
| `CALENDAR_AUTH_REQUIRED` | Google Calendar needs re-auth |
| `RATE_LIMITED` | Too many requests |
