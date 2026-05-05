# Implementation Plan: Mirra — Appearance Health Platform

## Overview

This plan transforms Mirra from a partially-wired prototype into a **demo-ready appearance health platform** for the Perfect Corp × Startup World Cup hackathon (deadline: **May 7, 2026 @ 2:00 PM PDT**).

**Key Technical Stack:**
- Frontend: Next.js 14, TypeScript, Tailwind CSS, PWA
- Backend: FastAPI, Python 3.12, Pydantic
- Voice: Deepgram Voice Agent (Nova-3 STT → GPT-4o-mini Think → Aura-2 TTS)
- AI/AR: Perfect Corp APIs (9 endpoints), Perfect Corp JS Camera Kit
- AI Metadata: Gemini 2.5 Flash (closet photo extraction)
- Shopping: Serper (Google Shopping)
- Database: Supabase (Postgres + Auth + Storage)
- Context: Open-Meteo (weather)

**Three Product Pillars:**
1. **Skin Health** — Analyze → Track → Simulate improvement → Recommend products
2. **Fashion** — Closet inventory → Match to occasion → VTO try-on → Fill gaps via shopping
3. **Proof Card** — Transparent approval receipt before any purchase

**Implementation Strategy:**
1. Build the missing Skin Simulation tool (biggest hackathon impact)
2. Integrate Perfect Corp JS Camera Kit for quality-gated selfies
3. Overhaul the mobile UI/UX for PWA-native experience
4. Update system prompt for health-first behavior
5. Pre-seed demo data and test end-to-end flows
6. Record demo video and submit

**What's Already Built:**
- Voice pipeline (Deepgram ↔ backend ↔ frontend) — fully working
- Camera capture via native `getUserMedia` with portrait crop — working
- Perfect Corp REST client (`perfectcorp.py`) with upload → task → poll lifecycle — working
- 13 voice-callable tools in `tool_executor.py` — all wired
- Skin Analysis, Skin Tone, Face Attributes tools — working
- Clothes, Makeup, Earrings, Necklace, Hair VTO tools — working
- Closet matching engine with gap detection — working
- Serper product search — working
- Proof Card generator + frontend component — working
- Closet browse page with photo upload + AI metadata extraction — working

## Tasks

### 1. Skin Simulation Tool (Backend — New Feature)

The Skin Simulation API is the **hackathon-winning feature**. It takes a selfie + intensity values for 10 skin concerns and returns a composited "after" image showing what the user's skin could look like after treatment. This makes Mirra "Apple Health for appearance" instead of just another try-on app.

**Perfect Corp API contract:**
```
POST /s2s/v2.0/file/skin-simulation       → upload selfie, get file_id
PUT  {upload_url}                           → upload binary
POST /s2s/v2.0/task/skin-simulation        → create task with intensity params
GET  /s2s/v2.0/task/skin-simulation/{id}   → poll → result image URL (24hr)
```

**Intensity params (each 0.0–1.0):** `wrinkle`, `radiance`, `acne`, `pores`, `texture`, `dark_circle`, `redness`, `oiliness`, `eye_bags`, `spots`

- [x] 1.1 Add `SKIN_SIMULATION` to VTOTaskType enum ✅ DONE
  - Open `backend/app/core/constants.py`
  - Add `SKIN_SIMULATION = "skin-simulation"` to the `VTOTaskType` enum (after line 58)
  - This tells `perfectcorp.py` which endpoint path to use

- [x] 1.2 Add `SIMULATE_SKIN` to ToolName enum ✅ DONE
  - Open `backend/app/core/constants.py`
  - Add `SIMULATE_SKIN = "simulate_skin"` to the `ToolName` enum (after line 141, after `ANALYZE_FACE`)
  - This is the name the voice agent will use to call this tool

- [x] 1.3 Create the `simulate_skin` tool function ✅ DONE
  - Create logic in `backend/app/tools/skin_tools.py` (add after the `analyze_face` function)
  - Function signature: `async def simulate_skin(selfie_bytes: bytes, intensities: dict, user_id: str | None = None) -> dict`
  - The function should:
    1. Accept `intensities` dict with keys like `acne`, `wrinkle`, `pores`, etc.
    2. Auto-derive intensities from latest skin analysis if not provided:
       - Fetch latest `skin_scans` record from Supabase for this user
       - Map: if a score is HIGH (bad skin), set intensity HIGH (more improvement to show)
       - Example: `acne_score = 85/100` → `acne_intensity = 0.8` (lots of improvement to show)
       - Example: `moisture_score = 30/100` → `radiance_intensity = 0.7` (dry skin → show radiance boost)
    3. Call `perfectcorp.call_api(VTOTaskType.SKIN_SIMULATION, selfie_bytes, intensities)`
    4. Return `{"simulation_url": result["url"], "intensities_used": intensities}`
  - _Why auto-derive:_ The voice agent says "show me improvement" — it shouldn't need to guess intensity numbers. We compute them from the user's actual skin data.

- [x] 1.4 Register `simulate_skin` in the tool executor ✅ DONE
  - Open `backend/app/services/tool_executor.py`
  - Add a new `case ToolName.SIMULATE_SKIN:` block (after line 30, after ANALYZE_FACE)
  - Route to: `await _require_selfie(selfie_bytes, skin_tools.simulate_skin, intensities=args.get("intensities", {}), user_id=user_id)`
  - Import is already handled since `skin_tools` is imported at line 7

