# Implementation Tasks: Mirra v2 — Tap-Driven Lifestyle App

> **Deadline:** May 7, 2026 @ 2:00 PM PDT (3 days)
> **Strategy:** Reuse ALL existing backend tools. Replace voice frontend with guided pages.
> **Key constraint:** Every feature must demo in 90 seconds.
> **Perfect Corp source of truth:** [`docs/PERFECT_CORP_API_SOURCE_OF_TRUTH.md`](./PERFECT_CORP_API_SOURCE_OF_TRUTH.md)

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
| Outfit orchestration service | `backend/app/services/outfit_service.py` | ✅ Cleanup pass complete |
| Supabase client + schema | `backend/app/services/supabase_client.py` | ✅ |
| Camera Kit hook | `frontend/src/hooks/useCameraKit.ts` | ✅ |
| Landing page experience | `frontend/src/app/page.tsx` | ✅ Phase 2 done; production marketing overhaul complete |
| Selfie capture flow | `frontend/src/app/capture/page.tsx` + `frontend/src/components/onboarding/SelfieCaptureScreen.tsx` | ✅ |
| Shared authenticated app shell | `frontend/src/app/(app)/layout.tsx` + `frontend/src/components/navigation/BottomNav.tsx` | ✅ |
| Dashboard experience route | `frontend/src/app/(app)/dashboard/page.tsx` | ✅ |
| Shared skin summary domain logic | `frontend/src/lib/skinSummary.ts` | ✅ Cleanup pass complete |
| Shared user context / location resolver | `frontend/src/lib/userContext.ts` | ✅ Cleanup pass complete |
| Proof cards frontend API client | `frontend/src/lib/api.ts` (`proofCardsApi`) | ✅ Cleanup pass complete |
| GlowUp studio page | `frontend/src/app/(app)/glowup/page.tsx` | ✅ |
| GlowUp orchestrator endpoints | `backend/app/routers/glowup.py` | ✅ |
| GlowUp makeup presets | `backend/app/data/makeup_presets.py` | ✅ |
| Outfit builder page | `frontend/src/app/(app)/outfit/page.tsx` | ✅ |
| Try-On studio page | `frontend/src/app/(app)/try-on/page.tsx` | ✅ |
| Skin History page (trends, charts) | `frontend/src/app/(app)/skin-history/page.tsx` | ✅ |
| Closet page (grid + upload) | `frontend/src/app/(app)/closet/page.tsx` | ✅ |
| SkinAnalysisCard component | `frontend/src/components/cards/SkinAnalysisCard.tsx` | ✅ |
| SkinSimulationCard component | `frontend/src/components/cards/SkinSimulationCard.tsx` | ✅ |
| ProofCard component | `frontend/src/components/cards/ProofCard.tsx` | ✅ |
| ItemCardRow (product cards) | `frontend/src/components/cards/ItemCardRow.tsx` | ✅ |
| Constants + enums | `frontend/src/lib/constants.ts` + `backend/app/core/constants.py` | ✅ |

---

## Implementation Log (Completed So Far)

This section documents what was completed across the previous implementation passes so the task file reflects the real codebase, not just the original plan.

### Completed delivery phases

- Phase 1 completed:
  - Added backend REST routers for skin, VTO, outfit, products, and glowup.
  - Registered routers in `backend/app/main.py`.
  - Added multipart handling support in backend requirements for file uploads.
- Phase 2 completed:
  - Replaced the old voice-first landing flow with a guided landing page.
  - Added selfie capture at `/capture` with Camera Kit fallback behavior.
  - Added the shared authenticated shell and routed the dashboard into it.
- Phase 3 completed:
  - Built the dashboard page and centralized API client layer in `frontend/src/lib/api.ts`.
  - Dashboard now renders skin summary, quick actions, weather, and recent looks.
- Phase 4 completed:
  - Added the authenticated skin analysis page and skin simulation page.
  - Reused the existing skin history route inside the app shell.
  - Added product recommendation rendering for top skin concerns.
