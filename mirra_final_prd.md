# Mirra — Final PRD
### *The AI That Helps You Show Up Right*

> **Hackathon:** Perfect Corp x Startup World Cup
> **Deadline:** May 7, 2026 @ 2:00pm PDT
> **Team:** Maverickrajeev + Vineet
> **Version:** Final (synthesizes 15+ hours across two models)

---

## 1. What Mirra Is — In One Sentence

> Mirra is an AI appearance operator that sees your face, understands your day, and builds the right look from what you own plus only what you need to buy.

Mirra is not a catalog browser with AI on top. It is an operator that makes appearance decisions on your behalf.

---

## 2. Three Rules That Define Mirra

### Rule 1: Owned-First, Not Commerce-First
Mirra starts with: "What do you already own? What fits today's context? What's the cheapest good answer?" It shops ONLY when there's a real gap.

**Why this matters:** Perfect Corp's own AI Beauty Agent is brand/merchant-facing — it optimizes for conversion. **Mirra is a user agent, not a merchant agent. It optimizes for confidence and cost, not conversion.** That's the wedge.

### Rule 2: Context-Native
Calendar, weather, occasion, budget, mood, skin state, closet, and style memory ALL influence the answer in one conversation. Mirra doesn't ask "what do you want?" — it already knows your day and works from there.

### Rule 3: Memory Is the Moat
After 90 days, Mirra knows: your undertone, fit preferences, favorite silhouettes, event patterns, skin trajectory, what you bought, rejected, and re-wore. That data doesn't transfer. Switching cost grows with usage — same as Spotify playlists or Strava history.

**Mirra doesn't just remember preferences. It remembers outcomes — what you wore, what you bought, what you skipped, and what actually worked.**

---

## 3. The Interface

**One conversation. No tabs. No feature menu.**

The user opens Mirra. Camera shows their face. They talk. Mirra does everything.

The agent DECIDES which APIs to call based on the conversation. The user never clicks "Skin Analysis" or "Try-On" or "Shopping." They just describe what they need.

```
User: "I have a board meeting at 10 and a date at 7."

Mirra: [checks calendar ✓, weather ✓, closet ✓, skin scan ✓]
       "72° and dry in SF. For the meeting, your navy blazer 
        works with your warm undertone. Minimal makeup — 
        your skin is a bit drier than last week, so I'd 
        skip powder today. Hair pulled back."
       [Clothes VTO renders blazer · Makeup VTO applies 
        natural look · Hair Style VTO shows updo]

User: "And tonight?"

Mirra: "Romantic? Bold? Effortless?"

User: "Romantic."

Mirra: "Soft smoky eye, berry lip, loose waves, gold drop 
        earrings. You already own the blazer and shoes. 
        For tonight, I found a dress and earrings — $127 
        total. Want budget options first?"
       [Full look renders on user: Dress VTO + Makeup VTO + 
        Hair Style VTO + Earrings VTO]

User: "Yes, show me budget."

Mirra: "Two options under $80."
       [Re-renders with cheaper alternatives]
       "Also — your skin looks drier than last week. 
        Adding a $16 HA serum to your cart."
       
User: "Perfect. Buy it."

Mirra: [Generates Proof Card with match scores → Approved]
```

---

## 4. How Mirra Is Different From Everything Else

### Why Mirra ≠ Perfect Corp's AI Beauty Agent
| Perfect Corp's Beauty Agent | Mirra |
|---|---|
| Brand/merchant-facing ("help brands sell") | **User-facing ("help ME look right")** |
| Commerce-first (drives conversions) | **Owned-first (uses your closet first)** |
| Single-session (one product recommendation) | **Memory-based (knows your history)** |
| Beauty-only (skincare + makeup) | **Full appearance (skin + beauty + fashion + accessories)** |
| Runs on brand websites | **Runs as your personal agent** |