- [x] 1.5 Register `simulate_skin` in voice.py function definitions ✅ DONE
  - Open `backend/app/routers/voice.py`
  - Add a new entry to the `_function_definitions()` list (after line 36, after ANALYZE_FACE):
  ```python
  {
    "name": ToolName.SIMULATE_SKIN,
    "description": "Show before/after skin improvement visualization. Uses the user's latest skin analysis to show what their skin could look like after consistent treatment. Returns an image URL.",
    "parameters": {
      "type": "object",
      "properties": {
        "intensities": {
          "type": "object",
          "description": "Optional intensity overrides (0.0-1.0) for specific concerns: wrinkle, acne, pores, texture, dark_circle, redness, oiliness, eye_bags, spots, radiance. If not provided, auto-derived from latest skin scan."
        }
      }
    }
  }
  ```

- [x] 1.6 Add `skin-simulation` to perfectcorp.py task payload builder ✅ DONE
  - Open `backend/app/services/perfectcorp.py`
  - In the `call_api` function (line 203), add `"skin-simulation"` to the analysis-type check:
    ```python
    if task_type in ["skin-analysis", "skin-tone-analysis", "face-attr-analysis", "skin-simulation"]:
    ```
  - In `_build_analysis_task_payload` (line 95), the skin-simulation params (wrinkle, acne, etc.) will pass through via the `params` dict automatically since the existing `for key, value in params.items()` loop (line 115-117) handles arbitrary params

- [ ] 1.7 Add mock data for skin simulation
  - Open `backend/app/core/mock_interceptor.py`
  - Add a mock response for `"skin-simulation"` that returns a placeholder image URL
  - This prevents burning API units during development

### 2. Checkpoint — Verify Skin Simulation

- [ ] 2.1 Test skin simulation with mock data
  - Start backend: `uvicorn app.main:app --reload --port 8000`
  - Test via voice: say "show me what my skin could look like with treatment"
  - Verify: tool executor routes to `simulate_skin`, mock returns a URL
  - Verify: frontend receives the result via WebSocket `vto_result` message

### 3. Perfect Corp JS Camera Kit Integration

The JS Camera Kit provides **automatic image quality gating** — it validates face position, lighting, and pose before firing the capture event. This prevents bad selfies from burning API units (we only have 1000). It supports dedicated modes for skin analysis, shade finding, earring/necklace VTO, and more.

**Key difference from current `getUserMedia`:**
- Current: we capture any frame, hope it's good enough
- Camera Kit: only fires `faceDetectionCaptured` when the image meets API requirements

**Keep `getUserMedia` for:** Clothes VTO (Camera Kit has no `cloth` mode)
**Use Camera Kit for:** Skin Analysis, Skin Tone, Face Attributes, Skin Simulation, Earrings, Necklace, Makeup

- [x] 3.1 Install the JS Camera Kit SDK ✅ DONE
  - SDK dynamically injected by `useCameraKit` hook (no static script tag)
  - Removed static `<Script>` from `layout.tsx`
  - Add TypeScript type declaration in `frontend/src/types/ymk.d.ts`:
    ```typescript
    interface YMKCaptureResult {
      mode: string;
      images: Array<{ image: string }>;
    }
    declare const YMK: {
      init(args: Record<string, unknown>): void;
      openCameraKit(): void;
      addEventListener(event: string, handler: (result: YMKCaptureResult) => void): void;
    };
    ```

- [x] 3.2 Create `useCameraKit` hook ✅ DONE
  - Created `frontend/src/hooks/useCameraKit.ts` (260 lines)
  - Supports all face detection modes
  - Dynamically injects SDK script

- [ ] 3.3 Create a `CameraKitCapture` component
  - Create `frontend/src/components/layers/CameraKitCapture.tsx`
  - This wraps the Camera Kit UI overlay
  - Props: `mode: FaceDetectionMode`, `onCapture: (base64: string) => void`, `visible: boolean`
  - When `visible` is true, call `YMK.init({ faceDetectionMode: mode })` and `YMK.openCameraKit()`
  - Style the container to sit behind the main camera layer (z-index management)

- [x] 3.4 Wire Camera Kit into the voice tool flow ✅ DONE
  - Implemented in `page.tsx` with tool→mode mapping
  - Skin tools → `skincare`, makeup tools → `makeup`, native capture for clothes/hair

- [ ] 3.5 Fallback: keep existing `getUserMedia` as backup
  - If Camera Kit SDK fails to load (network, CORS, etc.), fall back to existing `useCamera.ts`
  - Add `try/catch` around `YMK.init()` — if it throws, use `getUserMedia` path
  - Log the fallback for debugging: `console.warn("Camera Kit unavailable, using getUserMedia")`

### 4. Checkpoint — Verify Camera Kit

- [ ] 4.1 Test Camera Kit with skin analysis flow
  - Open app on mobile device (or Chrome DevTools mobile mode)
  - Tap VoiceOrb, say "analyze my skin"
  - Verify: Camera Kit opens with `skincare` mode guidance overlay
  - Verify: capture fires only when face quality is met
  - Verify: backend receives selfie and returns skin scores
  - Verify: if Camera Kit SDK is blocked, falls back to `getUserMedia`

### 5. System Prompt Overhaul

The current system prompt (`backend/agent/system-prompt.md`) lists tools that don't exist in the codebase (e.g., `simulate_aging`, `try_on_look`, `transfer_makeup`, `change_hair_color`, `try_on_ring`, `try_on_watch`, `try_on_hat`, `try_on_scarf`, `enhance_photo`, `fix_lighting`). It also doesn't mention the new `simulate_skin` tool or the health-first behavior. This must be fixed or the agent will try to call non-existent tools.

- [x] 5.1 Remove non-existent tools from system prompt ✅ DONE

