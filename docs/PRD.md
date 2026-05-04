# Mirra — Product Requirements Document
### *The Health App for How You Look*

> **Hackathon:** Perfect Corp × Startup World Cup  
> **Deadline:** May 7, 2026 @ 2:00 PM PDT  
> **Judging Criteria:** Perfect Corp API Usage + Consumer/Retail Value  
> **Submission:** Project page + screenshots + 1-3 min demo video  
> **Last Updated:** May 4, 2026

---

## 1. What Mirra Is

> Mirra is an AI-powered appearance health platform. It analyzes your skin, tracks your skin journey over time, manages your closet, and builds complete looks — all through one voice conversation.

**Think:** Apple Health for your body → **Mirra for how you look.**

Most try-on apps are product catalogs with AR on top. Mirra is fundamentally different:
- It **starts with your skin health**, not products
- It **uses what you already own** before suggesting purchases
- It **shows you the path** — "here's what your skin looks like now, here's what it could look like with treatment"

---

## 2. The Three Pillars

### Pillar 1: SKIN HEALTH (Analyze → Track → Improve → Visualize)

This is the **core differentiator** and the deepest Perfect Corp API integration.

| Step | What Happens | Perfect Corp API |
|------|-------------|-----------------|
| **Analyze** | Selfie → 14 skin concern scores (moisture, acne, wrinkle, pore, texture, oiliness, etc.) + skin age | `skin-analysis` |
| **Understand** | Detect undertone, depth, hair/lip/eye colors for shade matching | `skin-tone-analysis` |
| **Track** | Store scores in Supabase → trend line over weeks/months ("your acne improved 15%") | Our logic (Supabase) |
| **Recommend** | AI suggests products based on skin concerns ("your moisture score is low → try HA serum") | `search_products` (Serper) |
| **Simulate** | Show before/after: "This is what your skin could look like with consistent treatment" | `skin-simulation` ⭐ NEW |

**The Skin Simulation API** (`POST /s2s/v2.0/task/skin-simulation`) is the killer feature:
- Takes a selfie + intensity values (0.0-1.0) for 10 skin concerns
- Returns a **composited "after" image** showing what the user's skin would look like after improvement
- Concerns: `wrinkle`, `radiance`, `acne`, `pores`, `texture`, `dark_circle`, `redness`, `oiliness`, `eye_bags`, `spots`
- **User sees:** "Here's your face now. Here's your face after 3 months of consistent skincare."

**User Flow:**
```
User opens Mirra → Camera captures selfie
→ Skin Analysis runs (2-3 sec) → "Your moisture is 48/100, acne 88/100"
→ "Your skin is a bit drier than last week. Want to see improvement options?"
→ Skin Simulation shows before/after ("here's you with hydrated skin")
→ Serper finds real HA Serum for $16
→ Proof Card: "The Ordinary HA Serum — $16 — targets your #1 concern (moisture)"
```

### Pillar 2: FASHION (Closet → Match → Try-On → Shop Gaps)

| Step | What Happens | API/Logic |
|------|-------------|-----------|
| **Inventory** | User's closet stored in Supabase with images, categories, colors | Supabase + Gemini metadata extraction |
| **Match** | Given occasion + weather + calendar → rank closet items by fit | Our matching engine |
| **Visualize** | Show the user wearing the outfit via VTO | Perfect Corp `cloth-v3` |
| **Fill Gaps** | If closet can't cover the occasion, search for products | Serper Google Shopping |
| **Try-On** | Show user wearing the new product before buying | Perfect Corp `cloth-v3` |

**User Flow:**
```
User: "I have a board meeting at 10"
→ Check weather (72°F, dry)
→ Match closet → Navy blazer (92% match), white shirt (88%)
→ Clothes VTO renders user wearing blazer
→ "You own everything. Cost: $0."

User: "And a date tonight"
→ Match closet → Gap: no dress for romantic occasion
→ Serper finds dress options
→ Clothes VTO renders each option on user
→ Earrings VTO adds accessories
→ Proof Card with owned vs new items
```

### Pillar 3: PROOF CARD (Transparency Before Purchase)

The Proof Card is Mirra's "approval moment" — it exists so the user **never spends money blindly**.

