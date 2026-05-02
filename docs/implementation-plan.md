# Mirra — Implementation Plan (Day 1-2)

Detailed specs for every initial task. Each section covers: what to build, design patterns, file locations, acceptance criteria, and pitfalls.

---

## Current State (Already Done)

| Item | Status |
|---|---|
| Next.js 14 + TS + Tailwind scaffold | ✅ |
| FastAPI scaffold (main.py, config, routers, services) | ✅ |
| Perfect Corp client (perfectcorp.py) | ✅ |
| Mock interceptor | ✅ |
| Voice WS route (voice.py) | ✅ |
| Tool executor (tool_executor.py) | ✅ |
| Weather, Calendar, Serper services | ✅ |
| Closet, VTO, Context routers | ✅ |
| .env.example files | ✅ |
| PWA manifest.json | ✅ |
| Dockerfile, K8s manifests, GitHub Actions | ✅ |

**What's NOT done:** Frontend UI, design system, camera hook, voice hook, Supabase schema applied, mock data captured, system prompt finalized, product/closet seed data.

---

## DAY 1 TASKS

### F2: Design System (Tailwind Config + Global CSS)

**File:** `frontend/src/app/globals.css`

**Design Tokens:**
```
Colors:
  --bg-primary:     #0a0a0a (near-black)
  --bg-surface:     #141414 (card backgrounds)
  --bg-glass:       rgba(255,255,255,0.05) (glassmorphism)
  --accent:         #c084fc (purple-400)
  --accent-glow:    rgba(192,132,252,0.3)
  --text-primary:   #fafafa
  --text-secondary: #a1a1aa (zinc-400)
  --success:        #4ade80
  --warning:        #fbbf24
  --danger:         #f87171

Typography:
  Font: Inter (already loaded in layout.tsx)
  h1: 2rem/600  h2: 1.5rem/600  body: 0.9rem/400  caption: 0.75rem/400

Spacing: 4px grid (p-1=4px, p-2=8px, p-4=16px)

Borders: border border-white/10 rounded-2xl
Glass: bg-white/5 backdrop-blur-xl border border-white/10
Glow: shadow-[0_0_30px_rgba(192,132,252,0.15)]
```

**Pattern:** All reusable styles as Tailwind `@layer components` in globals.css. Components use utility classes directly.

**Acceptance:** Dark background, glass cards, purple accent glow. Looks premium on first load.

---

### F3: Single-Screen Layout

**File:** `frontend/src/app/page.tsx`

**Layout (Desktop):**
```
┌──────────────────────────────────────────┐
│  Header: "Mirra" logo + status indicator  │  h-14
├─────────────────┬────────────────────────┤
│                 │                        │
│  Visual Panel   │  Conversation Panel    │
│  (camera/VTO)   │  (messages + voice)    │
│  w-1/2          │  w-1/2                 │
│                 │                        │
│                 ├────────────────────────┤
│                 │  Voice Button (bottom) │  h-20
└─────────────────┴────────────────────────┘
```

**Layout (Mobile — ≤768px):**
```
┌──────────────────────┐
│  Visual Panel (40vh)  │
├──────────────────────┤
│  Conversation (50vh)  │
├──────────────────────┤
│  Voice Button (10vh)  │
└──────────────────────┘
```

**Pattern:** CSS Grid. `grid-cols-1 md:grid-cols-2`. Visual panel uses `aspect-[3/4]` to maintain portrait ratio.

**Components needed:**
- `src/components/layout/Header.tsx`
- `src/components/visual/VisualPanel.tsx`
- `src/components/conversation/ConversationPanel.tsx`
- `src/components/voice/VoiceButton.tsx`

**State architecture (React Context):**
```typescript
// src/context/MirraContext.tsx
interface MirraState {
  selfie: string | null;           // base64
  currentImage: string | null;     // selfie or VTO result
  messages: Message[];
  isListening: boolean;
  isThinking: boolean;
  isProcessingVTO: boolean;
  skinScores: SkinScores | null;
  proofCard: ProofCard | null;
}
```

**Why Context, not Redux:** Single-page app, one screen, no complex routing. Context + useReducer is sufficient and zero-dependency.

**Acceptance:** Responsive layout. Camera on left, chat on right. Mobile stacks vertically. No scroll jank.