- [x] 5.2 Add `simulate_skin` tool to system prompt ✅ DONE

- [x] 5.3 Update behavior sequence for health-first ✅ DONE
  - Skin flow updated: analyze → compare → offer simulation → recommend products

- [ ] 5.4 Add the available tools list that matches actual code
  - Rewrite the tools section to only list the 14 tools that exist in `tool_executor.py` + `voice.py`:
    ```
    ### Available Tools (14 total)
    SKIN:     analyze_skin, analyze_skin_tone, analyze_face, simulate_skin
    FASHION:  try_on_clothes, match_closet
    BEAUTY:   try_on_makeup, change_hairstyle
    ACCESS:   try_on_earrings, try_on_necklace
    CONTEXT:  check_weather, check_calendar
    SHOP:     search_products, generate_proof_card
    ```

### 6. Checkpoint — Verify System Prompt

- [ ] 6.1 Test that agent never calls non-existent tools
  - Start voice session
  - Say "enhance my photo" → agent should say it can't do that (no `enhance_photo` tool)
  - Say "analyze my skin" → agent calls `analyze_skin` correctly
  - Say "show me improvement" → agent calls `simulate_skin`
  - Verify no `FunctionCallRequest` for removed tools

### 7. Mobile UI/UX Overhaul

The app must feel like a **native mobile PWA** — not a desktop site forced into mobile. This section covers responsive layout, navigation, button placement, scrolling behavior, and z-index management. The main page is a full-screen camera mirror with overlays; secondary pages (closet, skin-history) use standard scroll layouts.

**Current component inventory (verified):**
- `frontend/src/app/page.tsx` — Main camera + voice page
- `frontend/src/components/layers/CameraLayer.tsx` — Camera video feed
- `frontend/src/components/layers/AgentOverlay.tsx` — Conversation messages + cards
- `frontend/src/components/ui/VoiceOrb.tsx` — Voice control button
- `frontend/src/components/modals/SkinAnalysisModal.tsx` — Skin scores display
- `frontend/src/components/cards/ProofCard.tsx` — Purchase approval card
- `frontend/src/components/navigation/` — Navigation components

**Design targets:**
- Mobile-first (375px → 428px primary breakpoint)
- Safe area insets for notch/home indicator
- 44px minimum touch targets (Apple HIG)
- Smooth 60fps scroll with overscroll bounce

- [x] 7.1 Implement mobile-first layout system
  - Open `frontend/src/app/globals.css`
  - Add CSS custom properties for safe areas:
    ```css
    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --safe-left: env(safe-area-inset-left, 0px);
      --safe-right: env(safe-area-inset-right, 0px);
      --orb-size: 64px;
      --orb-bottom: calc(24px + var(--safe-bottom));
      --nav-height: 56px;
    }
    ```
  - Set `html, body` to `overflow: hidden; height: 100dvh;` for the main camera page
  - Use `100dvh` (dynamic viewport height) instead of `100vh` to handle mobile browser chrome

- [x] 7.2 Fix z-index stacking order
  - Define a clear z-index scale in `globals.css`:
    ```css
    /* Z-index scale — never use arbitrary values */
    --z-camera: 0;        /* CameraLayer — base */
    --z-vto-overlay: 10;  /* VTO result images on camera */
    --z-agent: 20;        /* AgentOverlay — conversation */
    --z-cards: 30;        /* ProofCard, ProductCard */
    --z-nav: 40;          /* StatusBar, BottomNav */
    --z-orb: 50;          /* VoiceOrb — always on top */
    --z-modal: 60;        /* SkinAnalysisModal, modals */
    --z-toast: 70;        /* Toast notifications — topmost */
    ```
  - Update all components to use these variables instead of hardcoded z-index values

- [x] 7.3 Fix VoiceOrb placement and touch target
  - Open `frontend/src/components/ui/VoiceOrb.tsx`
  - Position: `fixed`, `bottom: var(--orb-bottom)`, `left: 50%`, `transform: translateX(-50%)`
  - Size: 64px diameter (min 44px touch target met)
  - Add `padding: 10px` invisible touch area around the orb
  - Ensure it doesn't overlap with `AgentOverlay` scroll content by adding `padding-bottom: calc(var(--orb-size) + var(--orb-bottom) + 16px)` to the overlay

- [x] 7.4 Fix AgentOverlay scrolling behavior
  - Open `frontend/src/components/layers/AgentOverlay.tsx`
  - Set container to `overflow-y: auto; -webkit-overflow-scrolling: touch;`
  - Pin scroll to bottom on new messages (auto-scroll)
  - Add padding-bottom to clear the VoiceOrb: `padding-bottom: calc(var(--orb-size) + 40px + var(--safe-bottom))`
  - Messages should scroll UP from bottom (latest at bottom, like iMessage)
  - Add gradient fade at top of overlay so camera shows through

- [x] 7.5 Create responsive bottom navigation
  - Create `frontend/src/components/navigation/BottomNav.tsx`
  - 4 tabs: Home (camera), Closet, Skin History, Profile
  - Height: `var(--nav-height)` + `var(--safe-bottom)` padding
  - Active tab indicator with micro-animation
  - Only show on secondary pages (closet, skin-history, profile) — NOT on the main camera page
  - On the main camera page, navigation is handled by the VoiceOrb and FeatureMenu

- [x] 7.6 Fix CameraLayer for full-bleed mobile
  - Open `frontend/src/components/layers/CameraLayer.tsx`
  - Video should fill `100dvw × 100dvh` with `object-fit: cover`
  - Apply mirror transform: `transform: scaleX(-1)` for selfie mode
  - VTO result images should overlay with `position: absolute; top: 0; left: 0;` matching the video dimensions
  - Add smooth crossfade transition (300ms) when VTO image appears/disappears

