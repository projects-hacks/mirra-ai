# Implementation Plan: Mirra — Appearance Health Platform

## Overview

This plan transforms Mirra from a partially-wired prototype into a **demo-ready appearance health platform** for the Perfect Corp × Startup World Cup hackathon (deadline: **May 7, 2026 @ 2:00 PM PDT**).

**Key Technical Stack:**
- Frontend: Next.js 14, TypeScript, Tailwind CSS, PWA
- Backend: FastAPI, Python 3.12, Pydantic
- Voice: Deepgram Voice Agent (Nova-3 STT → GPT-5-mini Think → Aura-2 TTS)
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

- [ ] 1.1 Add `SKIN_SIMULATION` to VTOTaskType enum
  - Open `backend/app/core/constants.py`
  - Add `SKIN_SIMULATION = "skin-simulation"` to the `VTOTaskType` enum (after line 58)
  - This tells `perfectcorp.py` which endpoint path to use

- [ ] 1.2 Add `SIMULATE_SKIN` to ToolName enum
  - Open `backend/app/core/constants.py`
  - Add `SIMULATE_SKIN = "simulate_skin"` to the `ToolName` enum (after line 141, after `ANALYZE_FACE`)
  - This is the name the voice agent will use to call this tool

- [ ] 1.3 Create the `simulate_skin` tool function
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

- [ ] 1.4 Register `simulate_skin` in the tool executor
  - Open `backend/app/services/tool_executor.py`
  - Add a new `case ToolName.SIMULATE_SKIN:` block (after line 30, after ANALYZE_FACE)
  - Route to: `await _require_selfie(selfie_bytes, skin_tools.simulate_skin, intensities=args.get("intensities", {}), user_id=user_id)`
  - Import is already handled since `skin_tools` is imported at line 7

- [ ] 1.5 Register `simulate_skin` in voice.py function definitions
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

- [ ] 1.6 Add `skin-simulation` to perfectcorp.py task payload builder
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

- [ ] 3.1 Install the JS Camera Kit SDK
  - Add the Perfect Corp JS SDK script tag to `frontend/src/app/layout.tsx`
  - Place it inside `<head>` with `async` loading
  - The SDK URL should come from Perfect Corp developer portal (hackathon credentials)
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

- [ ] 3.2 Create `useCameraKit` hook
  - Create `frontend/src/hooks/useCameraKit.ts`
  - Implement `useCameraKit()` hook that:
    1. Registers `window.ymkAsyncInit` on mount
    2. Listens for `faceDetectionCaptured` event
    3. Exposes `capture(mode: FaceDetectionMode)` method
    4. Returns `{ capture, lastImage, isReady, error }`
  - Supported modes enum: `'skincare' | 'hdskincare' | 'shadefinder' | 'facereshape' | 'earring' | 'necklace' | 'makeup'`
  - On capture, convert base64 image and send to backend via existing WebSocket `{ type: "selfie", data: base64 }`

- [ ] 3.3 Create a `CameraKitCapture` component
  - Create `frontend/src/components/layers/CameraKitCapture.tsx`
  - This wraps the Camera Kit UI overlay
  - Props: `mode: FaceDetectionMode`, `onCapture: (base64: string) => void`, `visible: boolean`
  - When `visible` is true, call `YMK.init({ faceDetectionMode: mode })` and `YMK.openCameraKit()`
  - Style the container to sit behind the main camera layer (z-index management)

- [ ] 3.4 Wire Camera Kit into the voice tool flow
  - Open `frontend/src/hooks/useVoiceAgent.ts`
  - When backend sends `{ type: "vto_result", tool: "analyze_skin", status: "running" }`:
    1. Trigger Camera Kit capture in `skincare` mode
    2. Wait for `faceDetectionCaptured`
    3. Send quality-gated selfie to backend
  - Map tool names to Camera Kit modes:
    - `analyze_skin` → `"skincare"`
    - `analyze_skin_tone` → `"shadefinder"`
    - `analyze_face` → `"facereshape"`
    - `simulate_skin` → `"skincare"`
    - `try_on_earrings` → `"earring"`
    - `try_on_necklace` → `"necklace"`
    - `try_on_makeup` → `"makeup"`
  - For tools NOT in this map (`try_on_clothes`, `change_hairstyle`): keep using existing `getUserMedia` capture

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

- [ ] 5.1 Remove non-existent tools from system prompt
  - Open `backend/agent/system-prompt.md`
  - Remove these tools that are NOT in `tool_executor.py`:
    - `simulate_aging` (not implemented)
    - `try_on_look` (not implemented)
    - `transfer_makeup` (not implemented)
    - `try_on_scarf` (not implemented)
    - `try_on_hat` (not implemented)
    - `try_on_ring` (not implemented)
    - `try_on_watch` (not implemented)
    - `change_hair_color` (not implemented)
    - `add_waves` (not implemented)
    - `enhance_photo` (not implemented)
    - `fix_lighting` (not implemented)

- [ ] 5.2 Add `simulate_skin` tool to system prompt
  - Add under "Skin Intelligence" section:
    ```
    - `simulate_skin(selfie, intensities)` → before/after improvement image.
      Shows what the user's skin could look like with consistent treatment.
      Auto-derives intensities from their latest skin scan if not provided.
    ```

