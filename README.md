# Mirra — AI Appearance Operator

> Your closet. Your skin. Your context. One operator.

## Quick Start

### Frontend (Next.js 14 + TypeScript + Tailwind CSS → Vercel)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev  # http://localhost:3000
```

### Backend (FastAPI + Python 3.12 → Linode K8s)
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Architecture
```
Next.js 14 (Vercel) ←→ FastAPI (Linode K8s) ←→ Deepgram Voice Agent
                                              ←→ Perfect Corp REST APIs
                                              ←→ Google Calendar
                                              ←→ Supabase (Postgres)
```

- **Voice:** Deepgram Voice Agent (STT nova-3 + Gemini 3.1 Pro + TTS aura-2)
- **VTO:** Perfect Corp REST APIs (async task pattern)
- **Data:** Supabase (Postgres + Auth + Storage)
- **PWA:** Installable on mobile, full camera/mic access

## Docs
| Doc | Purpose |
|---|---|
| [technical-plan.md](agent/technical-plan.md) | Architecture, deployment, timeline |
| [system-prompt.md](agent/system-prompt.md) | Mirra's AI brain |
| [perfect-corp-api-reference.md](agent/perfect-corp-api-reference.md) | Perfect Corp API cheatsheet |
| [deepgram-voice-agent-reference.md](agent/deepgram-voice-agent-reference.md) | Deepgram integration |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Code standards (TS, Tailwind, SOLID) |
| [tasks.md](docs/tasks.md) | Task board |
| [api-contract.md](docs/api-contract.md) | Frontend ↔ Backend API contract |
| [mirra_final_prd.md](mirra_final_prd.md) | Product requirements |
