# Mirra — System Architecture Overview

Product workflows, data flow, latency budget, scalability, and reliability.

---

## 1. Product Workflows (End-to-End)

### Flow A: First-Time Onboarding (Cold Start → Warm User in 60s)
```
User opens Mirra
  → Google OAuth (Supabase Auth)
  → Camera permission → capture selfie
  → PARALLEL:
      ├─ Skin Analysis (Perfect Corp) ─────── 8-12s
      ├─ Skin Tone Detection (Perfect Corp) ── 5-8s
      └─ Face Shape Analysis (Perfect Corp) ── 5-8s
  → Results stored in body_model + skin_scans
  → Agent greets: "Your skin's looking great — 78 overall. Slight dryness though."
  → "Want to connect your calendar so I know what's coming up?"
  → Google Calendar OAuth
  → "Got it. Board meeting at 2pm. Let's build a look."
```
**Latency concern:** 3 parallel API calls. All fire simultaneously. Total wall time = max(8,5,5) = ~12s. User sees progressive results.

---

### Flow B: Daily Styling ("What should I wear?")
```
User voice: "What should I wear today?"
  → Deepgram STT → Gemini 3.1 Pro (intent: build_look)
  → Agent calls check_calendar → "Board meeting 2pm, date 8pm"
  → Agent calls check_weather → "72°F, partly cloudy"
  → Agent calls get_closet → 23 items
  → Gemini reasons:
      "Board meeting = business formal. Date = smart casual.
       User has navy blazer (worn 23x, power piece).
       Gap: no date-appropriate dress under $100."
  → Agent shows: owned outfit for meeting
  → Agent calls try_on_clothes (navy blazer) → VTO result
  → "For tonight, you need a dress. Let me find one."
  → Agent calls search_products → 3 options
  → Agent calls try_on_clothes (top result) → VTO result
  → Agent calls generate_proof_card → visual receipt
  → User approves → outfit_log created
```
**Latency budget:**

| Step | Time | Runs |
|---|---|---|
| STT (Deepgram) | ~300ms | Streaming |
| LLM Think (Gemini) | ~800ms | Per turn |
| Calendar + Weather | ~200ms | Parallel |
| Closet query | ~50ms | Supabase |
| VTO (Perfect Corp) | 8-15s | Per item |
| TTS (Deepgram) | ~200ms | Streaming |

**Key insight:** Voice conversation is fast (~1.3s per turn). VTO is slow (~12s). Solution: **Agent talks while VTO loads.** "Let me show you in that blazer — give me a sec" → VTO fires → result appears.

---

### Flow C: Skin Check-In (Longitudinal Tracking)
```
User: "How's my skin doing?"
  → Agent triggers analyze_skin (new scan)
  → Agent queries skin_scans (last 30 days)
  → Gemini compares: current vs. 7-day avg vs. 30-day avg
  → "Your moisture is up 8% since you switched to that serum.
     Acne score is stable at 88. Pores slightly enlarged — maybe exfoliate?"
  → Scores saved to skin_scans
  → body_model updated with latest snapshot
```

---

### Flow D: Closet Management
```
User: "I just bought a new jacket"
  → Agent asks for photo (user uploads or takes photo)
  → Image stored in Supabase Storage
  → Gemini extracts: category, color, brand, occasions
  → closet_items row created
  → "Nice! That sage bomber fills your casual gap. Cost-per-wear starts at $89."
```

---

### Flow E: Next-Day Follow-Up (Feedback Loop)
```
[Push notification, 24h after approved look]
  → "How'd last night's date look go?"
  → User: "Got so many compliments!"
  → outfit_log updated: outcome='loved', compliments=true
  → style_profile recalculated
  → Mirra now knows: sage green + gold earrings = date winner
```

---

### Flow F: Seasonal Intelligence (Weekly Batch)
```
[Cron job, weekly]
  → For each active user:
      → Query outfit_logs (last 7 days)
      → Query skin_scans (last 7 days)
      → Compute style_profile for this period
      → Detect drift vs. previous period
      → If significant change → queue insight notification
```

---

## 2. Data Architecture

### What Goes Where and Why

