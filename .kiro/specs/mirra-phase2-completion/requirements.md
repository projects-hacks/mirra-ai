# Mirra Phase 2 Completion — Requirements

## Overview

Complete the remaining Phase 2 & 3 features to achieve a fully functional demo-ready Mirra application. This spec covers VTO result display, skin analysis UI, closet management, product shopping, proof card system, and the owned-first matching engine.

## Business Context

**Deadline**: May 7, 2026 @ 2:00pm PDT (Hackathon submission)
**Current State**: Phase 1 complete (infrastructure, auth, camera, voice), Phase 2 partially complete (API integration done, UI incomplete)
**Goal**: Ship Tier 1 "MUST SHIP" features from PRD to enable 90-second demo

## Core Requirements

### R1: VTO Result Display System
**Priority**: CRITICAL (blocks demo flow)

As a user, when the AI agent performs a virtual try-on (clothes, makeup, hair, accessories), I need to see the result rendered on my face with smooth animations so I can evaluate how the item looks on me.

**Acceptance Criteria**:
- VTO result images crossfade smoothly from selfie (300ms transition)
- Loading state shows shimmer/pulse animation with tool-specific text
- Before/after toggle allows comparison with original selfie
- Multiple VTO results can be stacked (e.g., dress + earrings + makeup)
- Result persists until next VTO or user resets
- Works on mobile Safari and Chrome

**Business Value**: Core product experience — without this, users can't see try-on results

---

### R2: Skin Analysis Modal
**Priority**: HIGH (differentiator vs competitors)

As a user, when the AI analyzes my skin, I need to see detailed scores and recommendations in a beautiful modal so I understand my skin health and what products might help.

**Acceptance Criteria**:
- Modal displays 12 skin concern scores (0-100 scale)
- Radial progress charts for visual clarity
- Color-coded scores: green (80-100), yellow (60-79), red (0-59)
- Skin age displayed prominently
- Recommendations based on lowest scores
- Trend comparison if previous scan exists ("moisture up 8% since last week")
- Dismissible with smooth slide-down animation

**Business Value**: Demonstrates AI intelligence layer, builds trust, justifies subscription

---

### R3: Owned-First Matching Engine
**Priority**: CRITICAL (core differentiator)

As the system, when a user describes their day/occasion, I need to match their closet items to the context (weather, event type, formality) before suggesting purchases so we deliver on the "owned-first" promise.

**Acceptance Criteria**:
- Matches closet items by: occasion tags, color, category, weather appropriateness
- Scores each item 0-100 based on context fit
- Returns top 3-5 matches per category (tops, bottoms, accessories)
- Identifies gaps (e.g., "no formal dress for wedding")
- Caches closet data per session (no repeated DB queries)
- Handles empty closet gracefully (suggests building closet first)

**Business Value**: Core differentiator vs shopping-first competitors, reduces user spend

---

### R4: Product Shopping Flow
**Priority**: HIGH (revenue driver)

As a user, when the AI identifies a gap in my closet, I need to see product recommendations with prices and images so I can purchase items that complete my look.

**Acceptance Criteria**:
- Product cards show: image, name, price, brand, rating (if available)
- Horizontal scrollable row (mobile) or grid (desktop)
- Click opens product link in new tab
- "Try On" button triggers VTO with product image
- Max 5 products per recommendation to avoid overwhelm
- Fallback to curated catalog if Serper fails

**Business Value**: Enables affiliate revenue, completes the owned-first → gap-fill flow

---

### R5: Proof Card System
**Priority**: HIGH (unique approval mechanism)

As a user, before I purchase recommended items, I need to see a visual "proof card" showing the complete look on my face with match scores so I can approve with confidence.

**Acceptance Criteria**:
- Displays VTO result image at top
- Shows 3 match scores: Tone Match (%), Style Fit (%), Skin Safe (✓/✗)
- Lists new items with prices
- Lists owned items from closet (marked "From Your Closet")
- Total new spend calculated
- Three actions: Approve, Adjust, Save
- Approve triggers checkout flow (Phase 3)
- Adjust allows swapping items
- Save bookmarks for later

**Business Value**: Reduces purchase anxiety, lowers return rates, builds trust

---

### R6: Closet Grid UI
**Priority**: MEDIUM (can demo with pre-seeded data)

As a user, I need to view and manage my closet items in a visual grid so I can see what I own and add new items.

**Acceptance Criteria**:
- Bento grid layout (2 cols mobile, 3-4 cols desktop)
- Each card shows: image, name, category, size
- Badge indicates "Owned" vs "Mirra Purchased"
- Filter by category (All, Tops, Bottoms, Accessories, Shoes)
- FAB (floating action button) to add new item
- Add flow: upload photo → AI extracts metadata → save to Supabase
- Empty state: "Build your closet to unlock owned-first recommendations"

