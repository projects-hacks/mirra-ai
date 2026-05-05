# Implementation Tasks: Mirra v2 — Tap-Driven Lifestyle App

> **Deadline:** May 7, 2026 @ 2:00 PM PDT (3 days)
> **Strategy:** Reuse ALL existing backend tools. Replace voice frontend with guided pages.
> **Key constraint:** Every feature must demo in 90 seconds.

---

## What Already Works (DO NOT REBUILD)

| Asset | File | Status |
|-------|------|--------|
| Perfect Corp REST client | `backend/app/services/perfectcorp.py` | ✅ |
| Skin analysis/tone/face tools | `backend/app/tools/skin_tools.py` | ✅ |
| Skin simulation (with auto-derive) | `backend/app/tools/skin_tools.py` | ✅ |
| Clothes VTO | `backend/app/tools/fashion_tools.py` | ✅ |
| Makeup VTO | `backend/app/tools/beauty_tools.py` | ✅ |
| Earrings + Necklace VTO | `backend/app/tools/accessory_tools.py` | ✅ |
| Hairstyle transfer | `backend/app/tools/hair_tools.py` | ✅ |
| Serper product search | `backend/app/services/serper.py` | ✅ |
| Matching engine | `backend/app/services/matching_engine.py` | ✅ |
| Proof card generator | `backend/app/services/proof_card_generator.py` | ✅ |
| Color analyzer | `backend/app/services/color_analyzer.py` | ✅ |
| Weather service | `backend/app/services/weather.py` | ✅ |
| Tool executor (routes all tools) | `backend/app/services/tool_executor.py` | ✅ |
| Supabase client + schema | `backend/app/services/supabase_client.py` | ✅ |
| Camera Kit hook | `frontend/src/hooks/useCameraKit.ts` | ✅ |
| Landing page experience | `frontend/src/app/page.tsx` | ✅ Phase 2 done; production marketing overhaul complete |
| Selfie capture flow | `frontend/src/app/capture/page.tsx` + `frontend/src/components/onboarding/SelfieCaptureScreen.tsx` | ✅ |
| Shared authenticated app shell | `frontend/src/app/(app)/layout.tsx` + `frontend/src/components/navigation/BottomNav.tsx` | ✅ |
| Dashboard experience wrapper | `frontend/src/components/app/DashboardExperience.tsx` + `frontend/src/app/(app)/dashboard/page.tsx` | ✅ |
| GlowUp studio page | `frontend/src/app/(app)/glowup/page.tsx` | ✅ |
| GlowUp orchestrator endpoints | `backend/app/routers/glowup.py` | ✅ |
| GlowUp makeup presets | `backend/app/data/makeup_presets.py` | ✅ |
| Outfit builder page | `frontend/src/app/(app)/outfit/page.tsx` | ✅ |
| Try-On studio page | `frontend/src/app/(app)/try-on/page.tsx` | ✅ |
| Skin History page (trends, charts) | `frontend/src/app/skin-history/page.tsx` | ✅ |
| Closet page (grid + upload) | `frontend/src/app/closet/page.tsx` | ✅ |
| SkinAnalysisCard component | `frontend/src/components/cards/SkinAnalysisCard.tsx` | ✅ |
| SkinSimulationCard component | `frontend/src/components/cards/SkinSimulationCard.tsx` | ✅ |
| ProofCard component | `frontend/src/components/cards/ProofCard.tsx` | ✅ |
| ItemCardRow (product cards) | `frontend/src/components/cards/ItemCardRow.tsx` | ✅ |
| Constants + enums | `frontend/src/lib/constants.ts` + `backend/app/core/constants.py` | ✅ |

---

## ⭐ CORE CONCEPT: The Agent Reasoning Layer

**This is what wins the hackathon.** Perfect Corp APIs are the "eyes" (raw data). Our AI agent (Gemini) is the "brain" that connects the dots and shows its thinking.

**Architecture:**
```
User takes selfie
    → Perfect Corp API returns raw data (scores, images)
    → Gemini receives: API results + weather + skin history + closet data
    → Gemini generates: visible reasoning trace + actionable insights
    → Frontend renders: step-by-step AI thinking + results + recommendations
```

