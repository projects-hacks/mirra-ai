# Mirra — Product Requirements Document v2
### *Your AI Appearance Operator*

> **Hackathon:** Perfect Corp × Startup World Cup  
> **Deadline:** May 7, 2026 @ 2:00 PM PDT  
> **Judging:** Perfect Corp API Usage + Consumer/Retail Value  
> **Submission:** Project page + screenshots + 1-3 min demo video  
> **Updated:** May 5, 2026 — **PIVOT: Tap-driven guided experience (voice removed from critical path)**

---

## 1. What Mirra Is

> Mirra is an AI-powered appearance & lifestyle platform. It analyzes your skin, tracks your skin journey, recommends products, builds outfits from your closet, and lets you virtually try on anything — all powered by **agentic AI** that makes smart decisions from your data.

**Think:** Apple Health for your body → **Mirra for how you look.**

**What makes it "agentic":**
- You take ONE selfie → AI runs skin analysis + face attributes + skin tone in parallel
- AI auto-generates skincare suggestions based on your worst scores
- AI auto-matches your closet to occasions + weather without you asking
- AI fills wardrobe gaps with real shoppable products
- AI shows you exactly what you'll look like BEFORE you spend money

**NOT a chatbot. NOT a try-on catalog. It's an autonomous appearance advisor.**

---

## 2. The Five Features

### Feature 1: SKIN HEALTH (Analyze → Track → Simulate → Shop)

| Step | What Happens | Perfect Corp API |
|------|-------------|-----------------|
| **Analyze** | Selfie → 14 skin scores + skin age | `skin-analysis` |
| **Understand** | Undertone, depth, hair/lip/eye colors | `skin-tone-analysis` |
| **Track** | Trend line over weeks: "acne improved 15%" | Supabase |
| **Simulate** | Before/after: "your skin with treatment" | `skin-simulation` ⭐ |
| **Shop** | AI recommends products for your worst scores | Serper |

**User flow:** Open Skin tab → see scores → tap "See improvement" → before/after slider → tap concern → see recommended product with real price.

### Feature 2: GLOWUP STUDIO (AI Makeover)

| Step | What Happens | API |
|------|-------------|-----|
| **Face Analysis** | Detect face shape, proportions | `face-attr-analysis` |
| **Makeup** | AI-recommended makeup (shade-matched) | `2d-vto/makeup` |
| **Hair** | Try celebrity hairstyles | `hair-transfer` |
| **Accessories** | Earrings + necklace matched to face | `2d-vto/earring`, `2d-vto/necklace` |

**User flow:** Tap "GlowUp" → AI suggests looks based on face shape + skin tone → apply step by step → compare before/after.

### Feature 3: CLOSET & OUTFIT BUILDER

| Step | What Happens | API/Logic |
|------|-------------|-----------|
| **Inventory** | Upload photos → AI extracts metadata | Gemini 2.5 Flash |
| **Match** | Pick occasion → AI ranks closet items | Matching engine |
| **Try-On** | VTO: see yourself wearing the outfit | `cloth-v3` |
| **Fill Gaps** | Closet can't cover it? Shop real products | Serper |

**User flow:** Pick occasion → see matched items → tap "Try On" → VTO renders on selfie → gaps found → shop → try on new items too.

### Feature 4: VIRTUAL TRY-ON STUDIO

Direct access to all VTO capabilities:
- **Clothes** → upload any garment image or tap a product
- **Makeup** → lip, eye, blush, foundation (shade-matched)
- **Hair** → transfer from reference images
- **Earrings / Necklace** → from product images

### Feature 5: PROOF CARD (Transparency Before Purchase)

```
┌─────────────────────────────────────┐
│  ✓ PROOF CARD                       │
│  [VTO image of full look]           │
│                                     │
│  Tone Match:   █████████░ 97%       │
│  Style Fit:    ████████░░ 94%       │
│  Skin Safe:    ✓ No conflicts       │
│                                     │
│  From Closet ($0):  Navy blazer     │
│  New: Dress $98 · Earrings $29      │
│  Total new spend:          $127     │
│                                     │
│  [Approve] [Adjust] [Save]          │
└─────────────────────────────────────┘
```

