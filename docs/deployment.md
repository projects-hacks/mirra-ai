# Mirra — Production Deployment Guide

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Vercel     │ ──── │    Railway        │ ──── │  Supabase    │
│  (Frontend)  │ WSS  │  (Backend + Redis)│  SQL │  (Postgres)  │
│  Next.js     │      │  FastAPI          │      │  Auth/Storage│
└─────────────┘      └──────────────────┘      └─────────────┘
```

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel | `https://mirra.vercel.app` |
| Backend | Railway | `https://mirra-backend-production.up.railway.app` |
| Database | Supabase | `https://cemeenqljfaujlbgerys.supabase.co` |
| Redis | Railway (addon) | Auto-injected as `REDIS_URL` |

---

## Railway Setup (One-time, ~10 minutes)

### Step 1: Create Project

1. Go to [railway.app](https://railway.app) → sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `projects-hacks/mirra-ai`
4. Railway will detect the `Dockerfile` in `backend/`

### Step 2: Configure the Service

1. Click on the service → **Settings** tab
2. Set **Root Directory**: `backend`
3. Set **Watch Paths**: `backend/**`
4. Custom Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`

### Step 3: Add Redis

1. In your project → click **"+ New"** → **"Database"** → **"Add Redis"**
2. Railway auto-injects `REDIS_URL` into your backend service — no config needed

### Step 4: Add Environment Variables

Click on backend service → **Variables** tab → **"Raw Editor"** → paste:

```
PERFECT_CORP_API_KEY=your-key
DEEPGRAM_API_KEY=your-key
GOOGLE_AI_STUDIO_KEY=your-key
SERPER_API_KEY=your-key
SUPABASE_URL=https://cemeenqljfaujlbgerys.supabase.co
SUPABASE_KEY=your-service-role-jwt
DATABASE_URL=your-database-url
GOOGLE_CALENDAR_CREDENTIALS=
USE_MOCKS=false
CORS_ORIGIN=https://mirra.vercel.app
```

> **Note:** `REDIS_URL` and `PORT` are auto-injected by Railway. Don't set them manually.

### Step 5: Deploy

Click **"Deploy"** or push to `main` branch. Railway builds and deploys automatically.

### Step 6: Get Your URL

After deployment, go to **Settings** → **Networking** → **Generate Domain**

Your backend will be at: `https://your-service.up.railway.app`

### Step 7: Verify

```bash
curl https://your-service.up.railway.app/health
# {"status":"ok","version":"1.0.0","mocks":false,"redis":"connected"}
```

---

## CI/CD Setup (Optional — Railway auto-deploys from GitHub)

Railway has **built-in GitHub integration** — every push to `main` auto-deploys. No CI/CD needed unless you want lint checks before deploy.

To add lint checks:

1. Go to GitHub repo → **Settings → Secrets → Actions**
2. Add secret: `RAILWAY_TOKEN`
   - Get it from: Railway dashboard → Account Settings → Tokens → Create Token
3. The workflow at `.github/workflows/deploy-backend.yml` will:
   - Run `ruff` lint on every push
   - Deploy to Railway only if lint passes

---

## Rollback

Railway keeps deployment history:

1. Go to your service → **Deployments** tab
2. Click on any previous deployment → **"Rollback"**

---

## Monitoring

- **Logs:** Railway dashboard → your service → **Logs** tab (real-time)
- **Metrics:** Railway dashboard → **Metrics** tab (CPU, memory, network)
- **Health:** `curl https://your-service.up.railway.app/health`

---

## Cost

| Resource | Railway Free Tier | Monthly Cost |
|---|---|---|
| Backend service | $5 credit/mo | ~$0 (low traffic) |
| Redis | Included in credit | ~$0 |
| Vercel (frontend) | Free hobby tier | $0 |
| Supabase | Free tier (500MB) | $0 |

**Total for hackathon/demo: $0**

---

## Frontend (Vercel) — Separate Deployment

1. Go to [vercel.com](https://vercel.com) → import `projects-hacks/mirra-ai`
2. Set **Root Directory**: `frontend`
3. Set **Framework Preset**: Next.js
4. Add env vars:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://cemeenqljfaujlbgerys.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=https://your-service.up.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-service.up.railway.app
   ```
5. Deploy. Every push to `main` (frontend changes) auto-deploys.