```
┌─────────────────────────────────────┐
│  ✓ PROOF CARD                       │
│                                      │
│  [VTO image of user in full look]   │
│                                      │
│  "Date Night — Romantic"             │
│                                      │
│  Tone Match:   █████████░ 97%        │
│  Style Fit:    ████████░░ 94%        │
│  Skin Safe:    ✓ No conflicts        │
│                                      │
│  From Your Closet ($0):              │
│  · Navy blazer                       │
│  · Sam Edelman heels                 │
│                                      │
│  New Items:                          │
│  · Reformation Midi Dress    $98     │
│  · Mejuri Gold Drop Hoops    $29     │
│  · The Ordinary HA Serum     $16     │
│  ─────────────────────────────       │
│  Total new spend:            $143    │
│                                      │
│  [Approve] [Adjust] [Save]           │
└─────────────────────────────────────┘
```

---

## 3. Complete User Journey (One Session)

```
Open App → Camera activates → Selfie captured silently

→ Skin Analysis (14 scores + skin age)

User speaks or taps feature:

  "How's my skin?"
    → Show skin scores + trend vs last scan
    → Skin Simulation: before/after visualization
    → Recommend products (Serper)
    → Proof Card for skincare purchase

  "I have an event"
    → Check weather + calendar
    → Match closet items
    → Gaps? No → Clothes VTO → "Cost: $0"
    → Gaps? Yes → Search products (Serper) → Clothes VTO → Proof Card

  "Try on makeup"
    → Makeup VTO (shade-matched to skin tone)

  "Change my hair"
    → Hair Style VTO

  "Show me earrings"
    → Earrings VTO
```

---

## 4. Perfect Corp API Integration (Hackathon Requirement)

### APIs We Use — With Exact Endpoints

| # | API | Endpoint | Type | What It Does | Backend File |
|---|-----|----------|------|-------------|--------------|
| 1 | **AI Skin Analysis** | `skin-analysis` | JSON | 14 skin scores + skin_age | `tools/skin_tools.py` |
| 2 | **AI Skin Tone** | `skin-tone-analysis` | JSON | Undertone, depth, hair/lip/eye colors | `tools/skin_tools.py` |
| 3 | **AI Face Attributes** | `face-attr-analysis` | JSON | Face shape, eye shape, proportions | `tools/skin_tools.py` |
| 4 | **AI Skin Simulation** | `skin-simulation` | Image | Before/after improvement visualization | **NEW — needs implementation** |
| 5 | **AI Clothes VTO** | `cloth-v3` | Image | Selfie + garment → composited outfit | `tools/fashion_tools.py` |
| 6 | **AI Makeup VTO** | `2d-vto/makeup` | Image | Selfie + effects JSON → makeup | `tools/beauty_tools.py` |
| 7 | **AI Earrings VTO** | `2d-vto/earring` | Image | Selfie + earring → composited | `tools/accessory_tools.py` |
| 8 | **AI Necklace VTO** | `2d-vto/necklace` | Image | Selfie + necklace → composited | `tools/accessory_tools.py` |
| 9 | **AI Hairstyle** | `hair-transfer` | Image | Selfie + ref hair → new style | `tools/hair_tools.py` |

### Skin Simulation API Contract (New)
```
POST /s2s/v2.0/file/skin-simulation       → upload selfie, get file_id
PUT  {upload_url}                           → upload binary
POST /s2s/v2.0/task/skin-simulation        → create task
  Body: {
    "src_file_id": "...",
    "wrinkle": 0.7,       // 0.0 = no change, 1.0 = max improvement
    "acne": 0.8,
    "pores": 0.5,
    "texture": 0.6,
    "dark_circle": 0.4,
    "redness": 0.3,
    "oiliness": 0.5,
    "eye_bags": 0.3,
    "spots": 0.4,
    "radiance": 0.7
  }
GET  /s2s/v2.0/task/skin-simulation/{id}   → poll → result image URL
```

### Universal API Flow (All APIs)
```
1. POST /s2s/v2.0/file/{task-type}     → get upload URL + file_id
2. PUT  {upload_url}                    → upload image binary
3. POST /s2s/v2.0/task/{task-type}      → start task, get task_id
4. GET  /s2s/v2.0/task/{task-type}/{id} → poll until success/error
5. Response: result image URL (24hr) or JSON scores
```

### API Budget
- **Total:** 1000 units (hackathon code `Pegasus1000`)
- **1 unit = 1 successful API task**
- **Strategy:** Mock during dev → live for testing + demo recording

---

## 5. External APIs