---

## 3. App Structure (Pages)

```
/                   → Landing + Selfie Capture (Camera Kit)
/dashboard          → Home: Skin overview + Quick actions
/skin               → Skin analysis scores + trend charts + simulation
/skin/history       → Full scan timeline with comparisons
/glowup             → AI Makeover Studio
/closet             → Wardrobe inventory + upload
/outfit             → Occasion matcher + outfit builder
/try-on             → Direct VTO studio (clothes/makeup/hair/accessories)
/products/:id       → Product detail + try-on CTA
```

---

## 4. Perfect Corp API Usage (9/9)

Implementation source of truth: [`docs/PERFECT_CORP_API_SOURCE_OF_TRUTH.md`](./PERFECT_CORP_API_SOURCE_OF_TRUTH.md)

| # | API | Where Used | Demo Moment |
|---|-----|-----------|-------------|
| 1 | `skin-analysis` | Skin tab — 14 scores + skin age | "Your moisture is 48/100" |
| 2 | `skin-tone-analysis` | Skin tab — undertone/depth | "Warm undertone, medium depth" |
| 3 | `face-attr-analysis` | GlowUp — face shape for recs | "Oval face — these earrings work" |
| 4 | `skin-simulation` | Skin tab — before/after slider | "Here's you after 3 months" ⭐ |
| 5 | `cloth-v3` | Outfit builder + try-on studio | VTO: user wearing the dress |
| 6 | `2d-vto/makeup` | GlowUp studio | Shade-matched lip + eye |
| 7 | `2d-vto/earring` | GlowUp + accessories | Gold drops for oval face |
| 8 | `2d-vto/necklace` | GlowUp + accessories | Pendant matched to neckline |
| 9 | `hair-transfer` | GlowUp studio | Celebrity hairstyle transfer |

---

## 5. "Agentic AI" — The Core Differentiator

**Perfect Corp APIs = the EYES.** They see skin scores, face shapes, try-on images.  
**Our Gemini Agent = the BRAIN.** It connects the dots, reasons, and explains.  
**The UI shows BOTH** — raw results AND the AI's thinking process.

### What the User Sees (Visible Agent Reasoning)

```
🔍 Mirra is analyzing...
  ✓ Skin scan complete — 14 concerns scored
  ✓ Pulled today's weather: SF, 72°F, 32% humidity
  ✓ Compared to your last scan (Apr 28)

💡 "Your moisture dropped 12 points this week. Today's low
   humidity (32%) is making it worse. Good news — acne improved
   8%, your cleanser is working."

🎯 Recommendations:
  1. HA Serum ($16) — targets your #1 concern
  2. SPF 50 — UV index is 7 today

🔮 "Want to see what consistent hydration could do?"
  → [Simulate Improvement]
```

The AI's reasoning trace is **rendered in real-time** — the user watches the agent think, call tools, and connect data points. This is what makes it "agentic" vs a static dashboard.

### Agentic Behaviors

| Behavior | What the Agent Does | What the User Sees |
|----------|--------------------|--------------------|
| **Cross-data insight** | Connects skin scores + weather + history | "Moisture dropped because humidity is low today" |
| **Auto-derive intensity** | Worst scores → simulation intensity | "Simulating maximum improvement for your top 3 concerns" |
| **Smart product search** | Maps concern to ingredient | "Searching for hyaluronic acid serums..." |
| **Closet gap detection** | Matches closet → finds missing pieces | "You don't own a formal dress — here are 3 options" |
| **Shade matching** | Skin tone → makeup palette | "Based on your warm undertone, these lip shades work" |
| **Face-shape recs** | Oval face → earring style | "Oval faces look great with drop earrings" |
| **Weather-aware advice** | UV/humidity → product suggestion | "High UV today — adding SPF to your routine" |