- Phase 5 completed:
  - Built the GlowUp studio flow.
  - Added backend glowup orchestration endpoints and preset makeup catalog support.
- Phase 6 completed:
  - Built the outfit builder flow with occasion selection, weather-aware matching, gap handling, and proof-card generation.
- Phase 7 completed:
  - Built the standalone try-on studio for clothes, makeup, hair, and accessories.
- Phase 8.1 completed:
  - Added the dark theme, shared loading skeletons, smoother route transitions, touch-target sizing, and safe-area polish.

### Product and architecture cleanup completed after the phase work

- Frontend DRY cleanup completed:
  - Extracted shared skin summary and dashboard insight logic into `frontend/src/lib/skinSummary.ts`.
  - Removed duplicated summary/trend code from `useDashboard` and `useSkinAnalysis`.
- User context consistency completed:
  - Extracted shared profile-location lookup into `frontend/src/lib/userContext.ts`.
  - Dashboard, skin analysis, and outfit flows now resolve weather context from the saved user location instead of relying on the default San Francisco fallback.
- Dashboard product gap closed:
  - Wired recent looks to real proof-card history via `proofCardsApi` in `frontend/src/lib/api.ts`.
  - Reused the same proof-card client in the look diary page.
- Backend SOLID cleanup completed:
  - Centralized closet matching and proof-card generation orchestration in `backend/app/services/outfit_service.py`.
  - Updated `backend/app/routers/outfit.py` to depend on the public outfit service instead of private executor helpers.

### Validation completed on the current cleanup pass

- `npm run lint` passes in `frontend`
- `npm run build` passes in `frontend`
- Backend syntax check passes for:
  - `backend/app/services/outfit_service.py`
  - `backend/app/routers/outfit.py`

### Progress update: skin consistency, camera kit, GlowUp hardening