### Why Mirra ≠ Google Wardrobe / ASOS / Daydream
| Competitor | What They Do | What Mirra Does Differently |
|---|---|---|
| Google Wardrobe | Catalogs your closet photos | **Combines closet + context + skin + try-on + shopping in ONE conversation** |
| ASOS Virtual Try-On | Try ASOS products on your photo | **Cross-brand, owned-first, not retailer-locked** |
| Daydream | AI fashion shopping agent | **Owned-first (shops only when needed), adds beauty + skin + accessories** |
| Bold Metrics | Digital twin for fit/sizing | **Full appearance stack, not just fit** |

### Why Mirra ≠ Another Try-On App
Try-on apps show you ONE product at a time. Mirra orchestrates a **complete look** across categories in one conversation, starting from what you own, adding only what's missing.

---

## 5. The Proof Card (Mirra's Approval Moment)

The Proof Card is Mirra's approval moment — a visual receipt that explains why this look fits you before money moves. When Mirra recommends a purchase, it generates a Proof Card showing the products on YOUR face with match scores.

```
┌─────────────────────────────────────┐
│  ✓ PROOF CARD                       │
│                                      │
│  [Your face wearing the full look]   │
│                                      │
│  "Date Night — Romantic"             │
│  2 new items · $127                  │
│                                      │
│  Tone Match:   █████████░ 97%        │
│  Style Fit:    ████████░░ 94%        │
│  Skin Safe:    ✓ No conflicts        │
│                                      │
│  New Items:                          │
│  · Reformation Midi Dress    $98     │
│  · Mejuri Gold Drop Hoops    $29     │
│                                      │
│  From Your Closet:                   │
│  · Navy blazer (board meeting)       │
│  · Sam Edelman heels                 │
│                                      │
│  HA Serum (skin care):       $16     │
│  ─────────────────────────────       │
│  Total new spend:            $143    │
│                                      │
│  [Approve] [Adjust] [Save]           │
└─────────────────────────────────────┘
```

**Why the Proof Card matters:**
- For the user: visual proof of match before spending
- For merchants: approved purchases should see significantly fewer returns
- For the business: this approval layer can become a B2B API other agents call (expansion path)

---

## 6. API Stack

### How the Agent Decides Which APIs to Call

The user never selects APIs. The agent orchestrates based on conversation:

| User says... | Agent calls... |
|---|---|
| Opens Mirra for first time | JS Camera Kit → Skin Analysis → Facial Color Tones → Face Attributes |
| "What should I wear today?" | Calendar API → Weather API → Closet match → Clothes VTO |
| "Help me with makeup" | Makeup VTO (shade-adjusted from Facial Color Tones) |
| "Make me look like Zendaya at the Met" | Makeup Transfer + Hair Style VTO + Hair Color VTO + Clothes VTO |
| "Try gold earrings" | Earrings VTO |
| "Show me my whole look" | ALL relevant VTOs render simultaneously |
| "Buy these" | Proof Card generated → Serper confirms prices → Checkout |
| "How's my skin this week?" | Skin Analysis (compare to last scan) + Aging Sim (trajectory) |
| "What about my nails?" | Nail VTO |
| "Swap the scarf" | Scarf VTO |

### Perfect Corp APIs Used (12+)
**Skin Intelligence:**
- AI Skin Analysis — skin concerns, hydration, trajectory
- AI Facial Color Tones — undertone/depth for shade matching
- AI Face Attributes — face shape for accessory/style decisions
- AI Aging Simulation — skin trajectory visualization

**Beauty:**
- AI Makeup VTO — shade-matched makeup application
- AI Makeup Transfer — recreate any reference look
- AI Hair Style VTO — hairstyle changes
- AI Hair Color VTO — color changes

**Fashion:**
- AI Clothes VTO — outfit rendering

**Accessories:**
- AI Earrings VTO
- AI Necklace VTO
- AI Watch VTO
- AI Scarf VTO

**Enhancement:**
- AI Photo Enhance — clean selfie quality
- AI Photo Lighting — normalize lighting