---

## 6. Tech Stack

```
FRONTEND (Next.js 14 + TypeScript + Tailwind)
  Camera Kit (Perfect Corp JS SDK — quality-gated selfies)
  Pages: Dashboard, Skin, GlowUp, Closet, Outfit, Try-On
  Components: SkinAnalysisCard, SkinSimulationCard, ProofCard, ItemCardRow
  PWA · Vercel
         │ REST API calls
         ▼
BACKEND (FastAPI · Python 3.12)
  REST Endpoints (replacing WebSocket voice pipeline)
    POST /api/skin/analyze     → skin_tools.analyze_skin
    POST /api/skin/simulate    → skin_tools.simulate_skin
    POST /api/vto/clothes      → fashion_tools.try_on_clothes
    POST /api/vto/makeup       → beauty_tools.try_on_makeup
    POST /api/vto/earrings     → accessory_tools.try_on_earrings
    POST /api/vto/necklace     → accessory_tools.try_on_necklace
    POST /api/vto/hair         → hair_tools.change_hairstyle
    POST /api/glowup           → orchestrate face analysis + recs
    POST /api/outfit/match     → matching_engine.match_items
    GET  /api/products/search  → serper.search
    POST /api/proof-card       → proof_card_generator.generate
         │
         ▼
  PERFECT CORP (9 APIs) · SERPER · OPEN-METEO · GEMINI
         │
         ▼
  SUPABASE (Postgres + Auth + Storage)
    closet_items · body_model · skin_scans
    proof_cards · profiles · skin_simulations
```

---

## 7. Demo Script (90 seconds)

### [0:00–0:08] Hook
> "Your appearance is the first thing people see. Mirra is the AI that manages it."

### [0:08–0:30] Skin Health
> Open app → Selfie captured → Skin analysis runs instantly
> Dashboard shows: 14 scores, skin age, trend chart
> Tap "See improvement" → Skin simulation before/after slider
> "HA Serum — $16 — targets your #1 concern"
> **[3 APIs: skin-analysis + skin-tone + skin-simulation]**

### [0:30–0:50] GlowUp
> Tap "GlowUp" → AI detects oval face, warm undertone
> "Try this look" → Makeup applied (shade-matched)
> Hairstyle transferred from reference
> Earrings + necklace added
> **[4 APIs: face-attr + makeup VTO + hair + earrings]**

### [0:50–1:10] Outfit Builder
> Tap "What should I wear?" → Select "Board Meeting"
> AI matches closet → Navy blazer, white shirt ranked
> Clothes VTO → User sees the outfit on themselves
> "Everything from your closet. $0."
> **[1 API: clothes VTO + matching engine]**

### [1:10–1:25] Proof Card
> Gap detected: no formal dress for date night
> AI finds 3 options → VTO try-on
> Proof Card: owned ($0) + new ($127) + match scores
> **[Proof Card + Serper]**

### [1:25–1:30] Close
> "Mirra. 9 Perfect Corp APIs. One intelligent experience."

**Total APIs shown: 9/9 ✓**

---

## 8. Core Design Principles

| Principle | Meaning |
|-----------|---------|
| **Health-First** | Start with skin analysis — products solve problems |
| **Owned-First** | Check closet before shopping |
| **Visual-First** | Show, don't tell — VTO, simulation, proof cards |
| **AI-Decided** | The AI makes connections between data points |
| **One-Tap** | Every feature accessible in ≤ 2 taps |

---

## 9. What We Cut

| Feature | Why |
|---------|-----|
| Voice pipeline (Deepgram) | Fragile in demo, replaced by tap UI |
| Google Calendar OAuth | Hardcode events for demo |
| PWA offline mode | Not visible in demo |
| Watch/Ring/Bracelet VTO | API units; earrings + necklace sufficient |
