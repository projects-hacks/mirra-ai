# Mirra — Production Deployment Guide

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Vercel     │ ──── │   DigitalOcean   │ ──── │  Supabase    │
│  (Frontend)  │ WSS  │  App Platform    │  SQL │  (Postgres)  │
│  Next.js     │      │  FastAPI         │      │  Auth/Storage│
└─────────────┘      └────────┬─────────┘      └─────────────┘
                              │
                     ┌────────▼─────────┐
                     │    Upstash       │
                     │    (Redis)       │
                     └──────────────────┘
```

| Component | Platform | Cost |
|---|---|---|
| Frontend | Vercel (free hobby) | $0 |
| Backend | DigitalOcean App Platform | ~$5/mo |
| Database | Supabase (free tier) | $0 |
| Cache | Upstash Redis (free tier) | $0 |

---

## Backend — DigitalOcean App Platform

### Setup (already done)

1. Connected GitHub repo `projects-hacks/mirra-ai`
2. Branch: `main`, Source directory: `backend`
3. Builder: Dockerfile
4. Instance: Shared CPU, 512MB, 1 container

### Environment Variables

Set via DO dashboard → App → Settings → Environment Variables:

| Key | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://cemeenqljfaujlbgerys.supabase.co` | |
| `SUPABASE_KEY` | `eyJ...service_role JWT` | Service role, NOT anon |
| `DATABASE_URL` | `postgresql://postgres:...` | |
| `REDIS_URL` | `rediss://default:...@musical-tadpole-113690.upstash.io:6379` | Note: `rediss://` (TLS) |
| `DEEPGRAM_API_KEY` | Your key | |
| `SERPER_API_KEY` | Your key | |
| `PERFECT_CORP_API_KEY` | Your key | |
| `GOOGLE_AI_STUDIO_KEY` | Your key | |
| `USE_MOCKS` | `true` → `false` when ready | |
| `CORS_ORIGIN` | `https://mirra-ai-ten.vercel.app` | |

> `PORT` is auto-injected by DigitalOcean (default: 8080).

### Auto-Deploy

DigitalOcean watches `main` branch. Every push to `main` (backend/ changes) triggers a new build + deploy automatically.

### Verify

```bash
curl https://<your-app>.ondigitalocean.app/health
# {"status":"ok","version":"1.0.0","mocks":true,"redis":"connected"}
```

---

## Cache — Upstash Redis

### Setup (already done)

1. Created at [upstash.com](https://upstash.com) (GitHub login)
2. Free tier: 10K commands/day, 256MB storage
3. Region: US East
4. Connection: `rediss://` (TLS required)

### Limits (free tier)

| Metric | Limit |
|---|---|
| Commands/day | 10,000 |
| Storage | 256 MB |
| Connections | 1,000 concurrent |

For demo/hackathon usage, this is more than enough.

---

## Frontend — Vercel

### Setup (already done)

1. Connected at [vercel.com](https://vercel.com)
2. URL: `https://mirra-ai-ten.vercel.app`
3. Root directory: `frontend`

### Environment Variables (Vercel dashboard)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cemeenqljfaujlbgerys.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...anon JWT` |
| `NEXT_PUBLIC_API_URL` | `https://<your-app>.ondigitalocean.app` |
| `NEXT_PUBLIC_WS_URL` | `wss://<your-app>.ondigitalocean.app` |

---

## CI/CD Flow

```
Push to main
  │
  ├─ GitHub Actions: ruff lint check (quality gate)
  │
  ├─ DigitalOcean: auto-build Docker → deploy backend
  │
  └─ Vercel: auto-build Next.js → deploy frontend
```

---

## Rollback

**DigitalOcean:** App → Activity → click any previous deployment → "Rollback"

**Vercel:** Deployments tab → click previous → "Promote to Production"

---

## Monitoring

- **Backend logs:** DO dashboard → App → Runtime Logs
- **Redis metrics:** Upstash dashboard → your database → Metrics
- **Database:** Supabase dashboard → SQL Editor / Logs
- **Health:** `curl https://<your-app>.ondigitalocean.app/health`