**Business Value**: Enables closet management, increases engagement, supports owned-first logic

---

## Non-Functional Requirements

### NFR1: Performance
- VTO result display: <100ms after image URL received
- Skin analysis modal: <50ms to render
- Closet matching: <200ms for full context evaluation
- Product search: <2s end-to-end (Serper + render)
- Proof card generation: <500ms

### NFR2: Design Consistency
- Follow Lumina Ethos design system (light mode, Noto Serif + Inter, glassmorphism)
- All animations: 300ms ease-in-out
- Glass panels: `bg-white/70 backdrop-blur-2xl border border-white/50`
- Spacing: 4px grid (p-4 = 16px, p-6 = 24px)
- Rounded corners: minimum 24px (rounded-DEFAULT)

### NFR3: Code Quality
- SOLID principles: single responsibility, open/closed, dependency inversion
- DRY: extract reusable components (MatchScore, ProductCard, ClosetItemCard)
- Design patterns: Strategy (matching algorithms), Factory (card components), Observer (state updates)
- No verbose comments: code should be self-documenting
- Constants/enums for all magic strings and numbers
- TypeScript strict mode: no `any` types

### NFR4: Mobile-First
- All features work on iOS Safari and Android Chrome
- Touch-friendly: min 44px tap targets
- Responsive: mobile → tablet → desktop breakpoints
- PWA-ready: works offline with cached data

### NFR5: Accessibility
- WCAG 2.1 AA compliance
- Semantic HTML: proper heading hierarchy, ARIA labels
- Keyboard navigation: all interactive elements focusable
- Screen reader support: meaningful alt text, live regions for dynamic content
- Color contrast: minimum 4.5:1 for text

---

## Out of Scope (Phase 4+)

- Real-time closet photo upload (use pre-seeded data for demo)
- Multi-day outfit planning
- Social sharing of proof cards
- Purchase checkout integration (Stripe/PayPal)
- Push notifications for outfit reminders
- Outfit outcome tracking (wore/skipped/loved)
- Style drift detection
- Aging simulation UI

---

## Success Metrics

**Demo Readiness**:
- ✅ User can complete full flow: selfie → skin analysis → "what should I wear?" → VTO result → proof card → approve
- ✅ All Tier 1 features functional
- ✅ No console errors or broken UI states
- ✅ Works on mobile Safari (primary demo device)

**Technical Quality**:
- ✅ All TypeScript strict mode passing
- ✅ No ESLint errors
- ✅ All components follow design system
- ✅ State management clean (no prop drilling)

**Performance**:
- ✅ Lighthouse score: 90+ performance, 100 accessibility
- ✅ No layout shifts (CLS < 0.1)
- ✅ Fast interaction (FID < 100ms)

---

## Dependencies

**External**:
- Perfect Corp APIs (VTO, skin analysis) — already integrated
- Deepgram Voice Agent — already integrated
- Supabase (database, auth, storage) — already set up
- Serper API (product search) — needs integration

**Internal**:
- Frontend: Next.js 14, TypeScript, Tailwind CSS — scaffolded
- Backend: FastAPI, Python 3.12 — scaffolded
- State: React Context + useReducer — implemented
- Design system: Lumina Ethos — implemented

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| VTO API latency (8-15s) | User perceives app as slow | Progressive loading, agent talks while processing, show shimmer animation |
| Serper API rate limits | Product search fails | Fallback to curated catalog (20 pre-tested products) |
| Complex state management | Bugs, prop drilling | Strict TypeScript, discriminated unions, action creators |
| Mobile Safari quirks | Features break on iOS | Test on real device, use webkit prefixes, polyfills |
| Time constraint (4 days) | Incomplete features | Prioritize Tier 1, use mocks for Tier 2/3 |

---

## Assumptions

1. **Pre-seeded closet data**: Demo uses 15 pre-populated items (no user upload flow needed)
2. **Curated product catalog**: 20 pre-tested products with known-good VTO images
3. **Single user**: No multi-user session handling needed for demo
4. **Mock mode**: Development uses `USE_MOCKS=true` to preserve API units
5. **Desktop recording**: Demo video recorded on desktop, mobile tested but not primary

---

## References

- [PRD](../../../mirra_final_prd.md) — Product requirements
- [System Architecture](../../../docs/system-architecture.md) — Technical workflows
- [Implementation Plan](../../../docs/implementation-plan.md) — Day 1-2 details
- [Tasks](../../../docs/tasks.md) — Current task board
- [Design System](../../../stitch_mirra_ai_appearance_operator/lumina_ethos/DESIGN.md) — Lumina Ethos
- [Proof Card Reference](../../../stitch_mirra_ai_appearance_operator/the_proof_card/code.html) — UI pattern
- [Closet Reference](../../../stitch_mirra_ai_appearance_operator/digital_closet_inventory/code.html) — UI pattern