- Completed:
  - Traced the dashboard / command-center skin score source and removed drift between dashboard, skin page, and skin history.
  - Fixed Perfect Corp Camera Kit mounting so the SDK overlay is forced fullscreen instead of rendering in normal page flow.
  - Removed the user-facing native camera fallback CTA from the production scan flow so capture always follows Perfect Corp quality gating.
  - Unified skin score calculation across:
    - dashboard
    - skin page
    - skin history
    - `skinApi.summary()`
  - Fixed dashboard / skin reasoning CTA behavior:
    - skin page reasoning actions now work
    - `Simulate Improvement` routing works
  - Fixed skin history detail mismatch:
    - non-concern fields such as `skin_age` and provider-level `all` are no longer treated as concern rows
  - Hardened GlowUp partial-failure behavior:
    - deterministic client fallback plan
    - accessory loading / empty states
    - explicit notice when fallback planning is used
  - Filtered backend skin-insight ranking to real skin concern keys only, so Gemini / fallback reasoning cannot promote `skin_age` as a concern.
  - Normalized backend success contracts for skin simulation and core VTO routes so frontend consumers can rely on canonical `image_url`.
  - Added shared frontend VTO response normalization and shared image extraction utilities in `frontend/src/lib/api.ts`.
  - Normalized backend error contracts across skin, VTO, GlowUp, and outfit proof-card routes to structured `detail` payloads with stable categories.
  - Added shared frontend error formatting for taxonomy-driven failures:
    - product page URL
    - expired image URL
    - face rejected
    - pose rejected
    - reference rejected
    - API timeout
    - unsupported category
    - provider auth / units / invalid provider response
  - Hardened Try-On partial-state behavior:
    - starter fallback plan when GlowUp analysis or plan generation is unavailable
    - explicit studio notice when fallback recommendations are in use
    - inline clothes and accessory search empty / failure states
    - non-blank makeup and hair sections while recommendation data is degraded
  - Split Try-On Studio image inputs by modality:
    - clothes now requires a dedicated full-body image instead of reusing the portrait selfie
    - makeup, hair, earrings, and necklace remain portrait-selfie-based
    - added full-body upload and in-tab camera capture for clothes
    - added lightweight client-side body image validation for framing / size before clothes VTO runs
    - added explicit body-source preview, retake, and removal controls in the clothes flow
  - Aligned Outfit Builder clothes VTO with the same body-image contract:
    - outfit clothes preview no longer uses the portrait selfie for body try-on
    - outfit VTO now depends on the stored full-body image from Try-On Studio
    - added user-facing guidance when the body source image is missing
  - Completed another mobile polish pass across GlowUp, Try-On, and Outfit Builder:
    - primary action rows now stack cleanly on narrow screens
    - search controls and source-image controls no longer rely on cramped horizontal layouts
    - accessory product cards scale down more safely on mobile
    - save / share / reset / download controls now behave as full-width stacked actions where appropriate
  - Completed another persistence and partial-failure pass:
    - GlowUp accessory rows now surface per-category empty / unavailable states
    - Outfit Builder gap-product search now surfaces per-gap empty / unavailable states
    - Outfit Builder proof-card generation now only attaches the local outfit preview generated inside that flow, instead of reusing stale shared VTO state
  - Fixed remaining production transport issues:
    - frontend API callers now resolve the backend origin at runtime instead of depending on stale compile-time `API_URL` values
    - remaining closet / outfit-history / onboarding / recommendation flows no longer use local relative `/api/...` fetches against the Vercel origin
    - service worker cache version was bumped to flush stale cached bundles in production
  - Reworked frontend/backend transport architecture:
    - Next.js now rewrites same-origin `/api/*` requests to the backend origin
    - browser-side API calls now prefer same-origin `/api/*` paths instead of direct cross-origin backend fetches
    - service worker now bypasses `/api/*` entirely so authenticated backend data is not cached in the service worker
    - added SWR as the frontend client-cache layer for high-churn authenticated reads
  - Expanded backend Redis caching where it reduces real cost without broad correctness risk:
    - Serper product search results are cached by query + price filter
    - product image resolution results are cached by input URL
    - Gemini agent outputs are cached by normalized input payload
    - repeated Perfect Corp skin analysis / tone / face / simulation calls are cached by selfie hash + params where applicable
  - Removed dead Redis writes:
    - onboarding no longer writes unused `body_model:{user_id}` and `closet:{user_id}` cache entries that had no live read path
  - Hardened GlowUp backend analysis:
    - `/api/glowup/analyze` now degrades to a safe starter face/tone payload when one provider analysis path fails, instead of returning a hard 500 for partial provider failure
  - Upgraded GlowUp persistence:
    - `Save Look` now persists via proof-card generation instead of downloading only
    - save success state is surfaced in the UI
    - GlowUp save/share now only operates on a result generated inside GlowUp, preventing stale cross-flow VTO state from being reused

### Gemini integration status

- Gemini integration is currently active in backend for:
  - `generate_skin_insights`
  - `generate_glowup_plan`
  - `generate_outfit_reasoning`
  - AI metadata extraction
- Gemini-backed output is currently surfaced in frontend for:
  - skin reasoning card on dashboard / skin flow
  - GlowUp reasoning card and recommendation actions
  - Try-On reasoning card and recommendation actions
  - Outfit reasoning / proof-card states
- Completed Gemini-backed UI coverage:
  - Dashboard and Skin render shared reasoning cards from normalized agent output.
  - GlowUp Studio renders the shared reasoning trace card from normalized Gemini / fallback JSON.
  - Try-On Studio renders the shared reasoning trace card from normalized Gemini / fallback JSON.
  - Outfit Builder uses backend outfit reasoning and surfaces deterministic proof-card / gap states.
- Remaining Gemini scope:
  - Gemini is intentionally the reasoning/orchestration layer, not the Perfect Corp visual engine.
  - Direct Perfect Corp execution remains deterministic for VTO and skin visuals.
  - Any future flow added outside skin, GlowUp, Try-On, and Outfit Builder should reuse the same structured agent-card pattern.

### Remaining execution checklist