**What the user SEES (the "agentic" UI):**
```
🔍 Analyzing your skin...
  ✓ Skin scan complete — 14 concerns scored
  ✓ Pulled today's weather: SF, 72°F, 32% humidity
  ✓ Compared to your last scan (Apr 28)

💡 Insight:
  "Your moisture dropped 12 points this week. Today's low humidity
   (32%) is accelerating dehydration. Good news — acne improved 8%,
   your cleanser is working."

🎯 Recommendations:
  1. Hyaluronic acid serum ($16) — targets moisture
  2. SPF 50 for today's UV index

🔮 "Want to see what consistent hydration could do?"
  → [Simulate Improvement button]
```

**Implementation: `backend/app/services/agent.py`**

This is a single service that wraps Gemini API calls with structured prompts:

```python
async def generate_skin_insights(
    scores: dict,           # From Perfect Corp skin-analysis
    skin_tone: dict | None, # From skin-tone-analysis
    weather: dict | None,   # From Open-Meteo
    history: list | None,   # Past skin_scans from Supabase
) -> AgentInsight:
    """Gemini analyzes all data and returns structured insight."""

async def generate_glowup_plan(
    face_attrs: dict,       # From face-attr-analysis
    skin_tone: dict,        # From skin-tone-analysis
) -> GlowUpPlan:
    """Gemini recommends makeup/hair/accessories based on face analysis."""

async def generate_outfit_reasoning(
    matches: dict,          # From matching engine
    gaps: list,             # Identified wardrobe gaps
    context: dict,          # Occasion + weather
) -> OutfitInsight:
    """Gemini explains why these items work and what's missing."""
```

**Each function returns a structured response with:**
- `steps`: list of `{ emoji, text, status }` — the visible thinking trace
- `insight`: the main insight paragraph
- `recommendations`: actionable next steps
- `tool_calls_made`: which Perfect Corp APIs were used (for transparency)

---

## Phase 1: REST API Layer (Backend — 2-3 hours)

The existing tools are invoked via `tool_executor.py` which expects `(name, args, selfie_b64, user_id)`. We need REST endpoints that call directly into the tool functions, bypassing the voice pipeline entirely.

### 1.1 Create `/api/skin` endpoints

Create `backend/app/routers/skin.py`:

```python
# POST /api/skin/analyze
# - Accepts: multipart form with selfie image
# - Calls: skin_tools.analyze_skin(selfie_bytes, user_id)
# - Returns: { scores: {...}, skin_age: int, suggestions: [...] }

# POST /api/skin/simulate
# - Accepts: multipart form with selfie + optional intensities JSON
# - Calls: skin_tools.simulate_skin(selfie_bytes, intensities, user_id)
# - Returns: { simulation_url: str, intensities_used: {...} }

# GET /api/skin/history
# - Query param: user_id
# - Reads: Supabase skin_scans table
# - Returns: array of past scans with scores + timestamps
```

- [x] Create `backend/app/routers/skin.py` with the 3 endpoints above
- [x] Register router in `backend/app/main.py`: `app.include_router(skin.router, prefix="/api/skin")`
- [ ] Test: `curl -X POST http://localhost:8000/api/skin/analyze -F "selfie=@test.jpg"`

### 1.2 Create `/api/vto` endpoints

Create `backend/app/routers/vto.py`:

```python
# POST /api/vto/clothes
# - Accepts: selfie (multipart) + garment_url + garment_category
# - Calls: fashion_tools.try_on_clothes(selfie_bytes, garment_url, category)
# - Returns: { image_url: str }

# POST /api/vto/makeup
# - Accepts: selfie (multipart) + effects JSON
# - Calls: beauty_tools.try_on_makeup(selfie_bytes, effects)
# - Returns: { image_url: str }

# POST /api/vto/earrings
# - Accepts: selfie (multipart) + earring_url
# - Returns: { image_url: str }

# POST /api/vto/necklace
# - Accepts: selfie (multipart) + necklace_url
# - Returns: { image_url: str }

# POST /api/vto/hair
# - Accepts: selfie (multipart) + ref_hair_url
# - Returns: { image_url: str }
```

- [x] Create `backend/app/routers/vto.py` with 5 endpoints
- [x] Register in `main.py`

### 1.3 Create `/api/outfit` endpoints

Create `backend/app/routers/outfit.py`:

```python
# POST /api/outfit/match
# - Accepts: user_id, occasion, location
# - Calls: matching_engine via tool_executor._match_closet()
# - Returns: { matches: {...}, gaps: [...], context: {...} }

# POST /api/outfit/proof-card
# - Accepts: look_name, selected_items, occasion, vto_image_url
# - Calls: proof_card_generator.generate()
# - Returns: { card: {...} }
```