### External APIs
| API | Role | Budget |
|---|---|---|
| Deepgram Voice Agent | Voice conversation (STT + TTS + LLM) | $200 credit |
| GPT-4o | Agent brain: context reasoning, API selection, style logic | ~$10 |
| Serper Google Shopping | Real product data when shopping IS needed | Free 2500/mo |
| Open-Meteo | Weather for context-aware recommendations | Free |
| (Google Calendar mock) | Calendar events for context | Mocked for demo |

---

## 7. Agent Architecture

### System Prompt (Core Logic)
```
You are Mirra, a personal appearance operator.

RULES:
1. OWNED-FIRST: Always check the user's closet before 
   recommending purchases. Shopping is the last resort.
2. CONTEXT-NATIVE: Use calendar, weather, occasion, mood, 
   and skin state to inform every recommendation.
3. ONE CONVERSATION: Never ask the user to navigate tabs. 
   You decide which tools to call.
4. MEMORY: Remember preferences, past outfits, skin history.
5. VISUAL-FIRST: Always SHOW, don't just describe. Render 
   looks using VTO tools.

TOOLS AVAILABLE:
- skin_analysis(selfie) → 14 skin concern scores
- facial_color_tones(selfie) → undertone, depth, overtone
- face_attributes(selfie) → face shape, proportions
- makeup_vto(selfie, products) → render makeup on face
- makeup_transfer(selfie, reference) → copy a look
- hair_style_vto(selfie, style) → change hairstyle
- hair_color_vto(selfie, color) → change hair color
- clothes_vto(selfie, garment) → render outfit
- earrings_vto(selfie, earrings) → render earrings
- necklace_vto(selfie, necklace) → render necklace
- watch_vto(selfie, watch) → render watch
- scarf_vto(selfie, scarf) → render scarf
- aging_simulation(selfie, years) → show future face
- search_products(query) → find real products via Serper
- generate_proof_card(look, scores) → approval receipt
- check_weather(location) → current conditions
- check_calendar() → today's events

BEHAVIOR:
- Start every session by scanning the user's face silently 
  (skin_analysis + facial_color_tones + face_attributes)
- Use these results to inform all subsequent recommendations
- When the user describes their day, orchestrate the full 
  look using multiple tools in sequence
- Show the complete look rendered on their face
- Only recommend purchases when the closet can't solve it
- Generate a Proof Card before any purchase
```

### Voice Flow (Deepgram)
```
User speaks → Deepgram STT → GPT-4o (agent brain) → 
  GPT-4o decides tools → calls Perfect Corp APIs → 
  renders result on frontend → 
  Deepgram TTS speaks response
```

**Choreography rule:** Voice speaks during static visual states. AR renders while voice pauses. They never collide.

---

## 8. Demo Script (90 Seconds)

### [0:00–0:08] Hook
> "Appearance is high-stakes, daily, and emotional. Most people waste time every morning deciding how to show up — and still get it wrong. Mirra fixes that in 90 seconds."

### [0:08–0:30] The Morning — Board Meeting
> User opens Mirra. Camera captures face. Mirra scans silently (2 sec).
> User: "I have a board meeting at 10 and a date tonight."
> Mirra: "72° in SF, dry. For the meeting — your navy blazer, minimal makeup, hair pulled back."
> [Clothes VTO + Makeup VTO + Hair Style VTO render simultaneously]
> Mirra: "You own everything for this look. Cost: $0."
> **[Judges see: owned-first. Not trying to sell.]**

### [0:30–0:50] Tonight — Date Night
> User: "And tonight? Go romantic."
> Mirra: "Soft smoky eye, berry lip, loose waves, gold earrings."
> [Full look re-renders: Makeup VTO + Hair Style VTO + Clothes VTO + Earrings VTO]
> Mirra: "You own the shoes and blazer. I found a dress and earrings — $127."
> **[Judges see: shops only for the gap.]**

### [0:50–1:05] Voice Customization + Proof
> User: "Show me budget earrings."
> [Earrings swap. $98 total now.]
> User: "Buy it."
> [Proof Card generates: match scores, items, owned vs. new, total]
> Mirra: "Approved and ready to checkout."
> **[Judges see: Proof Card = visual trust before money moves.]**