- Completed implementation:
  - Normalize API contracts for skin and VTO responses:
    - shared success shapes
    - shared error shapes
    - typed frontend consumers
    - reduced endpoint-specific parsing
  - Implement end-to-end user-facing error taxonomy for:
    - product page / image resolution failure
    - expired image URL
    - face rejected
    - API timeout
    - unsupported category
  - Finish Gemini UI coverage so reasoning is surfaced consistently where intended with deterministic rendering and no silent fallback behavior
    - deterministic reasoning card rendering
    - recommendation actions in GlowUp and Try-On
    - typed fallback data instead of silent empty states
  - Complete Try-On flow separation:
    - clothes uses a dedicated full-body image contract
    - makeup, hair, earrings, and necklace use the portrait selfie contract
    - product search and product image resolution use explicit partial-failure states
    - persistence writes the selected result into proof cards / diary
  - Complete GlowUp UX hardening:
    - accessory loading / empty / unavailable states
    - save-to-proof-card persistence
    - share/download scoped to the current GlowUp result
    - mobile layout polish
    - partial backend failure handling
- Verification status:
  - Passed `npm run lint` in `frontend`.
  - Passed `npx tsc --noEmit` in `frontend`.
  - Fixed production same-origin API redirect class by calling slash-normalized collection routes:
    - `/api/closet/`
    - `/api/proof-cards/`
  - Still pending before calling the whole checklist fully done:
    - final browser QA on deployed desktop and mobile for Skin, GlowUp, Try-On, Outfit Builder, Closet, and proof-card persistence
    - confirm no remaining 307 redirects from same-origin `/api/*` routes in production DevTools

---

## Codebase Audit Backlog — May 6, 2026

This backlog comes from the technical audit after the Perfect Corp + Gemini integration work. The Perfect Corp source of truth for API payloads, result shapes, polling behavior, image requirements, and error taxonomy is [`docs/PERFECT_CORP_API_SOURCE_OF_TRUTH.md`](./PERFECT_CORP_API_SOURCE_OF_TRUTH.md).

### P0 Correctness And Cost Controls

- [x] Fix VTO cache-key correctness.
  - Files:
    - `backend/app/tools/base_vto.py`
    - `backend/app/tools/beauty_tools.py`
  - Problem:
    - Makeup VTO was cached only by selfie hash, so changing makeup effects on the same selfie could return the first cached makeup render.
    - Shared VTO cache keys used a manually supplied suffix and did not consistently include the full reference URL and params.
  - Implementation:
    - Include `task_type`, selfie hash, full reference URL hash, `extra_params`, and makeup effects/version in cache keys.
  - Acceptance:
    - Same selfie + different makeup effects returns different cache keys.
    - Same selfie + same product + same params still reuses cache.
    - Covered by `backend/app/tools/test_vto_contracts.py`.

- [x] Fix skin simulation image URL extraction.
  - Files:
    - `backend/app/tools/skin_tools.py`
    - `backend/app/tools/base_vto.py`
  - Perfect Corp reference:
    - Visual task success responses usually return the rendered image at `data.results.url`.
  - Problem:
    - Skin simulation only checked `url` and `result.url`, so a valid provider result in `results.url` could surface as an empty simulation URL.
  - Implementation:
    - Reuse the shared nested image extractor used by VTO.
  - Acceptance:
    - `url`, `image_url`, `result_image_url`, `result.url`, `results.url`, and `data.url` are accepted.
    - Covered by `backend/app/tools/test_vto_contracts.py`.

- [x] Remove remaining same-origin collection-route redirects.
  - Files:
    - `frontend/src/app/style-profile/page.tsx`
    - `frontend/src/app/outfit-history/page.tsx`
  - Problem:
    - Backend routes defined as `@router.get("/")` can redirect slashless `/api/...` calls to `/api/.../`.
    - In production behind Vercel rewrites, this can expose an absolute backend `Location` header and reintroduce mixed-content failures.
  - Implementation:
    - Call slash-normalized collection routes directly.
  - Acceptance:
    - No 307 redirect for style profile or outfit history reads.

