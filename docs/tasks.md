# Mirra — Task Board

Pick a task, move it to `[/]`, create a branch, and go.

## Day 1 — Foundation

### Frontend
- [ ] **F1: Scaffold Next.js 14 PWA** — Init project, add manifest.json, service worker, viewport meta for mobile
- [ ] **F2: Design system CSS** — Dark mode, glassmorphism, gradients, typography (Inter font), CSS variables
- [ ] **F3: Single-screen layout** — Camera panel (left/top) + Conversation panel (right/bottom), responsive
- [ ] **F4: Camera capture hook** — `useCamera.js` — request camera, capture selfie as base64, preview

### Backend
- [x] **B1: Scaffold FastAPI project** — Project structure, config, CORS, health endpoint
- [x] **B2: Perfect Corp API client** — `services/perfectcorp.py` — upload→task→poll→result pattern
- [x] **B3: Mock interceptor** — `core/mock_interceptor.py` — switch between mock/live responses
- [/] **B4: Capture mock data** — Placeholder JSONs created. Replace with real Playground captures.

### Infra
- [x] **I1: Supabase setup** — Schema SQL + seed data + Auth + RLS policies + triggers
- [x] **I2: Environment files** — `.env.example` for frontend and backend (with REDIS_URL)

---

## Day 2 — Intelligence

### Frontend
- [ ] **F5: Conversation panel** — Message list (user/agent bubbles), auto-scroll, typing indicator
- [ ] **F6: Voice button** — Mic capture via Web Audio API, send PCM over WebSocket, waveform animation
- [ ] **F7: Visual panel** — Display selfie, swap to VTO result with fade animation

### Backend
- [x] **B5: Deepgram Voice Agent WS route** — `/ws/voice` — proxy to Deepgram, intercept FunctionCallRequest
- [x] **B6: Gemini 3.1 Pro settings** — Build settings JSON with system prompt + function definitions
- [x] **B7: Skin Analysis integration** — `tools/skin_tools.py` — analyze_skin, skin_tone, face_attributes
- [x] **B8: Google Calendar integration** — `services/calendar.py` — OAuth2, get today's events, Redis cached

---

## Day 3 — Try-On

### Frontend
- [ ] **F8: VTO result display** — Image swap with smooth animation, before/after toggle
- [ ] **F9: Product cards** — Card component for new items (image, name, price, brand)
- [ ] **F10: Closet items UI** — Grid of owned items from Supabase, "From your closet" section

### Backend
- [ ] **B9: Clothes VTO** — `tools/fashion_tools.py` — selfie + garment image → composited result
- [ ] **B10: Makeup VTO** — `tools/beauty_tools.py` — selfie + makeup pattern → composited result
- [ ] **B11: Hair Style VTO** — `tools/hair_tools.py` — selfie + style template → result
- [ ] **B12: Owned-first engine** — Match closet items to context (occasion, weather, color)

---

## Day 4 — Commerce

### Frontend
- [ ] **F11: Proof Card component** — Visual receipt with scores (Tone Match, Style Fit, Skin Safe)
- [ ] **F12: Loading states** — "Scanning your skin...", "Building your look...", progressive reveal
- [ ] **F13: Audio playback** — Play TTS audio chunks from Deepgram, handle barge-in

### Backend
- [ ] **B13: Earrings VTO** — `tools/accessory_tools.py` — selfie + earring image → result
- [ ] **B14: Product search** — `services/serper.py` — Google Shopping via Serper API
- [ ] **B15: Weather API** — `services/weather.py` — Open-Meteo current conditions
- [ ] **B16: Proof Card generator** — Compose scores + items into proof card data

---

## Day 5 — Polish & Deploy

### Frontend
- [ ] **F14: Animations** — Fade, slide, glow transitions. Micro-interactions on buttons
- [ ] **F15: Error handling** — Network errors, API failures, graceful degradation
- [ ] **F16: PWA setup** — manifest.json, icons, "Add to Home Screen" prompt
- [ ] **F17: Deploy to Vercel** — Environment variables, domain setup

### Backend
- [ ] **B17: Live API testing** — Switch to `USE_MOCKS=false`, test each tool (~200 units)
- [ ] **B18: Docker build** — Dockerfile, test locally
- [ ] **B19: K8s deployment** — Apply deployment.yaml, service.yaml, ingress.yaml to Linode
- [ ] **B20: SSL + domain** — cert-manager, DNS for mirra-api.yourdomain.com

---

## Day 6 — Demo & Submit

- [ ] **D1: Record demo video** — 90 seconds, 3-4 takes (~150 API units)
- [ ] **D2: Devpost project page** — Description, screenshots, tech stack, team
- [ ] **D3: Final testing** — Full flow on mobile browser (PWA)
- [ ] **D4: Submit** — Before deadline

---

## Task Assignment Format
When you pick a task, update it like this:
```
- [/] **F1: Scaffold Next.js 14 PWA** — @yourname — branch: feat/scaffold-nextjs
```
When done:
```
- [x] **F1: Scaffold Next.js 14 PWA** — @yourname — PR #12
```
