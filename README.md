# Mirra — The Health App for How You Look

> AI appearance health platform that analyzes your skin, tracks your journey, manages your closet, and builds complete looks — starting from what you already own.

**Built for:** Perfect Corp × Startup World Cup Hackathon (May 7, 2026)

## Three Pillars

### 1. Skin Health
Analyze your skin (14 scores) → Track changes over time → Simulate improvement (before/after) → Get real product recommendations

### 2. Fashion
Manage your closet → Match outfits to occasions/weather → Try on via VTO → Fill gaps from online shopping

### 3. Proof Card
Before any purchase: visual receipt showing what's from your closet ($0), what's new, match scores, and total cost.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS (PWA) |
| Backend | FastAPI, Python 3.12 |
| Voice | Deepgram Voice Agent (Nova-3 STT → GPT-5-mini → Aura-2 TTS) |
| AI/AR | Perfect Corp APIs (9 endpoints) |
| Shopping | Serper (Google Shopping) |
| Database | Supabase (Postgres + Auth + Storage) |
| Context | Open-Meteo (weather) |

## Perfect Corp APIs Used

**Skin Intelligence:**
- AI Skin Analysis — 14 skin concern scores
- AI Skin Tone — Undertone, depth, hair/lip/eye colors
- AI Face Attributes — Face shape, proportions
- AI Skin Simulation — Before/after improvement visualization

**Virtual Try-On:**
- AI Clothes VTO — Outfit rendering
- AI Makeup VTO — Beauty application
- AI Earrings VTO — Earring rendering
- AI Necklace VTO — Necklace rendering
- AI Hairstyle VTO — Hair style change

## Quick Start

```bash
# Backend
cd mirra-ai/backend
cp .env.example .env  # Add API keys
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd mirra-ai/frontend
npm install
npm run dev
```

## Project Structure

```
mirra-ai/
├── frontend/          # Next.js 14 PWA
│   └── src/
│       ├── app/       # Pages (/, /closet, /skin-history)
│       ├── components/ # UI components
│       └── hooks/     # useVoiceAgent, useCamera, useAuth
├── backend/           # FastAPI
│   └── app/
│       ├── routers/   # voice.py (WS), closet.py, vto.py
│       ├── services/  # perfectcorp.py, tool_executor.py
│       ├── tools/     # skin_tools, fashion_tools, beauty_tools
│       └── core/      # config, constants, prompts
└── docs/              # PRD.md, TASKS.md
```

## Docs

- [PRD.md](docs/PRD.md) — Product requirements + API integration details
- [TASKS.md](docs/TASKS.md) — Task tracker with completion status