- [x] Create `backend/app/routers/outfit.py`
- [x] Register in `main.py`

### 1.4 Create `/api/products` endpoints

```python
# GET /api/products/search?q=hyaluronic+acid+serum&max_price=30
# - Calls: serper.search(query, max_price)
# - Returns: { products: [...], query, count }

# POST /api/glowup/recommend
# - Accepts: selfie (multipart)
# - Runs in parallel: analyze_face + analyze_skin_tone
# - Returns AI-generated makeup/hair/accessory recommendations
# - This is the "agentic" endpoint — AI decides what looks good
```

- [x] Create `backend/app/routers/products.py`
- [x] Create `backend/app/routers/glowup.py` (orchestrator endpoint)
- [x] Register both in `main.py`

### 1.5 Add CORS for frontend

- [x] Verify CORS middleware in `main.py` allows `http://localhost:3000` and production URL
- [x] Add `allow_methods=["*"]` and `allow_headers=["*"]`

---

## Phase 2: Frontend — Landing + Selfie Capture (2 hours)

### 2.1 Redesign Landing Page (`/`)

The landing page is the first thing judges see. It must feel premium.

- [x] Create `frontend/src/app/page.tsx` (overwrite existing voice-first page)
  - Hero section: "Mirra — Your AI Appearance Operator"
  - Premium gradient background
  - "Get Started" CTA button → signs in or continues to selfie capture
  - Feature cards: Skin Health, GlowUp, Smart Closet, Try-On Studio
  - If user is already authenticated → redirect to `/dashboard`

### 2.2 Selfie Capture Flow

- [x] Create `frontend/src/app/capture/page.tsx`
  - Full-screen capture flow using `SelfieCaptureScreen`
  - Uses `useCameraKit` when available
  - Camera Kit opens in `skincare` mode (quality-gated)
  - On successful capture:
    1. Show brief "Analyzing..." animation
    2. Call `POST /api/skin/analyze` with the selfie
    3. Store selfie in app state / Supabase Storage
    4. Navigate to `/dashboard`
  - Fallback to native `getUserMedia` if Camera Kit fails

### 2.3 Create shared layout for authenticated pages

- [x] Create `frontend/src/app/(app)/layout.tsx`
  - Bottom navigation bar: Home, Skin, GlowUp, Closet, Try-On
  - 5 tabs with icons and labels
  - Safe area padding for mobile (notch, home indicator)
  - User avatar in top-right corner

---

## Phase 3: Dashboard — Home Page (2 hours)

### 3.1 Create Dashboard Page (`/dashboard`)

- [x] Create `frontend/src/app/(app)/dashboard/page.tsx`
  - **Skin Summary Card** (top):
    - Overall score (large number with color)
    - Skin age vs real age
    - Last scan date
    - Trend indicator (↑ improved, ↓ declined)
    - "Full Analysis →" link to `/skin`
  - **Quick Actions Grid** (4 cards):
    - 🧴 "Skin Health" → `/skin`
    - ✨ "GlowUp" → `/glowup`
    - 👗 "What Should I Wear?" → `/outfit`
    - 👁️ "Try Something On" → `/try-on`
  - **Weather Card**:
    - Current weather + location
    - AI tip: "High UV today — SPF 50+ recommended"
  - **Recent Looks** (horizontal scroll):
    - Last 3 VTO results / proof cards

### 3.2 Dashboard data fetching

- [x] Create `frontend/src/lib/api.ts` — API client utility
  - Centralized fetch wrapper with auth headers
  - `api.post('/api/skin/analyze', formData)`, `api.get('/api/skin/history')`, etc.
  - Error handling, loading states
  - Base URL from environment variable

---

## Phase 4: Skin Health Pages (3 hours)

**Status:** Complete as of commit `921a02c`; follow-up route alias `/skin/history` remains optional because `/skin-history` is already inside the app shell and linked from Skin/Profile.

### 4.1 Skin Analysis Page (`/skin`)

