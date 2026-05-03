# Mirra — The Health App for How You Look

> Your skin. Your closet. Your style. Tracked for life.

Apple Health tracks your body. **Mirra tracks your appearance.** Skin scores, closet inventory, style memory — one lifetime record that gets smarter every day.

## What Mirra Does

**Day 1:** Scan your face → get skin report → build your first look
**Week 2:** Upload your closet → "You already own 80% of what you need"
**Month 1:** Skin trend line → "Your acne is down 15% since switching products"
**Month 3:** Seasonal shift → "Fall colors suit you better — updated palette"
**Year 1:** "You saved $2,400 by buying 40% fewer clothes you actually wore"

## How It Works

```
You talk to Mirra → Mirra sees your face → checks your closet → reads your calendar
     → builds the right look → shows you wearing it → tracks what worked
```

- **Voice-first:** Talk, don't tap. Mirra handles the rest.
- **Feature Discovery:** Visual menu shows all 13 features — tap any button or use voice.
- **Owned-first:** Your closet before any store.
- **Visual proof:** See yourself in it before you buy.
- **Memory:** Every scan, every outfit, every outcome — remembered forever.

## Architecture
```
Next.js 14 + TypeScript + Tailwind (Vercel)
  ↕
FastAPI + Python 3.12 (Linode K8s via GitHub Actions)
  ↕
Deepgram Voice Agent (STT + Gemini 3.1 Pro + TTS)
Perfect Corp APIs (Skin Analysis + Virtual Try-On)
Supabase (Postgres + Auth + Storage)
Google Calendar API
```

## Quick Start

### Frontend
```bash
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

### Backend
```bash
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && cp .env.example .env && uvicorn app.main:app --reload --port 8000
```

## Docs
| Doc | Purpose |
|---|---|
| [system-architecture.md](docs/system-architecture.md) | System design, workflows, scalability |
| [api-contract.md](docs/api-contract.md) | Frontend ↔ Backend API reference |
| [deployment.md](docs/deployment.md) | Deployment guide (Vercel + Linode K8s) |
| [feedback-loops.md](docs/feedback-loops.md) | How Mirra learns over time |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Code standards (TypeScript, React, SOLID) |
| [system-prompt.md](agent/system-prompt.md) | Mirra's AI agent configuration |
| [technical-plan.md](agent/technical-plan.md) | Implementation details |
| [mirra_final_prd.md](mirra_final_prd.md) | Product requirements document |

