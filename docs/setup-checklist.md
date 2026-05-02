# Mirra — Manual Setup Checklist

Run these steps once after merging `feat/backend-day1-day2`.

---

## 1. Redis (Required)

```bash
# Option A: Docker (recommended)
docker run -d --name mirra-redis -p 6379:6379 redis:7-alpine

# Option B: Homebrew
brew install redis && brew services start redis
```

**Verify:** `redis-cli ping` → should return `PONG`

---

## 2. Supabase (Required)

### Create Project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. New project → name: `mirra` → region: US West
3. Copy **Project URL** and **anon/service key**

### Run Schema
1. Go to **SQL Editor** in Supabase dashboard
2. Paste contents of `backend/supabase/schema.sql` → Run
3. Paste contents of `backend/supabase/seed.sql` → Run

> **Note:** seed.sql uses a hardcoded UUID for the demo user. For production, users are auto-created via the `on_auth_user_created` trigger when they sign up through Supabase Auth.

### Enable Auth Provider
1. Go to **Authentication → Providers**
2. Enable **Google** → add OAuth Client ID + Secret from Google Cloud Console
3. Set redirect URL: `http://localhost:3000/auth/callback`

---

## 3. Backend Dependencies (Required)

```bash
cd backend
source venv/bin/activate  # or create: python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

This installs the new `redis[hiredis]` package.

---

## 4. Environment Variables (Required)

```bash
cd backend
cp .env.example .env
```

Then fill in `.env`:
```
PERFECT_CORP_API_KEY=<from Perfect Corp dashboard>
DEEPGRAM_API_KEY=<from Deepgram console>
GOOGLE_AI_STUDIO_KEY=<from Google AI Studio>
SERPER_API_KEY=<from serper.dev>
SUPABASE_URL=<from step 2>
SUPABASE_KEY=<service role key from step 2>
REDIS_URL=redis://localhost:6379/0
GOOGLE_CALENDAR_CREDENTIALS=
USE_MOCKS=true
PORT=8000
CORS_ORIGIN=http://localhost:3000
```

---

## 5. Verify Everything Works

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Then hit: `http://localhost:8000/health`

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "mocks": true,
  "redis": "connected"
}
```

If `redis: "disconnected"` → Redis isn't running. Go back to step 1.

---

## 6. Capture Real Mock Data (Before Demo Day)

This is B4 — replace placeholder JSONs with real Perfect Corp API responses:

1. Go to [Perfect Corp API Playground](https://developers.perfectcorp.com/)
2. Upload a test selfie
3. Run each API and copy the **full JSON response**:

| API | Save to |
|---|---|
| Skin Analysis | `backend/mocks/skin-analysis.json` |
| Facial Color Tones | `backend/mocks/skin-tone.json` |
| Face Attributes | `backend/mocks/face-attributes.json` |
| Clothes VTO | `backend/mocks/clothes-vto.json` |
| Makeup VTO | `backend/mocks/makeup-vto.json` |
| Hair Style VTO | `backend/mocks/hairstyle.json` |
| Earrings VTO | `backend/mocks/earrings-vto.json` |
| Necklace VTO | `backend/mocks/necklace-vto.json` |

**Do NOT do this yet** — wait until integration testing day (Day 5). Each call costs 1 API unit.

---

## 7. Google Calendar OAuth (Optional — can skip for demo)

If you want real calendar integration instead of mock events:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 Client ID (Desktop type)
3. Run the one-time auth flow:

```bash
cd backend
python -c "
from google_auth_oauthlib.flow import InstalledAppFlow
flow = InstalledAppFlow.from_client_secrets_file('client_secret.json', ['https://www.googleapis.com/auth/calendar.readonly'])
creds = flow.run_local_server(port=0)
print(creds.to_json())
"
```

4. Copy the JSON output → paste as `GOOGLE_CALENDAR_CREDENTIALS` in `.env`

---

## Summary

| Step | Time | Blocking? |
|---|---|---|
| Redis | 30 sec | Yes — backend won't start without it |
| Supabase project + schema | 5 min | Yes — closet/profile queries fail |
| pip install | 30 sec | Yes — missing redis package |
| .env setup | 2 min | Yes — all API keys needed |
| Health check | 10 sec | Verification |
| Mock data capture | 15 min | No — current placeholders work |
| Google Calendar OAuth | 5 min | No — falls back to mock events |