- [x] Create `frontend/src/app/(app)/skin/page.tsx`
  - **Overall Score** — large circular gauge (animated on load)
  - **Concern Grid** — 14 scores in a 2-column grid
    - Each: name, score bar, color (green/amber/red), icon
    - Tap any concern → expand with detail + product recommendation
  - **Skin Age** — "Your skin age: 32 (you're 28)"
  - **Skin Tone Profile** — undertone, depth, hair/lip/eye colors
  - **"See Improvement" CTA** → navigates to skin simulation
  - **"View History" link** → `/skin/history` (existing page, reused)

### 4.2 Skin Simulation Page (`/skin/simulate`)

- [x] Create `frontend/src/app/(app)/skin/simulate/page.tsx`
  - Reuse `SkinSimulationCard` component (before/after slider)
  - On load: calls `POST /api/skin/simulate` with latest selfie
  - Intensity sliders for each concern (optional override)
  - Default: auto-derived from latest scan scores
  - Below slider: "Products to achieve this" → list of recommended products
  - Each product card has "Buy" link + image

### 4.3 Skin Product Recommendations

- [x] In the skin page, for each low-score concern, show a product suggestion
  - Score-to-query mapping:
    - `moisture < 50` → search "hyaluronic acid serum"
    - `acne > 70` → search "salicylic acid cleanser"
    - `wrinkle > 60` → search "retinol cream"
    - etc. (see §17 of old TASKS.md for full mapping)
  - Call `GET /api/products/search?q=...` for top 3 concerns
  - Render as horizontal scrollable product cards (reuse `ItemCardRow`)

### 4.4 Skin History (reuse existing)

- [x] The existing `/skin-history/page.tsx` works and is rendered inside the authenticated app shell
- [x] Keep `/skin-history` as the current route and add layout/header support for it
- [x] Add navigation from skin page: "History"

---

## Phase 5: GlowUp Studio (3 hours)

### 5.1 GlowUp Page (`/glowup`)

This is the "AI Makeover" feature — **the most visually impressive demo moment**.

- [x] Create `frontend/src/app/(app)/glowup/page.tsx`
  - **Step 1: Face Analysis** (automatic on page load)
    - Calls `POST /api/glowup/analyze` if not cached
    - Shows: face shape, eye shape, proportions
    - "Based on your oval face and warm undertone..."
  - **Step 2: Makeup**
    - AI suggests a look (e.g., "Natural Glow" or "Evening Glam")
    - Preview tiles: 3-4 pre-configured makeup looks
    - Tap to apply → calls `POST /api/vto/makeup` with effects
    - Result overlaid on selfie with smooth transition
  - **Step 3: Hairstyle**
    - Grid of curated reference hairstyles
    - Tap to transfer → calls `POST /api/vto/hair`
    - Before/after toggle
  - **Step 4: Accessories**
    - AI recommends earrings based on face shape
    - Product search → image cards
    - Tap to try on → `POST /api/vto/earrings`
    - Same for necklace
  - **Final: Before/After Comparison**
    - Side-by-side or slider: original selfie vs full glowup
    - "Save Look" / "Share" buttons

### 5.2 GlowUp Backend Orchestrator

- [x] Create `backend/app/routers/glowup.py`
  - `POST /api/glowup/analyze` — runs face-attr + skin-tone in parallel
  - `POST /api/glowup/recommend` — accepts either a selfie or normalized face/tone JSON and returns suggested:
    - Makeup effects JSON (shade-matched)
    - Hairstyle reference URLs
    - Accessory product queries
  - This is where the "agentic AI" logic lives — AI makes aesthetic decisions

### 5.3 Pre-configured Makeup Looks

- [x] Create `backend/app/data/makeup_presets.py`
  - 4 preset looks: "Natural Glow", "Evening Glam", "Bold Lip", "Smoky Eye"
  - Each preset: list of makeup effects (lip color, eye shadow, blush, foundation)
  - AI picks which presets work for the user's skin tone/undertone
  - These are the effects arrays passed to `try_on_makeup`

---

## Phase 6: Outfit Builder (2 hours)

### 6.1 Occasion Matcher Page (`/outfit`)

- [x] Create `frontend/src/app/(app)/outfit/page.tsx`
  - **Occasion Selector** — grid of occasions:
    - Board Meeting, Date Night, Casual Friday, Workout, Wedding Guest, Beach Day
  - On select:
    1. Auto-fetch weather for user's location
    2. Call `POST /api/outfit/match` with occasion + location
    3. Show matched items grouped by category (tops, bottoms, shoes, accessories)
    4. Each item shows: image, name, match score, match reasons
    5. "Try This Look" button → calls clothes VTO
  - **Gap Detection**:
    - If matching engine finds gaps: "You don't own a formal dress"
    - "Shop options →" → Serper search → product cards
    - Tap product → VTO try-on
  - **Proof Card**:
    - After building a complete look (owned + new items)
    - "See Proof Card" → renders ProofCard component