---

### F4: Camera Capture Hook

**File:** `frontend/src/hooks/useCamera.ts`

```typescript
interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement>;
  isReady: boolean;
  error: string | null;
  captureFrame: () => string | null;  // returns base64 PNG
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}
```

**Implementation details:**
- `getUserMedia({ video: { facingMode: 'user', width: 720, height: 960 } })`
- Capture via hidden canvas: `canvas.toDataURL('image/png')`
- Resolution: 720×960 (portrait, matches Perfect Corp's >60% face requirement)
- Auto-start on mount, cleanup stream on unmount
- Error handling: NotAllowedError → "Camera permission denied", NotFoundError → "No camera found"

**Latency concern:** Capture is synchronous (~5ms). No bottleneck.

**Pitfall:** iOS Safari requires `playsinline` attribute on video element. Must add `muted autoPlay playsInline` props.

**Acceptance:** Camera feed shows in VisualPanel. Single-tap captures selfie as base64. Works on mobile Safari.

---

### B4: Capture Mock Data

**Directory:** `backend/mocks/`

**Files to create (with structure):**
```
mocks/
├── skin-analysis.json        # Full 14-concern skin analysis
├── skin-tone.json            # Undertone, depth, color profile
├── face-attributes.json      # Face shape, proportions
├── clothes-vto.json          # Result image URL
├── makeup-vto.json           # Result image URL
├── hair-style-vto.json       # Result image URL
├── earrings-vto.json         # Result image URL
├── necklace-vto.json         # Result image URL
└── README.md                 # How to capture new mocks
```

**How to capture:** Go to Perfect Corp API Playground → run each API with a test selfie → copy the full JSON response → save to file. Include the `data` wrapper.

**Mock structure must match live API exactly** — same field names, same nesting. The mock interceptor does a simple file read, so the shape must be identical to what `perfectcorp.py` returns.

**Acceptance:** `USE_MOCKS=true` → every tool call returns valid data. No API units consumed.

---

### I1: Supabase Setup

**File:** `backend/supabase/schema.sql` (extract from technical-plan.md)

**Tables (in order, respecting FK constraints):**
1. `users`
2. `body_model` (FK → users)
3. `skin_scans` (FK → users) + index
4. `closet_items` (FK → users)
5. `proof_cards` (FK → users)
6. `outfit_logs` (FK → users, proof_cards)
7. `style_profile` (FK → users)
8. `sessions` (FK → users)

**Seed data needed:**

**Demo user:**
```json
{ "id": "demo-user-001", "email": "demo@mirra.ai" }
```

**Closet items (15):**
```
Category    | Items
jacket      | Navy Blazer, Black Leather Jacket
dress       | White Midi Dress, Sage Wrap Dress
top         | Cream Silk Blouse, Black Turtleneck, Grey Cashmere Sweater
bottom      | Dark Wash Jeans, Black Trousers, Khaki Chinos
shoes       | Sam Edelman Black Heels, White Sneakers, Brown Loafers
accessory   | Gold Watch, Pearl Stud Earrings
```

Each with: name, category, color, brand, occasions[], image_url (Supabase Storage), times_worn, last_worn.

**Product catalog (20 pre-tested):** Store in `backend/app/data/products_catalog.json`. Not in Supabase — static for hackathon.

**RLS policies:** Skip for hackathon (use service key). Add post-hackathon.

**Acceptance:** `supabase.table("closet_items").select("*").eq("user_id", "demo-user-001")` returns 15 items.

---

## DAY 2 TASKS

### F5: Conversation Panel

**File:** `frontend/src/components/conversation/ConversationPanel.tsx`

**Message type:**
```typescript
interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  toolCall?: string;       // "analyze_skin", "try_on_clothes"
  isStreaming?: boolean;    // for typewriter effect
}
```

**Design patterns:**
- **Virtualized list:** Not needed for hackathon (<100 messages). Use simple `div` with `overflow-y-auto`.
- **Auto-scroll:** `useEffect` with `scrollIntoView({ behavior: 'smooth' })` on new message.
- **Typewriter effect:** Agent messages render character-by-character (30ms/char) via `requestAnimationFrame`.
- **Tool call indicators:** Inline badges: "🔍 Analyzing skin..." → "✓ Skin analysis complete".
- **Glassmorphism bubbles:** User = right-aligned purple-ish. Agent = left-aligned glass.

**Acceptance:** Messages appear in real-time. Auto-scrolls. Tool calls show inline status.

---

### F6: Voice Button + Audio Pipeline

**File:** `frontend/src/hooks/useVoiceAgent.ts`

**This is the most latency-critical component.**

```typescript
interface UseVoiceAgentReturn {
  isConnected: boolean;
  isListening: boolean;
  connect: (selfieBase64: string) => void;
  disconnect: () => void;
  toggleMic: () => void;
  messages: Message[];          // from ConversationText events
  currentVTOResult: any | null; // from vto_result events
}
```

**Audio capture pipeline:**
```
Mic → MediaStream → AudioWorkletNode → PCM linear16 → WebSocket
```

**Why AudioWorklet, not ScriptProcessorNode:** ScriptProcessorNode runs on main thread (blocks UI). AudioWorklet runs on audio thread. Required for smooth waveform animation + zero audio dropouts.

**AudioWorklet processor (`public/audio-processor.js`):**
```javascript
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0][0]; // mono channel
    if (input) {
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
```

**Sample rate:** Browser captures at 48kHz. Deepgram expects 24kHz. Two options:
1. **Resample client-side** (simple downsample by factor 2)
2. **Let Deepgram handle it** (set `sample_rate: 48000` in settings)

**Recommendation:** Option 2. Less client code, Deepgram handles resampling well.

**TTS playback pipeline:**
```
WebSocket binary → ArrayBuffer → AudioContext.decodeAudioData → AudioBufferSourceNode → play
```

**Barge-in handling:** When user starts speaking while TTS is playing:
1. Deepgram sends `UserStartedSpeaking` event
2. Frontend stops current TTS playback immediately
3. Frontend clears audio queue

**WebSocket reconnection:** Exponential backoff (1s, 2s, 4s, max 10s). After 3 failures, show error UI.

**Acceptance:** Tap mic → speak → see transcript in <500ms → hear agent response. Barge-in works.

---

### F7: Visual Panel

**File:** `frontend/src/components/visual/VisualPanel.tsx`

**States:**
```
CAMERA    → Live camera feed (pre-selfie)
SELFIE    → Captured selfie (static image)
VTO       → VTO result image (fade transition from selfie)
LOADING   → Shimmer/pulse animation over current image
```

**Transition pattern:**
```typescript
type VisualState = 'camera' | 'selfie' | 'vto' | 'loading';

// On VTO result: selfie → loading (pulse) → vto (crossfade 300ms)
// On new conversation: vto → selfie (reset)
```

**CSS transition:** Use `opacity` + `position: absolute` overlay for crossfade. Two `<img>` elements stacked — old fades out, new fades in. CSS `transition: opacity 300ms ease-in-out`.

**Loading state:** Gradient shimmer over current image + text: "Building your look..."

**Acceptance:** Camera shows live. Selfie capture freezes frame. VTO result crossfades smoothly. Loading pulse visible during VTO calls.

---

### B5 + B6: Voice Agent WebSocket (Already scaffolded — verify correctness)

**File:** `backend/app/routers/voice.py` (exists, needs testing)

**Critical correctness checks:**
1. **Selfie must be stored BEFORE first function call.** Frontend sends selfie immediately after WS connect. Race condition if agent auto-triggers `analyze_skin` before selfie arrives.
   - **Fix:** In `build_agent_settings()`, remove `greeting` auto-trigger. Instead, frontend sends selfie first, then sends a JSON `{"type": "ready"}` message. Only then do we inject the greeting via `InjectAgentMessage`.

2. **FunctionCallResponse must include `function_call_id`** — not just function name. Deepgram uses this to match responses to requests.

3. **Binary vs text framing:** Deepgram sends TTS audio as binary frames, events as text frames. Our proxy must handle both correctly. Current code does this via `isinstance(msg, bytes)` — correct.

4. **Concurrent function calls:** Gemini may issue multiple function calls in one turn. Current `execute_tool` is called sequentially per event — correct, but we should handle parallel calls if Deepgram batches them.

---

### B7: Skin Analysis Tool

**File:** `backend/app/tools/skin_tools.py`

```python
async def analyze_skin(selfie_bytes: bytes) -> dict:
    result = await perfectcorp.call_api("skin-analysis", selfie_bytes, {
        "dst_actions": [
            "wrinkle", "pore", "texture", "acne", "moisture",
            "oiliness", "redness", "radiance", "firmness",
            "dark_circle_v2", "eye_bag", "age_spot"
        ],
        "format": "json",
    })
    # Persist to skin_scans table
    await save_skin_scan(user_id, result)
    # Update body_model with latest
    await update_body_model(user_id, skin_scores=result)
    return result
```

**Correctness:** Perfect Corp requires:
- Portrait orientation
- >60% face coverage
- <10MB file size
- Supported formats: JPEG, PNG

**Validation (add to tool_executor before calling):**
```python
from PIL import Image
import io

def validate_selfie(image_bytes: bytes) -> bool:
    img = Image.open(io.BytesIO(image_bytes))
    w, h = img.size
    if h < w:  # landscape
        return False
    if len(image_bytes) > 10_000_000:  # >10MB
        return False
    return True
```

---

### B8: Google Calendar Integration

**File:** `backend/app/services/calendar.py` (exists, needs OAuth flow)

**For hackathon demo:** Pre-authorize one Google account:
1. Go to Google Cloud Console → create OAuth client (Desktop type)
2. Run one-time auth flow locally → get refresh token
3. Store refresh token as `GOOGLE_CALENDAR_CREDENTIALS` env var (JSON string)
4. At runtime: create Credentials from JSON → build calendar service → list events

**Fallback:** If no credentials, return mock events (already implemented).

**Latency:** Google Calendar API: ~200-400ms. Cache for 5 minutes (events don't change mid-session).

```python
_calendar_cache: dict[str, tuple[float, dict]] = {}
CACHE_TTL = 300  # 5 minutes

async def get_todays_events() -> dict:
    cache_key = "today"
    if cache_key in _calendar_cache:
        cached_at, data = _calendar_cache[cache_key]
        if time.time() - cached_at < CACHE_TTL:
            return data
    
    result = await _fetch_from_google()
    _calendar_cache[cache_key] = (time.time(), result)
    return result
```

---

## DESIGN PATTERNS SUMMARY

| Pattern | Where | Why |
|---|---|---|
| **Context + useReducer** | Frontend state | Single-page, no routing complexity. Zero dependencies. |
| **AudioWorklet** | Voice capture | Off-main-thread audio. No UI jank. |
| **WebSocket proxy** | Backend voice route | Full control over function calls. Deepgram handles STT/Think/TTS. |
| **Strategy pattern** | tool_executor.py | match/case routes to correct handler. Easy to add new tools. |
| **Cache-aside** | Calendar, weather | TTL-based dict cache. Upgrades to Redis post-hackathon. |
| **Mock interceptor** | All API calls | Single toggle (`USE_MOCKS`) switches entire API layer. |
| **Progressive reveal** | Visual panel | Show partial results (shimmer → crossfade) to mask VTO latency. |
| **Exponential backoff** | WS reconnection | Prevents thundering herd on transient failures. |

## LATENCY TARGETS

| Operation | Target | Actual |
|---|---|---|
| Camera capture | <10ms | ~5ms (canvas toDataURL) |
| Selfie → backend | <100ms | ~50ms (base64 over WS) |
| STT first word | <500ms | ~300ms (Deepgram streaming) |
| LLM response | <1.5s | ~800ms (Gemini 3.1 Pro) |
| TTS first byte | <300ms | ~200ms (Deepgram streaming) |
| Full voice turn | <2.5s | ~1.9s |
| VTO API call | <15s | 8-15s (external, can't control) |
| Supabase query | <100ms | ~50ms |
| Calendar API | <500ms | ~300ms (cached after first) |
| Weather API | <500ms | ~200ms (cached) |

## SCALABILITY NOTES

| Decision | Hackathon | Production |
|---|---|---|
| Session storage | In-memory dict | Redis |
| Calendar cache | In-memory dict | Redis with pub/sub invalidation |
| WebSocket | Single process | Sticky sessions + Redis pub/sub |
| VTO results | No cache | Redis cache (selfie hash + product_id → result) |
| Background jobs | Inline | Celery + Redis |
| DB connections | Direct | PgBouncer (Supabase built-in) |
