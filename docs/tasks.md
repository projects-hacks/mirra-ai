# Mirra — Task Board

Pick a task, move it to `[/]`, create a branch, and go.

## Phase 1 — Foundation (✅ Complete)

### Frontend
- [x] **F1: Scaffold Next.js 14 PWA** — Init project, manifest, viewport meta — PR #4
- [x] **F2: Design system CSS (Lumina Ethos)** — Light mode, Noto Serif + Inter, glassmorphism, animations — PR #4
- [x] **F3: Single-screen overlay layout** — Z-indexed layers: Camera → UI → Agent → Modals — PR #4
- [x] **F4: Camera capture hook** — `useCamera.ts` — front camera, mirrored JPEG, stream stays open — PR #4
- [x] **F5: Voice agent hook** — `useVoiceAgent.ts` — WebSocket + AudioWorklet, exponential backoff, 10s timeout — PR #4
- [x] **F6: Voice Orb** — Pulsating mic button with connecting/listening/thinking/error states — PR #4
- [x] **F7: Agent overlay** — Glassmorphic floating cards, horizontal product row — PR #4
- [x] **F8: Status bar** — Branding, auth state, connection indicator — PR #4
- [x] **F9: State management** — Context + useReducer, discriminated union actions, zero prop drilling — PR #4
- [x] **F10: Supabase Auth** — Google OAuth + email, callback handler with error display — PR #4
- [x] **F11: Closet hook** — `useCloset.ts` — Supabase CRUD for closet items — PR #4
- [x] **F12: API client** — `api.ts` — typed fetch wrapper (JSON + file upload) — PR #4
- [x] **F13: Constants + Types** — `constants.ts` mirrors backend, `types/index.ts` discriminated unions — PR #4

### Backend
- [x] **B1: Scaffold FastAPI project** — Project structure, config, CORS, health endpoint
- [x] **B2: Perfect Corp API client** — `services/perfectcorp.py` — upload→task→poll→result
- [x] **B3: Mock interceptor** — `core/mock_interceptor.py` — switch mock/live responses
- [x] **B4: Deepgram Voice Agent WS route** — `/ws/voice` — proxy to Deepgram
- [x] **B5: Gemini settings** — System prompt + function definitions
- [x] **B6: Skin Analysis integration** — `tools/skin_tools.py`
- [x] **B7: Google Calendar integration** — `services/calendar.py` — OAuth2, Redis cached

### Infra
- [x] **I1: Supabase setup** — Schema + Auth + RLS + triggers (handle_new_user → profiles + preferences)
- [x] **I2: Environment files** — `.env.example` for frontend and backend
- [x] **I3: DigitalOcean deployment** — Backend auto-deploys on merge to main
- [x] **I4: Vercel deployment** — Frontend auto-deploys on merge to main

---

## Phase 2 — Intelligence & VTO (Next)

### Frontend
- [ ] **F14: VTO result display** — Image swap with smooth animation, before/after toggle in CameraLayer
- [ ] **F15: Skin analysis modal** — Layer 4 modal with scores, recommendations, radial chart
- [ ] **F16: Product cards** — Styled cards for shopping results (image, name, price, brand)
- [ ] **F17: Closet grid UI** — "From your closet" section with owned items
- [ ] **F18: Proof Card component** — Visual receipt with Tone Match, Style Fit, Skin Safe scores
- [ ] **F19: Loading states** — "Scanning your skin...", "Building your look...", progressive reveal

### Backend
- [ ] **B8: Clothes VTO** — `tools/fashion_tools.py` — selfie + garment → composited result
- [ ] **B9: Makeup VTO** — `tools/beauty_tools.py` — selfie + makeup → composited result
- [ ] **B10: Hair Style VTO** — `tools/hair_tools.py` — selfie + style → result
- [ ] **B11: Earrings VTO** — `tools/accessory_tools.py` — selfie + earring → result
- [ ] **B12: Owned-first engine** — Match closet items to context (occasion, weather, color)

---

## Phase 3 — Commerce & Polish

### Frontend
- [ ] **F20: Animations polish** — Micro-interactions, smooth layer transitions
- [ ] **F21: Error handling** — Network errors, API failures, graceful degradation
- [ ] **F22: PWA icons** — Add manifest.json back with proper icon assets

### Backend
- [ ] **B13: Product search** — `services/serper.py` — Google Shopping via Serper API
- [ ] **B14: Weather API** — `services/weather.py` — Open-Meteo current conditions
- [ ] **B15: Proof Card generator** — Compose scores + items into proof card data
- [ ] **B16: Live API testing** — `USE_MOCKS=false`, test each tool

---

## Phase 4 — Demo & Submit

- [ ] **D1: Record demo video** — 90 seconds, 3-4 takes
- [ ] **D2: Devpost project page** — Description, screenshots, tech stack
- [ ] **D3: Final testing** — Full flow on mobile browser (PWA)
- [ ] **D4: Submit** — Before May 7 deadline

---

## Task Assignment Format
When you pick a task:
```
- [/] **F14: VTO result display** — @yourname — branch: feat/vto-display
```
When done:
```
- [x] **F14: VTO result display** — @yourname — PR #5
```