### 6.2 Reuse existing closet page

- [x] The existing `/closet/page.tsx` already has grid + upload
- [x] Ensure it's accessible from the bottom nav
- [x] Link from outfit page: "Manage Closet →"

---

## Phase 7: Try-On Studio (1.5 hours)

### 7.1 VTO Studio Page (`/try-on`)

- [x] Create `frontend/src/app/(app)/try-on/page.tsx`
  - **Category tabs**: Clothes, Makeup, Hair, Accessories
  - **Clothes tab**:
    - URL input: paste a product image URL → try on
    - Or: search products → tap to try on
    - Category selector: upper/lower/full
    - Result: selfie with garment overlaid
  - **Makeup tab**:
    - Preset looks grid (from §5.3)
    - Tap to apply → VTO result
  - **Hair tab**:
    - Reference hairstyle grid → tap to transfer
  - **Accessories tab**:
    - Product search → tap to try on earrings/necklace
  - **Common UI**:
    - Large selfie display area (portrait)
    - Result overlaid with crossfade animation
    - "Reset" button to go back to original selfie
    - "Save" to save the look

---

## Phase 8: Polish & Demo Prep (2 hours)

### 8.1 UI/UX Polish

- [ ] Dark theme with purple/blue gradient accents
- [ ] All pages: loading skeletons (no blank screens)
- [ ] Smooth page transitions (Next.js route transitions)
- [ ] All interactive elements: 44px min touch target
- [ ] Mobile-first: test at 375px width
- [ ] Bottom nav: proper safe-area-inset-bottom padding

### 8.2 Demo Data Seeding

- [ ] Seed 15 closet items (see original §10.1 for list)
- [ ] Seed 4-5 skin scan history records (trending data)
- [ ] Seed 2 calendar events (board meeting + date night)

### 8.3 Mock Interceptor

- [ ] Verify all 9 API types have mocks in `backend/app/core/mock_interceptor.py`
- [ ] Create `skin-simulation.json` mock if missing
- [ ] Test full flow with `USE_MOCKS=true` (burns 0 API units)

### 8.4 Demo Recording

- [ ] Write final demo script (90 seconds, see PRD §7)
- [ ] Deploy: frontend to Vercel, backend to Render/Railway
- [ ] Record 3-4 takes on mobile device
- [ ] Submit on Devpost by May 7 2:00 PM PDT

---

## Critical Path (Priority Order)

| Priority | Task | Est. | Why |
|----------|------|------|-----|
| **P0** | REST API layer (Phase 1) | 3hr | Everything depends on this |
| **P0** | Landing + Selfie (Phase 2) | 2hr | First impression |
| **P0** | Dashboard (Phase 3) | 2hr | Home base for all features |
| **P1** | Skin Health pages (Phase 4) | 3hr | Highest API usage |
| **P1** | GlowUp Studio (Phase 5) | 3hr | Most visually impressive |
| **P2** | Outfit Builder (Phase 6) | 2hr | Closet page exists, build matcher UI |
| **P2** | Try-On Studio (Phase 7) | 1.5hr | Direct VTO access |
| **P3** | Polish + Demo (Phase 8) | 2hr | Final pass |

**Total estimate: ~18.5 hours across 3 days.**

---

## Day-by-Day Plan

### Day 1 — May 5 (Foundation)
| Time | What | Phase |
|------|------|-------|
| Evening | REST API endpoints (all 5 routers) | §1 |
| Evening | Landing page + selfie capture | §2 |
| Night | Dashboard page | §3 |

### Day 2 — May 6 (Features)
| Time | What | Phase |
|------|------|-------|
| Morning | Skin Health pages (analysis + simulation + recs) | §4 |
| Afternoon | GlowUp Studio | §5 |
| Evening | Outfit Builder + Try-On Studio | §6, §7 |

### Day 3 — May 7 (Polish + Ship)
| Time | What | Phase |
|------|------|-------|
| Morning | UI polish, seed data, mock verification | §8.1-8.3 |
| Midday | Deploy + record demo | §8.4 |
| **2:00 PM** | **DEADLINE** | — |