- [x] 7.7 Make closet page responsive
  - Open `frontend/src/app/closet/page.tsx`
  - Grid: 2 columns on mobile (< 640px), 3 on tablet (640-1024px), 4 on desktop (> 1024px)
  - Item cards: square aspect ratio with `aspect-ratio: 3/4`
  - FAB (add item button): fixed bottom-right, above bottom nav, 56px diameter
  - Pull-to-refresh gesture support (optional but nice)
  - Include bottom nav on this page

- [x] 7.8 Make skin-history page responsive
  - Open `frontend/src/app/skin-history/page.tsx`
  - Score cards: horizontal scroll on mobile (snap scroll)
  - Trend chart: full-width, 200px height on mobile
  - Include bottom nav on this page

- [ ] 7.9 Add PWA manifest and meta tags
  - Update `frontend/src/app/layout.tsx`:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#0a0a0a" />
    <link rel="manifest" href="/manifest.json" />
    ```
  - Create `frontend/public/manifest.json` with app name "Mirra", display "standalone", dark theme

### 8. Skin Simulation Frontend (Before/After Component)

When `simulate_skin` returns an image URL, the frontend needs to show a compelling **before/after comparison** on the user's actual face. This is the visual "wow moment" for the hackathon demo.

- [ ] 8.1 Create SkinSimulationCard component
  - Create `frontend/src/components/cards/SkinSimulationCard.tsx`
  - Props: `originalImageUrl: string`, `simulatedImageUrl: string`, `intensities: Record<string, number>`
  - Layout: side-by-side on desktop, stacked with swipe on mobile
  - Labels: "Now" (left) and "With Treatment" (right)
  - Show which concerns were improved (from intensities object)
  - Add a slider interaction: user can drag a divider left/right to reveal before/after
  - CSS: use `clip-path` for the slider reveal effect
  - Add subtle pulse animation when card first appears

- [ ] 8.2 Wire SkinSimulationCard into AgentOverlay — **see §18.1 below for detailed steps**

- [x] 8.3 Store the current selfie for before/after reference ✅ DONE
  - `useVoiceAgent.ts` now exposes `lastSelfieUrl` state
  - `page.tsx` passes `originalSelfieUrl={voice.lastSelfieUrl}` to `AgentOverlay`

### 9. Checkpoint — Verify Skin Simulation Frontend

- [ ] 9.1 Test full skin simulation flow
  - Say "analyze my skin" → scores appear in SkinAnalysisModal
  - Say "show me improvement" → SkinSimulationCard appears with before/after
  - Verify slider interaction works on mobile (touch drag)
  - Verify auto-scroll positions the card in view

### 10. Pre-Seed Demo Data

The closet is empty. The demo requires 15+ items with real images to show the "owned-first" matching flow.

- [ ] 10.1 Create seed script for closet items
  - Create `backend/scripts/seed_closet.py`
  - Script should insert 15 items into Supabase `closet_items` table
  - Each item needs: `name`, `category`, `subcategory`, `primary_color`, `color_hex`, `brand`, `image_url`, `occasions[]`, `seasons[]`, `formality` (0.0-1.0)
  - Categories to cover (for demo diversity):
    - Tops: Navy blazer, white button-down, black turtleneck, gray cashmere sweater
    - Bottoms: charcoal trousers, dark jeans, khaki chinos
    - Dresses: black cocktail dress, floral midi dress
    - Shoes: black leather oxford, white sneakers, Sam Edelman heels
    - Accessories: gold watch, leather belt, silk scarf
  - Image URLs: use publicly accessible product images (Unsplash, product CDNs)
  - Run with: `python -m scripts.seed_closet` from `backend/` directory

- [ ] 10.2 Create seed script for demo skin scan history
  - Create `backend/scripts/seed_skin_history.py`
  - Insert 4-5 `skin_scans` records spanning the last 30 days
  - Scores should show a realistic trend: moisture gradually decreasing, acne slightly improving
  - This enables the agent to say "your moisture dropped 12% this month"

- [ ] 10.3 Create seed script for calendar events
  - Create `backend/scripts/seed_calendar.py` (or update `services/calendar.py` hardcoded events)
  - Add 2 demo events for today:
    - "Board Meeting — 10:00 AM" (formal)
    - "Dinner with Alex — 7:30 PM" (romantic/date)
  - These events drive the demo script's two outfit flows

### 11. Checkpoint — Verify Demo Data

- [ ] 11.1 Verify closet items display
  - Navigate to `/closet` page
  - Confirm 15 items load with images, categories, and metadata
  - Test filter by category, color, and occasion
  - Verify matching engine returns results when asked "what should I wear?"

- [ ] 11.2 Verify skin history displays
  - Navigate to `/skin-history` page
  - Confirm trend data renders (4-5 data points over 30 days)
  - Verify agent can reference trends: "your moisture dropped this month"

### 12. End-to-End Integration Tests

These are manual test flows to verify the full pipeline before recording the demo.

- [ ] 12.1 Test Flow A: Skin Health (30 seconds of demo)
  1. Open app → camera activates
  2. Tap VoiceOrb → "How's my skin?"
  3. Verify: `analyze_skin` fires → SkinAnalysisModal shows 14 scores
  4. Verify: agent mentions trend vs last scan
  5. Say "show me improvement" → `simulate_skin` fires
  6. Verify: SkinSimulationCard shows before/after comparison
  7. Agent recommends a product → `search_products` fires
  8. Verify: ProductCard renders with real price
  9. Agent generates proof card → Proof Card renders with skincare item

- [ ] 12.2 Test Flow B: Board Meeting (25 seconds of demo)
  1. Say "I have a board meeting at 10"
  2. Verify: `check_calendar` + `check_weather` fire
  3. Verify: `match_closet` fires → returns navy blazer, white shirt
  4. Verify: `try_on_clothes` fires → VTO image overlays on camera
  5. Agent says "Everything from your closet. Cost: $0."

- [ ] 12.3 Test Flow C: Date Night + Proof Card (25 seconds of demo)
  1. Say "And I have a date tonight"
  2. Verify: `match_closet` → identifies gap (no romantic dress)
  3. Verify: `search_products` → finds dress options
  4. Verify: `try_on_clothes` → renders dress on user
  5. Verify: `try_on_earrings` → adds earrings
  6. Verify: `generate_proof_card` → ProofCard renders with:
     - Owned items ($0): blazer/shoes from closet
     - New items: dress ($98) + earrings ($29)
     - Match scores: tone_match, style_fit

### 13. Demo Preparation

- [ ] 13.1 Write final demo script
  - Create `docs/DEMO_SCRIPT.md`
  - Exact words to say at each timestamp (0:00 to 1:30)
  - Include backup phrases in case agent responds differently
  - Note which Perfect Corp APIs fire at each moment (for judges)

- [ ] 13.2 Deploy for demo recording
  - Frontend: `vercel deploy --prod` (from `frontend/`)
  - Backend: deploy to Render or Railway with all env vars
  - Test deployed URLs end-to-end before recording
  - Switch mock interceptor OFF for live API calls

- [ ] 13.3 Record demo video
  - Use screen recording on mobile device (iOS: Control Center recorder)
  - Record 3-4 takes, pick the best
  - Budget: ~150 API units for recording takes (out of 1000 total)
  - Target: 90 seconds, covering all 3 flows (skin → board meeting → date night)

- [ ] 13.4 Submit on Devpost
  - Project page: title, description, screenshots
  - Upload demo video (1-3 minutes)
  - List all Perfect Corp APIs used (9 total)
  - List team members
  - Deadline: **May 7, 2026 @ 2:00 PM PDT**

---

## Critical Path Timeline

### Day 1 — May 5 (Build)
| Time | Task | Section | Est. |
|------|------|---------|------|
| Morning | Implement `simulate_skin` backend tool | §1 (1.1-1.7) | 2hr |
| Morning | Fix system prompt (remove ghost tools, add simulate_skin) | §5 (5.1-5.4) | 1hr |
| Afternoon | Build SkinSimulationCard frontend component | §8 (8.1-8.3) | 2hr |
| Afternoon | Mobile UI fixes (z-index, VoiceOrb, scroll) | §7 (7.1-7.4) | 2hr |
| Evening | Pre-seed demo data (closet + skin history + calendar) | §10 (10.1-10.3) | 2hr |

### Day 2 — May 6 (Integrate + Test)
| Time | Task | Section | Est. |
|------|------|---------|------|
| Morning | Camera Kit integration (if SDK available) | §3 (3.1-3.5) | 3hr |
| Morning | Remaining UI fixes (bottom nav, responsive) | §7 (7.5-7.9) | 2hr |
| Afternoon | End-to-end testing of all 3 demo flows | §12 (12.1-12.3) | 3hr |
| Evening | Deploy and rehearse demo script | §13 (13.1-13.2) | 2hr |

### Day 3 — May 7 (Record + Submit)
| Time | Task | Section | Est. |
|------|------|---------|------|
| Morning | Record demo video (3-4 takes) | §13 (13.3) | 2hr |
| Morning | Write Devpost project page | §13 (13.4) | 1hr |
| 12:00 PM | Final submission review | — | 30min |
| **2:00 PM** | **DEADLINE** | — | — |

---

## Key Files Quick Reference

| What | Path |
|------|------|
| **Backend** | |
| Voice pipeline | `backend/app/routers/voice.py` |
| Tool router | `backend/app/services/tool_executor.py` |
| Perfect Corp client | `backend/app/services/perfectcorp.py` |
| Skin tools | `backend/app/tools/skin_tools.py` |
| Fashion tools | `backend/app/tools/fashion_tools.py` |
| Beauty tools | `backend/app/tools/beauty_tools.py` |
| Accessory tools | `backend/app/tools/accessory_tools.py` |
| Hair tools | `backend/app/tools/hair_tools.py` |
| Constants/Enums | `backend/app/core/constants.py` |
| LLM config | `backend/app/core/llm_config.py` |
| System prompt | `backend/agent/system-prompt.md` |
| Mock interceptor | `backend/app/core/mock_interceptor.py` |
| Matching engine | `backend/app/services/matching_engine.py` |
| Proof card generator | `backend/app/services/proof_card_generator.py` |
| Serper (shopping) | `backend/app/services/serper.py` |
| **Frontend** | |
| Main page | `frontend/src/app/page.tsx` |
| Closet page | `frontend/src/app/closet/page.tsx` |
| Skin history page | `frontend/src/app/skin-history/page.tsx` |
| Voice hook | `frontend/src/hooks/useVoiceAgent.ts` |
| Camera hook | `frontend/src/hooks/useCamera.ts` |
| CameraLayer | `frontend/src/components/layers/CameraLayer.tsx` |
| AgentOverlay | `frontend/src/components/layers/AgentOverlay.tsx` |
| VoiceOrb | `frontend/src/components/ui/VoiceOrb.tsx` |
| SkinAnalysisModal | `frontend/src/components/modals/SkinAnalysisModal.tsx` |
| ProofCard | `frontend/src/components/cards/ProofCard.tsx` |
| Global styles | `frontend/src/app/globals.css` |
| Layout | `frontend/src/app/layout.tsx` |

| Skin suggestions | `backend/app/services/skin_suggestions.py` (NEW §17) |
| Camera Kit hook | `frontend/src/hooks/useCameraKit.ts` |
| VTODisplay | `frontend/src/components/vto/VTODisplay.tsx` |
| SkinSimulationCard | `frontend/src/components/cards/SkinSimulationCard.tsx` |
| SkinAnalysisCard | `frontend/src/components/cards/SkinAnalysisCard.tsx` |
| ItemCardRow | `frontend/src/components/cards/ItemCardRow.tsx` |

## Progress Summary

| Section | Status |
|---------|--------|
| §1 Skin Simulation Backend | ✅ 6/7 done (1.7 mock remaining) |
| §3 Camera Kit | ✅ 3/5 done (3.3 component, 3.5 fallback remaining) |
| §5 System Prompt | ✅ 3/4 done (5.4 tools list remaining) |
| §7 Mobile UI/UX | 🔲 Not started |
| §8 Simulation Frontend | ⬜ 1/3 done (8.1 card exists, 8.2 wiring needed) |
| §10 Demo Data | 🔲 Not started |
| §14 Skin Product Recs | 🔲 NEW — Not started |
| §15 Product → VTO Flow | 🔲 NEW — Not started |
| §16 Skin Journey | 🔲 NEW — Not started |
| §17 Skin Suggestions | 🔲 NEW — Not started |
| §18 Frontend Viz Gaps | 🔲 NEW — Not started |
| §19 Voice Product Flows | 🔲 NEW — Not started |
| §20 Mock Data | 🔲 NEW — Not started |

## Notes

- **Priority order for remaining work:** §18 (wire existing components) → §14 (skincare recs) → §17 (suggestions) → §15 (product→VTO) → §16 (skin journey) → §20 (mocks) → §7 (UI polish)
- Camera Kit integration (§3) is **optional** — `getUserMedia` works fine as fallback.
- API budget: 1000 units total. Mock during dev. Switch to live for final testing (§12) and recording (§13).
- §14-§20 are the **new sections** covering skincare recommendations, product→VTO flows, skin journey persistence, suggestions engine, and frontend visualization gaps.
- All code should follow existing patterns — look at how `analyze_skin` is wired end-to-end.

### 14. Skin Product Recommendations (Serper → Skincare)

The agent already has `search_products` wired to Serper Google Shopping. But it currently only searches for fashion. We need the agent to **automatically recommend skincare products based on the user's worst skin scores**, and show them in a tappable product card that links to purchase.

**Current state:** `serper.py` works. `search_products` tool exists. But the agent doesn't know HOW to form good skincare queries from skin data.

- [ ] 14.1 Add skincare query builder to `skin_tools.py`
  - Create helper: `def build_skincare_queries(scores: dict) -> list[str]`
  - Logic: find the 2-3 worst scores (lowest `ui_score`), map each to a product query:
    - `moisture < 50` → `"hyaluronic acid hydrating serum"`
    - `acne > 70` (bad) → `"salicylic acid acne treatment"`
    - `wrinkle > 60` → `"retinol anti-aging cream"`
    - `pore > 65` → `"niacinamide pore minimizer"`
    - `dark_circle > 60` → `"vitamin C eye cream dark circles"`
    - `redness > 60` → `"centella asiatica calming moisturizer"`
    - `oiliness > 70` → `"oil-free mattifying moisturizer"`
    - `texture > 60` → `"AHA BHA chemical exfoliant"`
    - `radiance < 50` → `"vitamin C brightening serum"`
  - Return top 3 queries sorted by severity

- [ ] 14.2 Create `RECOMMEND_SKIN_PRODUCTS` tool (optional shortcut)
  - Add to `ToolName` enum: `RECOMMEND_SKIN_PRODUCTS = "recommend_skin_products"`
  - In `tool_executor.py`: fetch latest skin scan → call `build_skincare_queries` → run `serper.search()` for each → merge results
  - OR: skip this and just teach the agent in the system prompt to chain `analyze_skin` → `search_products` with good queries. The second approach is simpler and avoids a new tool.

- [ ] 14.3 Update system prompt with skincare recommendation behavior
  - In `backend/agent/system-prompt.md`, add under "When User Asks About Skin":
    ```
    6. For each top concern, search for targeted products:
       - Low moisture → search_products("hyaluronic acid serum")
       - High acne → search_products("salicylic acid treatment")
       - High wrinkle → search_products("retinol cream")
    7. Present products with: name, price, image, and WHY it helps their specific concern
    8. Offer: "Want to try this look?" → if applicable, try_on_makeup with the product
    ```

- [ ] 14.4 Add skincare product mock data
  - Create `backend/mocks/skincare-products.json` with 5 realistic skincare products
  - Each: `title`, `price`, `source`, `link`, `imageUrl`, `rating`
  - Used when `USE_MOCKS=true` and query contains skincare keywords

### 15. Product Card → VTO Flow (Try-On from Recommendations)

When the agent shows product results (fashion or skincare), the user should be able to **tap a product card to trigger VTO try-on**. Currently `ItemCardRow` renders product cards but they're not tappable.

**The flow:** User sees product → taps card → agent calls `try_on_clothes` / `try_on_makeup` with that product's image URL → VTO result renders on camera.

- [ ] 15.1 Make `ItemCardRow` cards tappable
  - Open `frontend/src/components/cards/ItemCardRow.tsx`
  - Add `onClick` handler to each card div
  - On tap: send a WebSocket message to trigger VTO:
    ```typescript
    // Send message via global __mirraWS
    const ws = (globalThis as any).__mirraWS;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "user_action",
        action: "try_on",
        item: { url: item.imageUrl, category: item.category, name: item.name }
      }));
    }
    ```
  - Add visual affordance: subtle "Try On" overlay on hover/tap

- [ ] 15.2 Handle `user_action` messages in `voice.py`
  - In the `_handle_client_message` function, add a new case:
    ```python
    case "user_action":
        if data.get("action") == "try_on":
            item = data["item"]
            # Inject a function call as if the agent requested it
            await _handle_function_call(session, ws, dg_ws, {
                "function_name": "try_on_clothes",
                "input": {"garment_url": item["url"], "garment_category": item.get("category", "upper")}
            })
    ```
  - This bypasses the voice agent — direct user tap → VTO execution

- [ ] 15.3 Add category-aware VTO routing for product taps
  - When user taps a product, determine which VTO tool to use:
    - Fashion items (dress, top, pants) → `try_on_clothes`
    - Makeup products → `try_on_makeup`
    - Earrings → `try_on_earrings`
    - Necklaces → `try_on_necklace`
  - Use product category or keywords from title to auto-detect
  - Skincare products should NOT trigger VTO — instead show a "Simulate improvement" CTA

### 16. Skin Journey — Persistence & Timeline

The skin history page (`/skin-history`) already reads from `skin_scans` table and shows trend charts. But it's missing:
1. **Simulation results** aren't persisted (URL expires in 2 hours)
2. **No "skin journey" narrative** — just raw scores
3. **No recommendations** tied to scan results
4. **No comparison view** — can't compare two scans side-by-side

- [ ] 16.1 Persist simulation images to Supabase Storage
  - In `skin_tools.simulate_skin()`, after getting the result URL:
    1. Download the image via `httpx.get(simulation_url)`
    2. Upload to Supabase Storage bucket `skin-simulations/{user_id}/{timestamp}.jpg`
    3. Get public URL from Supabase
    4. Store in `skin_simulations` table: `user_id`, `original_selfie_url`, `simulated_url`, `intensities`, `created_at`
  - This preserves the before/after even after the 2-hour API URL expires

- [ ] 16.2 Create `skin_simulations` table in Supabase
  - Schema:
    ```sql
    CREATE TABLE skin_simulations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id),
      original_selfie_url TEXT,
      simulated_url TEXT NOT NULL,
      intensities JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ```

- [ ] 16.3 Add simulation history to `/skin-history` page
  - Below each scan card, show a "Simulations" section if any exist for that time period
  - Render a mini before/after thumbnail (40px × 40px each)
  - Tap to expand to full `SkinSimulationCard` with slider

- [ ] 16.4 Add "Skin Journey Narrative" to skin-history page
  - At the top of the page, generate a human-readable summary:
    - "Your moisture improved 12% over the last 3 weeks"
    - "Acne scores have been stable — your routine is working"
    - "Redness spiked on April 28 (high humidity day)"
  - Compute from `skin_scans` data client-side
  - Show as a glassmorphic card with insights

- [ ] 16.5 Add scan comparison view
  - On the skin-history page, add "Compare" button
  - User selects two scans → side-by-side score comparison
  - Show delta for each metric with color coding (green = improved, red = worse)
  - Include selfie thumbnails if available

### 17. Skin Suggestions Engine

After analyzing skin, the agent should proactively suggest actionable improvements — not just show numbers. This is the "health advisor" part that makes Mirra different.

- [ ] 17.1 Create `skin_suggestions.py` module
  - Create `backend/app/services/skin_suggestions.py`
  - Function: `def generate_suggestions(scores: dict, weather: dict | None = None) -> list[dict]`
  - Each suggestion: `{ "concern": str, "score": int, "severity": str, "tip": str, "product_query": str }`
  - Logic per concern:
    - `moisture < 40`: severity="high", tip="Your skin is very dehydrated. Apply hyaluronic acid serum morning and night.", product_query="hyaluronic acid serum"
    - `acne > 75`: severity="high", tip="Active breakouts detected. Use a gentle salicylic acid cleanser.", product_query="salicylic acid cleanser"
    - `wrinkle > 65`: severity="medium", tip="Early fine lines visible. Start retinol 2-3 nights per week.", product_query="retinol serum"
    - etc. for all 10+ concerns
  - Factor in weather: high humidity → reduce heavy moisturizer suggestion, low humidity → increase hydration
  - Return top 5 most actionable suggestions, sorted by severity

- [ ] 17.2 Wire suggestions into `analyze_skin` tool response
  - In `skin_tools.analyze_skin()`, after getting scores:
    1. Call `generate_suggestions(scores, weather)` (weather from latest context if available)
    2. Add `"suggestions"` key to the returned dict
  - The agent then has structured suggestions to read back to the user

- [ ] 17.3 Create `SkinSuggestionsCard` frontend component
  - Create `frontend/src/components/cards/SkinSuggestionsCard.tsx`
  - Props: `suggestions: Array<{ concern, score, severity, tip, product_query }>`
  - Design: glassmorphic card with accordion-style items
  - Each suggestion shows: concern icon, score bar, tip text
  - "Shop treatment" button per suggestion → triggers `search_products(product_query)`
  - Color-coded severity: red (high), amber (medium), green (low)

- [ ] 17.4 Render `SkinSuggestionsCard` in AgentOverlay
  - In `AgentOverlay.tsx`, when a `tool_result` for `analyze_skin` arrives that contains `suggestions`:
    - Render `<SkinSuggestionsCard>` after the scores
  - The suggestions card should appear below the `SkinAnalysisCard`

### 18. Frontend Visualization Gaps

These are UI components and behaviors that are missing or broken in the current frontend.

- [ ] 18.1 Wire `SkinSimulationCard` into `AgentOverlay`
  - `SkinSimulationCard.tsx` EXISTS (verified) but is NOT rendered anywhere
  - In `AgentOverlay.tsx`, add:
    ```tsx
    const skinSimResults = messages.filter(
      (m) => m.type === "tool_result" && (m as any).tool === ToolName.SIMULATE_SKIN
    );
    const latestSkinSim = skinSimResults.at(-1) ?? null;
    ```
  - Render it in the JSX after proof card block:
    ```tsx
    {latestSkinSim && (
      <SkinSimulationCard
        originalUrl={originalSelfieUrl ?? ""}
        simulatedUrl={(latestSkinSim as any).data?.simulation_url}
        intensities={(latestSkinSim as any).data?.intensities_used ?? {}}
      />
    )}
    ```

- [ ] 18.2 Fix `SkinAnalysisCard` to show in overlay
  - `SkinAnalysisCard.tsx` EXISTS but verify it renders when `analyze_skin` completes
  - The `analyze_skin` result arrives as `{ type: "vto_result", tool: "analyze_skin", status: "complete", scores: {...} }`
  - Check that `AgentOverlay` handles `scores` in the `tool_result` message

- [ ] 18.3 Create `ProductRecommendationCard` component
  - Create `frontend/src/components/cards/ProductRecommendationCard.tsx`
  - Different from `ItemCardRow`: this is a detailed card for a SINGLE product recommendation
  - Shows: large product image, name, price, rating stars, "Why this helps" reason text, "Try On" / "Buy" buttons
  - For skincare: "Try On" button is replaced with "Simulate Improvement" → triggers `simulate_skin`
  - For fashion: "Try On" button → triggers `try_on_clothes` with the product image URL

- [ ] 18.4 Add "Simulate Improvement" CTA after skin analysis
  - After `SkinAnalysisCard` renders, show a floating CTA button: "See your skin with treatment →"
  - On tap: send voice command equivalent — trigger `simulate_skin` via WebSocket
  - This is the key conversion point: analysis → simulation → product recommendation

- [ ] 18.5 Add loading states for chained tool calls
  - When the agent chains: `analyze_skin` → `simulate_skin` → `search_products`
  - Show a progress stepper in the overlay:
    - Step 1: "Scanning skin…" ✓
    - Step 2: "Simulating improvement…" (in progress)
    - Step 3: "Finding products…" (pending)
  - Use existing `LOADING_TEXT` map + `currentTool` state

- [ ] 18.6 Handle VTO result display for simulation
  - Currently `CameraLayer` shows VTO results for clothes/makeup
  - Skin simulation result should NOT replace the camera feed
  - Instead, it should appear as a `SkinSimulationCard` in the `AgentOverlay` (task 18.1)
  - Verify that the `shouldFreeze` logic in `CameraLayer.tsx` does NOT freeze for `simulate_skin`

### 19. Voice-Initiated Product Flows

The voice agent needs clear behavior patterns for recommending and purchasing products. Currently the agent can search but doesn't have a structured "recommend → try on → buy" pipeline.

- [ ] 19.1 Update system prompt with product recommendation flow
  - Add to `backend/agent/system-prompt.md`:
    ```markdown
    ### Product Recommendation Flow
    1. When recommending products, always explain WHY (link to user's skin/style data)
    2. For fashion: search_products → show results → ask "Want to try it on?" → try_on_clothes
    3. For skincare: search_products → show results → explain benefit → offer simulate_skin
    4. Always generate proof_card before suggesting purchase
    5. Never push products — only recommend when user asks or after analysis reveals need
    ```

- [ ] 19.2 Add "owned-first" enforcement to product recommendations
  - The system prompt already has "owned-first" for fashion (check closet before shopping)
  - Extend to skincare: check if user's previous purchases (from `proof_cards` table) include similar products
  - If user already bought a retinol serum last week, don't recommend another one

- [ ] 19.3 Add product category detection to `serper.py`
  - Current `serper.search()` returns raw products with no category
  - Add `category` field to each product result:
    - Parse from title keywords: "serum", "cream", "dress", "earring", etc.
    - Map to VTO tool: `skincare`, `upper`, `lower`, `full`, `earring`, `necklace`, `makeup`
  - This enables task 15.3 (category-aware VTO routing)

### 20. Mock Data for New Flows

- [ ] 20.1 Create `skin-simulation.json` mock
  - Path: `backend/mocks/skin-simulation.json`
  - Content: `{ "task_status": "success", "result": { "url": "https://placehold.co/600x800/1a1a2e/e0e0e0?text=Skin+Simulation" } }`

- [ ] 20.2 Verify existing mocks cover all tools
  - Check each tool has a corresponding mock in `backend/mocks/`
  - Missing mocks will cause `mock_interceptor.py` to fall through to live API (burns units)
  - Tools needing mocks: `skin-analysis` ✅, `skin-simulation` (20.1), `face-attr-analysis`, `skin-tone-analysis`, `cloth-v3`, `2d-vto/earring`, `2d-vto/necklace`, `hairstyle-transfer`