- [ ] 5.3 Update behavior sequence for health-first
  - Change "On First Open" to emphasize skin health:
    ```
    ### On First Open
    1. Silently scan: `analyze_skin` + `analyze_skin_tone`
    2. Greet with a skin insight: "Your moisture's at 52 — a bit dry today."
    3. Offer: "Want to see what your skin could look like with better hydration?"
    4. If yes: call `simulate_skin` → show before/after
    ```
  - Add new section "When User Asks About Skin":
    ```
    ### When User Asks About Skin
    1. Call `analyze_skin` if not done yet
    2. Show scores — highlight the 2-3 worst concerns
    3. Compare to last scan: "Your acne improved 15% since last week"
    4. Offer simulation: "Want to see improvement?"
    5. If yes: `simulate_skin` → show before/after
    6. Recommend products: `search_products("hyaluronic acid serum")`
    7. Generate proof card for skincare purchase
    ```

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

- [ ] 7.1 Implement mobile-first layout system
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

- [ ] 7.2 Fix z-index stacking order
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

- [ ] 7.3 Fix VoiceOrb placement and touch target
  - Open `frontend/src/components/ui/VoiceOrb.tsx`
  - Position: `fixed`, `bottom: var(--orb-bottom)`, `left: 50%`, `transform: translateX(-50%)`
  - Size: 64px diameter (min 44px touch target met)
  - Add `padding: 10px` invisible touch area around the orb
  - Ensure it doesn't overlap with `AgentOverlay` scroll content by adding `padding-bottom: calc(var(--orb-size) + var(--orb-bottom) + 16px)` to the overlay

- [ ] 7.4 Fix AgentOverlay scrolling behavior
  - Open `frontend/src/components/layers/AgentOverlay.tsx`
  - Set container to `overflow-y: auto; -webkit-overflow-scrolling: touch;`
  - Pin scroll to bottom on new messages (auto-scroll)
  - Add padding-bottom to clear the VoiceOrb: `padding-bottom: calc(var(--orb-size) + 40px + var(--safe-bottom))`
  - Messages should scroll UP from bottom (latest at bottom, like iMessage)
  - Add gradient fade at top of overlay so camera shows through

- [ ] 7.5 Create responsive bottom navigation
  - Create `frontend/src/components/navigation/BottomNav.tsx`
  - 4 tabs: Home (camera), Closet, Skin History, Profile
  - Height: `var(--nav-height)` + `var(--safe-bottom)` padding
  - Active tab indicator with micro-animation
  - Only show on secondary pages (closet, skin-history, profile) — NOT on the main camera page
  - On the main camera page, navigation is handled by the VoiceOrb and FeatureMenu

- [ ] 7.6 Fix CameraLayer for full-bleed mobile
  - Open `frontend/src/components/layers/CameraLayer.tsx`
  - Video should fill `100dvw × 100dvh` with `object-fit: cover`
  - Apply mirror transform: `transform: scaleX(-1)` for selfie mode
  - VTO result images should overlay with `position: absolute; top: 0; left: 0;` matching the video dimensions
  - Add smooth crossfade transition (300ms) when VTO image appears/disappears

- [ ] 7.7 Make closet page responsive
  - Open `frontend/src/app/closet/page.tsx`
  - Grid: 2 columns on mobile (< 640px), 3 on tablet (640-1024px), 4 on desktop (> 1024px)
  - Item cards: square aspect ratio with `aspect-ratio: 3/4`
  - FAB (add item button): fixed bottom-right, above bottom nav, 56px diameter
  - Pull-to-refresh gesture support (optional but nice)
  - Include bottom nav on this page

- [ ] 7.8 Make skin-history page responsive
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

- [ ] 8.2 Wire SkinSimulationCard into AgentOverlay
  - Open `frontend/src/components/layers/AgentOverlay.tsx`
  - When a `vto_result` message arrives with `tool === "simulate_skin"`:
    1. Extract `simulation_url` and `original_url` (the selfie)
    2. Render `<SkinSimulationCard>` in the message stream
  - Auto-scroll to the card when it appears
  - Save the original selfie URL from the latest `selfie` frame for the "before" image

- [ ] 8.3 Store the current selfie for before/after reference
  - Open `frontend/src/hooks/useVoiceAgent.ts`
  - When a selfie is captured and sent, also store it in a React ref: `lastSelfieRef.current = base64Data`
  - Convert to a displayable URL: `URL.createObjectURL(blob)` or `data:image/jpeg;base64,{data}`
  - Pass this URL to AgentOverlay as `originalSelfieUrl` prop

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

## Notes

- Camera Kit integration (§3) is **optional** — if the SDK isn't available or causes issues, `getUserMedia` works fine. Prioritize §1, §5, §7, §8, §10 first.
- API budget: 1000 units total. Mock during dev (tasks 1-10). Switch to live for final testing (§12) and recording (§13).
- Each checkpoint (§2, §4, §6, §9, §11) is a "stop and verify" moment — don't proceed past a checkpoint if the previous section's tests fail.
- All code should follow existing patterns — look at how `analyze_skin` is wired end-to-end before building `simulate_skin`.