- [ ] Lock down expensive public routes.
  - Files:
    - `backend/app/core/auth_middleware.py`
    - route-specific callers in `frontend/src/lib/api.ts`
  - Problem:
    - Public routes currently include skin analysis, skin simulation, VTO, products, and GlowUp, which can trigger Perfect Corp, Serper, Gemini, and resolver cost without an authenticated user.
  - Implementation options:
    - Require Supabase JWT for all post-onboarding expensive routes.
    - Keep only `/api/onboarding/init` and the minimum first-scan onboarding endpoints public.
    - If unauthenticated onboarding calls must remain, issue a short-lived signed onboarding token and rate-limit it.
  - Acceptance:
    - Anonymous users cannot call paid Perfect Corp / Gemini / Serper endpoints outside the intended onboarding path.
    - Authenticated app pages still work through `fetchApi`.

- [ ] Harden product image resolver against SSRF and oversized downloads.
  - Files:
    - `backend/app/services/product_image_resolver.py`
    - `backend/app/routers/products.py`
  - Problem:
    - Resolver follows arbitrary user-supplied URLs and redirects. It should not fetch localhost, private IPs, metadata IPs, link-local addresses, or non-public hosts.
  - Implementation:
    - [x] Validate URL scheme and host before fetch.
    - [x] Resolve DNS and block private/link-local/loopback/multicast/reserved IPs.
    - [x] Revalidate every redirect target.
    - [x] Reject oversized responses by `Content-Length` and post-read byte count.
    - [ ] Stream downloads with a hard byte ceiling instead of reading unknown-size responses into memory.
  - Acceptance:
    - Private and metadata URLs return `product_page_url` / `invalid_input` without network fetch.
    - Large files fail before memory pressure.
    - First hardening pass covered by `backend/app/services/test_product_image_resolver.py`.

### P1 API Contract And Error Consistency

- [ ] Add Pydantic response contracts for skin and VTO.
  - Files:
    - `backend/app/routers/skin.py`
    - `backend/app/routers/vto.py`
    - `backend/app/models/perfectcorp_types.py`
  - Problem:
    - Most routes return `dict[str, Any]`, so response regressions are not caught by backend typing or tests.
  - Implementation:
    - Define normalized success models for skin analysis, skin simulation, clothes, makeup, hair, earrings, and necklace.
    - Define a common error detail model matching the user-facing taxonomy.
  - Acceptance:
    - Every frontend VTO consumer can rely on `image_url`.
    - Every provider failure returns structured `detail.category`, `detail.message`, `detail.source`, and provider fields when available.

- [ ] Finish moving direct frontend `fetch` calls to typed API clients.
  - Files:
    - `frontend/src/lib/api.ts`
    - `frontend/src/app/style-profile/page.tsx`
    - `frontend/src/app/outfit-history/page.tsx`
    - `frontend/src/components/closet/*.tsx`
  - Problem:
    - Direct `fetch` calls bypass central auth, 401 handling, same-origin normalization, and `formatApiError`.
  - Implementation:
    - Add typed clients for style profile, outfit history, closet analytics, recommendations, metadata extraction, and item detail mutations.
    - Replace ad hoc fetch calls.
  - Acceptance:
    - API calls use `fetchApi`, `apiPost`, or `fetchWithFormData` unless fetching a non-API image/blob.

- [ ] Validate Gemini JSON with Pydantic before returning to frontend.
  - Files:
    - `backend/app/services/agent.py`
  - Problem:
    - Gemini is instructed to return structured JSON, but backend currently trusts the parsed object shape.
  - Implementation:
    - Add models for skin insights, GlowUp plans, and outfit reasoning.
    - Normalize or fallback when required fields are missing.
  - Acceptance:
    - Frontend never receives malformed Gemini objects.
    - Fallbacks are explicit and typed.

### P1 Persistence And Privacy