### [1:05–1:15] Skin Intelligence
> Mirra: "One more thing — your skin looks drier than last week. Weather's getting drier. I added a $16 HA serum. And here's your skin projection with vs. without SPF."
> [Aging Sim renders briefly]
> **[Judges see: 3 more APIs used organically, not as a feature list.]**

### [1:15–1:30] Close
> "Mirra. One conversation. No tabs. Owned-first. Visual-first. One operator that gets smarter every week."

---

## 9. Revenue Model

| Stream | How | When |
|---|---|---|
| **Consumer subscription** | $14.99/mo — unlimited conversations, closet, memory | Phase 1 |
| **Affiliate** | 8-15% on gap purchases (only what you DON'T own) | Phase 1 |
| **B2B white-label** | Retailers license Mirra's approval layer to add visual confidence before checkout | Phase 2 |

**Unit economics:** $14.99/mo sub + ~$5/mo affiliate = ~$240/user/year.
At scale, 1M subscribers would imply roughly **$240M ARR.**

---

## 10. The Startup Story (For Judges)

**Today:** Mirra — personal appearance operator. One conversation, owned-first, context-aware.

**The moat underneath:** Every interaction trains Mirra's model of you — your skin tone, face shape, closet, fit history, preferences. After 90 days, switching means losing all of that. The model improves every week.

**The expansion:** Mirra's visual approval layer becomes a B2B API that any AI shopping agent can call before checkout. Same engine, new buyer.

> "Appearance is high-stakes, daily, emotional, and expensive to get wrong. Mirra becomes the operator for that layer of life."

---

## 11. Architecture

```
┌─────────────────────────────────────────┐
│  USER: Camera + Mic + Screen             │
│  (Next.js PWA · JS Camera Kit)           │
└────────────────┬────────────────────────┘
                 │ WebSocket (voice) + REST (API)
┌────────────────▼────────────────────────┐
│  MIRRA AGENT (Backend)                   │
│  ┌──────────────────────────────────┐    │
│  │  GPT-4o (Agent Brain)            │    │
│  │  Context: calendar, weather,     │    │
│  │  closet, skin history, prefs     │    │
│  │  Decides: which tools to call    │    │
│  └──────────┬───────────────────────┘    │
│             │ tool calls                  │
│  ┌──────────▼───────────────────────┐    │
│  │  TOOL LAYER                      │    │
│  │  ┌────────┐ ┌────────┐ ┌──────┐  │    │
│  │  │Perfect │ │Deepgram│ │Serper│  │    │
│  │  │Corp    │ │Voice   │ │Shop  │  │    │
│  │  │12+ API │ │Agent   │ │Search│  │    │
│  │  └────────┘ └────────┘ └──────┘  │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │  BODY MODEL (Memory Layer)       │    │
│  │  Skin tone · Face shape · Closet │    │
│  │  Fit history · Preferences       │    │
│  │  Stored: IndexedDB (local)       │    │
│  └──────────────────────────────────┘    │
│  ┌──────────────────────────────────┐    │
│  │  PROOF CARD GENERATOR            │    │
│  │  Match scores + visual receipt   │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

---

## 12. Timeline (6 Days)

> A = Frontend · B = Backend

| Day | Person A | Person B |
|---|---|---|
| **1** | Next.js scaffold. Design system (dark, glass). Camera + conversation UI. Single-screen layout (no tabs!) | API mock layer: capture JSON from Playground. Express proxy. Test Deepgram WebSocket |
| **2** | Conversation interface (voice + text + visual response panel). Closet mock UI (pre-seeded 15 items) | Agent system prompt. GPT-4o function calling. Skin Analysis + Facial Color Tones + Face Attributes integration |
| **3** | VTO rendering panel (products on face). Side-by-side (owned vs. new). Proof Card UI component | Makeup VTO + Hair Style VTO + Clothes VTO integration. Owned-first recommendation logic |
| **4** | Voice flow polish (Deepgram UI: mic, waveform, transcript). Product cards. Proof Card generator | Voice Agent WebSocket. Tool-calling pipeline (agent → API → render). Accessories VTO (earrings, necklace) |
| **5** | Full demo flow polish. Animations. Loading states. Error handling. Shareable Proof Card | Serper integration. Live API testing (~200 units). Aging Simulation. Weather API |
| **6** | **BOTH:** Record demo (90 sec). Project page. Screenshots. QA. Submit |

---

## 13. Priority Tiers

**Tier 1 — MUST SHIP:**
- [ ] Single conversation interface (no tabs, no navigation)
- [ ] JS Camera Kit selfie capture
- [ ] Skin Analysis + Facial Color Tones + Face Attributes (auto-run on first scan)
- [ ] Makeup VTO + Clothes VTO (shade-adjusted)
- [ ] Deepgram voice (speak → agent responds → renders)
- [ ] Owned-first logic (mock closet with 15 pre-seeded items)
- [ ] Agent decides which APIs to call (GPT-4o function calling)
- [ ] Product cards with real prices for gap purchases
- [ ] Proof Card generation before checkout

**Tier 2 — SHOULD SHIP:**
- [ ] Hair Style + Hair Color VTO
- [ ] Earrings + Necklace VTO
- [ ] Voice customization ("swap earrings for gold")
- [ ] Calendar + Weather context integration
- [ ] Skin trajectory ("your skin looks drier than last week")
- [ ] Side-by-side: owned items vs. new items
- [ ] Shareable Proof Card

**Tier 3 — STRETCH:**
- [ ] Aging Simulation
- [ ] Watch + Scarf + Ring VTO
- [ ] Makeup Transfer (recreate any reference look)
- [ ] Closet photo upload (user adds real items)
- [ ] Proof history / lookbook
- [ ] Multiple-day planning ("your week's looks")

---

## 14. API Mocking Protocol

> [!CAUTION]
> 1000 units total. Mock EVERYTHING during development.

1. **Day 1:** Capture real JSON from each API in Playground → `mocks/*.json`
2. **Days 2-4:** `NODE_ENV=development` → backend returns mocks
3. **Day 5:** Live API testing (~200 units)
4. **Day 6:** Demo recording (~150 units, 3-4 takes)
5. **Buffer:** ~650 units remaining

---

## 15. Judge Q&A Prep

**"How is this different from Perfect Corp's AI Beauty Agent?"**
> "Their Beauty Agent is merchant-facing — it helps brands sell products. Mirra is user-facing — it starts with what you OWN and shops only when there's a gap. We're on the consumer's side, not the retailer's side."

**"How is this different from Google Wardrobe or Daydream?"**
> "Google Wardrobe catalogs your closet but doesn't do AR try-on or skin analysis. Daydream is a shopping agent — it helps you find things to buy. Mirra is an appearance operator — it optimizes how you show up, starting from what you already have. Shopping is the last resort, not the first action."

**"Why would people pay $15/month?"**
> "People already pay $39-79/year for Perfect Corp's YouCam apps, and those are just try-on tools. Mirra replaces a $200-500 personal stylist session with an AI that knows your face, skin, closet, and calendar. After 90 days of use, switching away means losing your entire style memory."

**"What's the moat?"**
> "Memory. After 90 days, Mirra knows your undertone, your preferred silhouettes, your skin trajectory, what you rejected, what you re-wore. That's a personal dataset that compounds. Nobody can replicate 90 days of your data."

**"What about privacy?"**
> "We minimize image retention, keep the body model user-controlled, and store personal appearance memory locally. For the prototype, all memory is local-first."

---

## 16. Technical Risk Analysis (Gemini's Structural Concerns)

### Concern 1: Serper-to-AR Disconnect — "Can you feed random product images into VTO?"

**Answer: Yes, for Clothes VTO. It accepts flat product photos.**

Research confirmed: Perfect Corp's Clothes VTO uses Generative AI to take a user photo + a flat-lay/product image and composites them — no 3D modeling or pre-mapped assets required. It works from standard JPEG/PNG product photos on white/clean backgrounds.

**However**, for the hackathon demo, we still use a **curated catalog of 20 pre-tested products** — not live Serper results. Why:
- Pre-tested images guarantee quality renders (no surprise failures during demo)
- Serper provides price/availability DATA; the VTO rendering uses our curated product images
- The demo script references specific products by name/price, so we know exactly what renders

**For the real product later:** We'd build an asset processing pipeline that validates/normalizes product images from Serper before feeding them to VTO (background removal, lighting normalization via Photo Enhance, resolution check).

### Concern 2: Closet Digitization — "Users won't photograph 100 items"

**Answer: Correct. For the demo, we pre-seed. For the real product, automated ingestion.**

**Demo (Day 1-6):** Pre-seeded closet with 15 items (photos + metadata). The "owned-first" logic works against this curated set. Users never photograph anything.

**Real product (Phase 2):** Three ingestion paths:
1. Gmail receipt scraping (Stitch Fix proved this works — detect purchase emails, pull product images)
2. Rapid closet video scan (AI identifies items from a 30-second pan of your closet)
3. Retailer purchase history API integrations (Shopify, Amazon, Nordstrom)

This is a known hard problem. We don't pretend it's solved — we show the value with pre-seeded data, and the ingestion pipeline is a Phase 2 build.

### Concern 3: VTO Stacking — "4 AR models running simultaneously will crash the browser"

**Answer: This concern misunderstands the architecture. The VTO APIs are server-side image processing, not client-side WebGL.**

How it actually works:
1. User selfie is captured ONCE via JS Camera Kit (client-side, lightweight)
2. Selfie is sent to backend
3. Backend calls Perfect Corp's REST APIs sequentially:
   - Clothes VTO (selfie + dress) → composited image 1
   - Pass composited image 1 to Makeup VTO → composited image 2
   - Pass composited image 2 to Hair Style VTO → composited image 3
   - Pass composited image 3 to Earrings VTO → final composited image
4. Final image is returned to frontend and displayed

There's no WebGL. No client-side AR rendering. No thermal throttling. The "stacking" happens server-side as sequential API calls. The browser displays a static result image.

**The real risk:** Latency from 4 sequential API calls (each ~2-5 seconds). Mitigation: parallelize independent calls (makeup + earrings can run in parallel if neither modifies the other's region), show progressive loading ("building your look..."), and during the demo, pre-warm the first call.

### Concern 4: Agent Routing Bottleneck — "12+ function signatures in one GPT-4o call"

**Answer: Valid concern. Mitigated by choreography + intent classifier.**

**For the demo:** The conversation is choreographed. We know exactly what the user will say, so the agent's routing is predictable. We can even hard-code the tool sequence for the demo path if needed.

**For robustness:** We add a lightweight intent classifier BEFORE the full GPT-4o call:
```
User input → classify intent (skin/styling/shopping/adjustment) → 
  route to domain-specific prompt with only relevant tools → 
  execute tools → return
```

This reduces the function set from 12+ to 3-4 per call, cutting latency and hallucination risk significantly.

**For the real product (Phase 2):** Multi-agent orchestration — a routing agent delegates to Skin Agent, Styling Agent, Shopping Agent, each with their own tool set and context window.

### Concern 5: "One Conversation, No Tabs" Fails on Discovery

**Answer: Partially valid. Solved with visual carousels within the conversation.**

"No tabs" doesn't mean "no visual output." It means no separate navigation screens. Within the conversation, Mirra presents:
- **Visual option cards** — "Here are 3 dress options" with thumbnail renders
- **Swipe/scroll carousel** — browse variations within the chat flow
- **Quick-action buttons** — "Gold earrings" / "Silver earrings" / "Show me more"

This is the same pattern as ChatGPT's image generation (shows multiple options inline) or Spotify's conversational recommendations (shows cards you can tap).

The conversation IS the browsing experience — it just presents visual options within the flow rather than dumping the user into a grid they have to navigate alone.

**For the demo:** The user says "show me budget earrings" → Mirra shows 2-3 options as visual cards → user picks one. That's discovery within conversation. No tabs needed.