```
┌─────────────────────────────────────────────────┐
│  Supabase Postgres (Primary Data Store)          │
│                                                   │
│  Users, Body Model, Closet Items, Proof Cards,    │
│  Outfit Logs, Skin Scans, Style Profiles,         │
│  Sessions, Calendar Tokens                        │
│                                                   │
│  WHY: Relational integrity, RLS for multi-user,   │
│       real-time subscriptions, free tier adequate  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Supabase Storage (Binary Assets)                 │
│                                                   │
│  Selfie images, Closet item photos,               │
│  VTO result images, Proof Card screenshots         │
│                                                   │
│  WHY: CDN-backed, signed URLs, tied to auth,      │
│       5GB free tier                                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Redis (Session Cache + Rate Limiting)            │
│  [Post-hackathon — use in-memory dict for now]    │
│                                                   │
│  Active voice sessions, user context cache,        │
│  API rate limit counters, VTO result cache          │
│                                                   │
│  WHY: Sub-ms reads, TTL expiry, pub/sub for WS    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  In-Memory (Python dict, per-process)             │
│  [Hackathon phase only]                           │
│                                                   │
│  Active WebSocket sessions, selfie bytes,          │
│  conversation history (lives in Deepgram context)  │
│                                                   │
│  WHY: Zero latency, acceptable for single replica │
└─────────────────────────────────────────────────┘
```

### Data Access Patterns

| Query | Frequency | Latency Target | Store |
|---|---|---|---|
| Get user body_model | Every session start | <50ms | Supabase (indexed) |
| Get closet items | Every styling request | <50ms | Supabase (indexed) |
| Get skin trend (30d) | Every skin check-in | <100ms | Supabase (indexed by user+date) |
| Get today's calendar | Every session start | <500ms | Google Calendar API (cached 5min) |
| Get weather | Every session start | <300ms | Open-Meteo (cached 30min) |
| Get style profile | Every session start | <50ms | Supabase (latest period) |
| Write skin scan | Every scan | <100ms | Supabase insert |
| Write outfit log | Every approval | <100ms | Supabase insert |
| VTO result image | Every try-on | N/A (async) | Supabase Storage |

---

## 3. Latency Architecture

### The Two-Speed Problem
Voice conversation is **fast** (sub-second). VTO is **slow** (8-15s). They must coexist.

### Solution: Talk While Processing

```
Timeline:
0.0s  User: "Show me in that dress"
0.3s  STT completes
0.8s  Gemini decides: call try_on_clothes
0.9s  Agent speaks: "Great choice — let me show you in that. One sec."
1.0s  VTO API call fires (background)
1.2s  TTS audio plays to user
...   Agent can answer other questions while VTO runs
12.0s VTO result arrives
12.1s Frontend swaps image with fade animation
12.2s Agent: "There you go! The sage green really works with your skin tone."
```

**Implementation:** Deepgram's Voice Agent handles the conversation flow. VTO runs as a background task. When complete, we inject the result via `UpdatePrompt` and the agent can comment on it.

### Latency Budget Per Turn (Non-VTO)

```
Browser → Backend WS:         ~20ms
Backend → Deepgram WS:        ~30ms
Deepgram STT (streaming):    ~300ms
Deepgram → Gemini 3.1 Pro:   ~800ms
Gemini response:              ~500ms
Deepgram TTS (streaming):    ~200ms
Backend → Browser:             ~20ms
─────────────────────────────────────
Total first-byte:            ~1.9s
```

Acceptable for voice. User perceives <2s response time.

### Caching Strategy

| What | TTL | Why |
|---|---|---|
| Weather | 30 min | Doesn't change fast |
| Calendar events | 5 min | New events rare mid-session |
| User body_model | Session | Doesn't change within a session |
| Closet items | Session | Rarely changes mid-conversation |
| Style profile | 24 hours | Computed weekly |
| Product catalog | 1 hour | Static for hackathon |
| VTO results | 24 hours | Same selfie + same product = same result |

---

## 4. Scalability Path

### Hackathon (Now): 1-10 users
```
1 FastAPI replica (Linode 4GB)
In-memory session storage
Supabase free tier
Deepgram pay-as-you-go
```

### Post-Hackathon: 100-1K users
```
2 FastAPI replicas (Linode 8GB each)
Redis for session cache + pub/sub
Supabase Pro ($25/mo)
Deepgram Growth plan
Connection pooling (PgBouncer via Supabase)
```

### Growth: 10K-100K users
```
Auto-scaling K8s (3-10 replicas)
Redis Cluster
Supabase Team ($599/mo) or self-hosted Postgres
CDN for VTO result images (Cloudflare)
Background job queue (Celery + Redis) for:
  - Batch style profile computation
  - Skin trend calculations
  - Push notification scheduling
WebSocket load balancing (sticky sessions)
```