| API | Purpose | Status |
|-----|---------|--------|
| **Deepgram Voice Agent** | STT (Nova-3) + Think (GPT-5-mini) + TTS (Aura-2) | ✅ Working |
| **Gemini 2.5 Flash** | AI metadata extraction from closet photos | ✅ Working |
| **Serper** | Google Shopping search with real prices | ✅ Wired |
| **Open-Meteo** | Weather for context-aware recommendations | ✅ Wired |
| **Supabase** | Postgres + Auth + Storage | ✅ Working |

---

## 6. Architecture

```
FRONTEND (Next.js 14 + TypeScript + Tailwind)
  Camera Mirror (native getUserMedia)
  Voice Orb (tap-to-talk → WebSocket audio)
  Agent Overlay (cards, VTO results, proofs)
  Closet Page (/closet — grid + upload)
  Skin History (/skin-history — trends)
  PWA · Vercel
         │ WebSocket (voice) + REST (API)
         ▼
BACKEND (FastAPI · Python 3.12)
  Deepgram Voice Agent WS Proxy
    STT: Nova-3 → Think: GPT-5-mini → TTS: Aura-2-Thalia
    → Intercepts FunctionCallRequest
         │ tool_executor.py
         ▼
  TOOL LAYER (14 tools)
    SKIN:     analyze_skin, analyze_skin_tone, analyze_face, simulate_skin
    FASHION:  try_on_clothes, match_closet
    BEAUTY:   try_on_makeup, change_hairstyle
    ACCESS:   try_on_earrings, try_on_necklace
    CONTEXT:  check_weather, check_calendar
    SHOP:     search_products, generate_proof_card

  SUPABASE (Postgres)
    closet_items · body_model · skin_scans
    proof_cards · profiles · outfit_history
```

---

## 7. Why the Camera Feed Exists

The camera is **the core interaction surface**, not a gimmick:

1. **Selfie for skin analysis** — All skin/face APIs require a photo
2. **Canvas for VTO** — Try-on results overlay on camera layer
3. **Canvas for Skin Simulation** — Before/after comparison on the user's face
4. **Mirror metaphor** — User talks to their reflection

Without camera → no selfie → no Perfect Corp API calls → no product.

---

## 8. Demo Script (90 seconds)

### [0:00-0:08] Hook
> "Your appearance is the first thing people see. Mirra is the health app for how you look."

### [0:08-0:30] Skin Health
> Camera opens. Mirra scans silently (2s).
> "Your moisture is at 48 — down 12% from last week."
> [Skin scores animate on screen]
> "Want to see what consistent hydration could do?"
> [Skin Simulation: before/after comparison]
> "I found a $16 HA serum that targets your #1 concern."
> **[Judges see: 3 Perfect Corp APIs — Skin Analysis + Skin Tone + Skin Simulation]**

### [0:30-0:55] Fashion — Board Meeting
> User: "I have a board meeting at 10."
> "72° in SF. Your navy blazer works. Minimal makeup."
> [Clothes VTO + Makeup VTO render]
> "Everything from your closet. Cost: $0."
> **[Judges see: owned-first]**

### [0:55-1:15] Date Night + Proof
> "And tonight? Go romantic."
> [Dress VTO + Earrings VTO + Makeup re-render]
> "You own the shoes. Dress and earrings — $127."
> [Proof Card with match scores]
> **[Judges see: Proof Card = transparency]**

### [1:15-1:30] Close
> "Mirra. Your skin health. Your closet. Your stylist. One conversation."

---

## 9. Core Rules

| Rule | What It Means |
|------|--------------|
| **Health-First** | Start with skin analysis — products solve problems, not impulse buys |
| **Owned-First** | Always check closet before suggesting purchases |
| **Visual-First** | Show, don't describe — VTO, skin simulation, proof cards |
| **One Conversation** | No tabs, no menus — AI decides which tools to call |

---

## 10. What We Cut (Scope Discipline)

| Feature | Why Cut |
|---------|---------|
| Google Calendar OAuth | Complex; hardcode events for demo |
| Onboarding flow | Skip; straight to camera |
| Style Profiles page | Violates "one conversation" |
| Aging Simulation | Not core value |
| Watch/Ring/Bracelet VTO | API units; earrings + necklace sufficient |
| PWA offline mode | Not visible in demo |
| Look Diary / History | Nice-to-have, not core |