- [ ] Replace large personal-image `localStorage` persistence.
  - Files:
    - `frontend/src/components/providers/AppProvider.tsx`
    - `frontend/src/app/(app)/try-on/page.tsx`
    - `frontend/src/app/(app)/outfit/page.tsx`
  - Problem:
    - Portrait selfie and full-body images are stored as large data URLs in `localStorage`.
    - This can hit quota, leave stale personal images on shared devices, and is not cleared consistently.
  - Implementation options:
    - Store images in Supabase storage and persist only URLs.
    - Or use IndexedDB with explicit expiration and user-facing delete controls.
    - Ensure global reset clears body image storage.
  - Acceptance:
    - No long-lived base64 body/selfie data in localStorage.
    - Users can clear captured images from one place.

- [ ] Make proof-card and diary persistence end-to-end typed.
  - Files:
    - `backend/app/routers/outfit.py`
    - `backend/app/routers/proof_cards.py`
    - `frontend/src/lib/api.ts`
    - `frontend/src/app/look-diary/page.tsx`
  - Problem:
    - Proof-card creation and listing work, but response payloads are still partially loose.
  - Acceptance:
    - Proof cards have a shared backend/frontend type and all save flows use it.

### P2 Feature Completion

- [ ] Add explicit image-quality validation beyond lightweight frontend checks.
  - Scope:
    - full-body clothes source image
    - portrait selfie for face, makeup, earrings, necklace, hair
  - Perfect Corp reference:
    - Body/clothes VTO expects full-body visibility, neutral pose, even lighting, plain background, form-fitting clothing, JPG/PNG under 10MB, long side <= 4096.
    - Face APIs expect centered, forward-facing, unobstructed face and adequate lighting.
  - Implementation:
    - Add server-side image dimension checks.
    - Add category-specific preflight messages before spending provider units.
  - Acceptance:
    - Unsupported image size/type fails locally before Perfect Corp.

- [ ] Add product/reference-specific accessory controls.
  - Scope:
    - earrings: side/front guidance, single/both earring behavior, optional side selection
    - necklace: neck visibility guidance, optional length/placement controls
  - Perfect Corp reference:
    - Earring and necklace APIs support placement, shadow, ambient light, and optional anchor/mask parameters.
  - Acceptance:
    - UI exposes safe default controls without overwhelming the main flow.

- [ ] Expand tests.
  - Backend tests:
    - VTO cache-key uniqueness.
    - skin simulation URL extraction from nested `results.url`.
    - product resolver SSRF blocking and error taxonomy.
    - auth middleware paid-route behavior.
    - slash route no-redirect coverage.
  - Frontend tests:
    - `formatApiError` taxonomy messages.
    - typed API clients build slash-normalized URLs.
    - Try-On save requires an applied result.
    - GlowUp partial product failures render visible states.

### P2 Operational Hardening

- [ ] Add rate limiting and request budgeting.
  - Scope:
    - Perfect Corp routes
    - Gemini routes
    - Serper search
    - product image resolver
  - Acceptance:
    - Per-user and per-IP limits exist.
    - Error responses use taxonomy category `service_unavailable` or `api_timeout` as appropriate.

- [ ] Add provider observability.
  - Scope:
    - task type
    - provider task id
    - duration
    - cache hit/miss
    - unit-affecting success/failure
  - Acceptance:
    - Debugging production provider failures does not require reproducing blindly.

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

The REST endpoints call tool functions directly and bypass the removed voice pipeline.

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
# - Calls: outfit_service.match_closet()
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

- [x] Dark theme with purple/blue gradient accents
- [x] All pages: loading skeletons (no blank screens)
- [x] Smooth page transitions (Next.js route transitions)
- [x] All interactive elements: 44px min touch target
- [x] Mobile-first: test at 375px width
- [x] Bottom nav: proper safe-area-inset-bottom padding

### 8.2 Demo Data Seeding

- [ ] Seed 15 closet items (see original §10.1 for list)
- [ ] Seed 4-5 skin scan history records (trending data)
- [ ] Seed 2 calendar events (board meeting + date night)

### 8.3 Live API Validation

- [ ] Verify all Perfect Corp flows against live API credentials
- [ ] Confirm user-facing errors for rejected selfies, product-page URLs, and expired result URLs
- [ ] Record known API-unit cost per demo run

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