### Key Scaling Bottleneck
**Perfect Corp API** is the bottleneck, not our infra. Each VTO call takes 8-15s and is rate-limited. Solutions:
1. **Result caching** — same selfie + same product = cache hit
2. **Speculative prefetch** — if Mirra thinks user will try item B next, pre-fire it
3. **Parallel execution** — fire multiple VTO calls simultaneously
4. **Graceful degradation** — show product image if VTO times out

---

## 5. Reliability

### What Can Fail and What Happens

| Component | Failure Mode | Mitigation |
|---|---|---|
| Deepgram WS | Connection drop | Auto-reconnect (3 retries), fall to text-only mode |
| Gemini 3.1 Pro | Rate limit / timeout | Deepgram fallback chain: Gemini → GPT-4.1 → Claude Haiku |
| Perfect Corp API | Timeout / error | Return mock result + "couldn't generate preview" message |
| Supabase | Connection pool exhausted | Retry with backoff, degrade to session-only memory |
| Google Calendar | OAuth token expired | Silent refresh, fall to mock events |
| Open-Meteo | API down | Cached last-known weather, or skip context |
| WebSocket (client) | Network drop | Frontend reconnect with exponential backoff + resume |

### Deepgram LLM Fallback (Built-In)
Deepgram Voice Agent supports **ordered fallback chains**:
```json
"think": [
  { "provider": { "type": "google" }, "endpoint": { "url": "...gemini-3.1-pro..." } },
  { "provider": { "type": "open_ai", "model": "gpt-4.1-mini" } },
  { "provider": { "type": "anthropic", "model": "claude-4-5-haiku-latest" } }
]
```
If Gemini is slow/down → auto-falls to GPT → auto-falls to Claude. Zero code change.

### Health Monitoring
```
GET /health → checks:
  - Database connection (Supabase ping)
  - Deepgram API reachable
  - Perfect Corp API reachable
  - Memory usage
  - Active WebSocket count
```

K8s liveness/readiness probes hit `/health`. Unhealthy pods get restarted.

---

## 6. Security

| Concern | Solution |
|---|---|
| API keys exposed | All keys server-side only. Frontend talks to our backend. |
| User selfies | Encrypted at rest (Supabase Storage). User can delete anytime. |
| Voice data | Never stored. Session-only, discarded on disconnect. |
| Auth | Supabase Auth (Google OAuth). RLS policies on all tables. |
| CORS | Whitelisted origins only. |
| WebSocket auth | Token validated on connection handshake. |
| Calendar tokens | Encrypted in Supabase. Refresh tokens only, no password storage. |

---

## 7. System Diagram

```
                            ┌──────────────┐
                            │   Vercel CDN  │
                            │   (Frontend)  │
                            └──────┬───────┘
                                   │ HTTPS + WSS
                                   ▼
                         ┌─────────────────────┐
                         │   Cloudflare / DNS    │
                         └─────────┬───────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │     Linode K8s Cluster         │
                    │  ┌────────────────────────┐   │
                    │  │  Nginx Ingress (SSL)    │   │
                    │  └───────────┬────────────┘   │
                    │              │                 │
                    │  ┌───────────▼────────────┐   │
                    │  │  FastAPI Pod (×2)       │   │
                    │  │                        │   │
                    │  │  /ws/voice  ──────────────────→ Deepgram Voice Agent
                    │  │  /api/vto/* ──────────────────→ Perfect Corp APIs
                    │  │  /api/context ────────────────→ Google Calendar
                    │  │                        │   │   Open-Meteo
                    │  │  /api/closet ─────────────────→ Supabase
                    │  └────────────────────────┘   │
                    │                               │
                    │  [Future: Redis, Celery]       │
                    └──────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │        Supabase Cloud        │
                    │  Postgres + Auth + Storage    │
                    └─────────────────────────────┘
```

---

## 8. API Unit Budget (Hackathon: 1000 units)

| Activity | Units/Call | Calls | Total |
|---|---|---|---|
| Skin Analysis | 1 | 10 | 10 |
| Skin Tone | 1 | 10 | 10 |
| Face Shape | 1 | 5 | 5 |
| Clothes VTO | 1 | 100 | 100 |
| Makeup VTO | 1 | 50 | 50 |
| Earrings VTO | 1 | 30 | 30 |
| Hair Style | 1 | 20 | 20 |
| **Development testing** | | | **225** |
| **Demo recording** (4 takes) | | ~40/take | **160** |
| **Live judging** | | ~50 | **50** |
| **Buffer** | | | **350** |
| **Total** | | | **~785/1000** |

**Rule:** `USE_MOCKS=true` for all development. Only switch to live for integration testing + demo.
