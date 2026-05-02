# Mirra — Feedback Loops & Learning Architecture

How Mirra gets smarter over time. Every interaction generates signals. Signals compound into understanding. Understanding compounds into trust.

## The Six Feedback Loops

### 1. Skin Trend Loop
```
Scan face → store scores → compare to history → detect trend → adjust advice
```

| Signal | When | What Mirra Learns |
|---|---|---|
| Skin scan scores | Every session | Baseline + trajectory |
| Score delta | Scan vs. 7/30/90 day avg | "Your moisture dropped 12% this month" |
| Product correlation | After product recommendation | "Since you started X, acne score improved 18%" |
| Seasonal pattern | Same month, prior year | "Your skin gets drier every November" |

**Supabase schema:**
```sql
create table skin_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  scores jsonb not null,          -- { moisture: 70, acne: 88, wrinkle: 60, ... }
  skin_age int,
  scan_context text,              -- 'morning', 'post-workout', 'evening'
  created_at timestamptz default now()
);

-- Indexed for trend queries
create index idx_skin_scans_user_date on skin_scans(user_id, created_at desc);
```

**AI context injection:**
```
"User's skin trend (last 30 days): moisture ↓12%, acne stable, pores ↑5%.
Last scan was 3 days ago. Recommend hydrating products."
```

---

### 2. Outfit Outcome Loop
```
Mirra suggests look → user wears it (or not) → next-day check-in → signal stored
```

| Signal | Source | Value |
|---|---|---|
| **Approved** | User taps "Wear this" on Proof Card | Positive |
| **Rejected** | User says "try something else" | Negative + reason captured |
| **Re-worn** | Same items appear in future look | Strong positive |
| **Returned** | User marks item as returned | Strong negative |
| **Compliment** | User tells Mirra "I got compliments" | Strongest positive |

**Supabase schema:**
```sql
create table outfit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  proof_card_id uuid references proof_cards(id),
  occasion text,
  weather jsonb,
  items jsonb,                    -- [{ id, name, owned, category }]
  outcome text default 'pending', -- 'wore', 'skipped', 'returned', 'loved'
  feedback text,                  -- free-text from user
  compliments boolean default false,
  created_at timestamptz default now()
);
```

**Follow-up prompt (next day, via notification):**
> "Hey! How did last night's look go? Did you end up wearing the sage dress?"

---

### 3. Style Drift Loop
```
Track color/cut/brand preferences over time → detect style evolution
```

Mirra doesn't ask "what's your style?" — it **observes** your style.

| What's Tracked | How |
|---|---|
| Color frequency | Which colors appear most in approved looks |
| Category ratio | Dresses vs. pants vs. skirts over time |
| Brand affinity | Which brands get re-worn vs. returned |
| Formality spectrum | Casual → business → formal distribution |
| Accessory patterns | Always earrings? Never hats? Watches? |

**Computed weekly:**
```sql
create table style_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  period text,                    -- '2026-W18', '2026-Q1', '2026'
  top_colors text[],              -- ['sage green', 'navy', 'cream']
  top_categories text[],
  top_brands text[],
  formality_avg float,            -- 0.0 (casual) to 1.0 (formal)
  accessory_prefs jsonb,
  computed_at timestamptz default now()
);
```

**AI context injection:**
```
"User style profile: gravitates toward earth tones (sage, navy, cream).
Prefers midi dresses and blazers. Always wears gold earrings. Rarely wears hats.
Style has shifted warmer (+15%) over the last 3 months."
```

---

### 4. Closet Intelligence Loop
```
Track utilization → surface underused items → suggest donation/sale
```

| Metric | Meaning |
|---|---|
| Times worn / months owned | Utilization rate |
| Last worn date | Staleness |
| Cost per wear | ROI |
| Occasion coverage | Gaps in wardrobe |

**Mirra can say:**
- "You haven't worn your red blazer in 4 months. Want to build a look around it?"
- "Your cost-per-wear on the Reformation dress is $12. That's your best investment."
- "You don't own anything for formal events. That's your biggest gap."

---

### 5. Purchase Feedback Loop
```
Mirra recommends → user buys → tracks wear count → learns what was worth it
```

| Signal | Timeframe | What It Means |
|---|---|---|
| Bought + wore 5x in first month | 30 days | Great recommendation |
| Bought + never wore | 60 days | Bad recommendation — adjust model |
| Bought + returned | 14 days | Wrong fit/color — adjust preferences |
| Browsed + didn't buy | Immediate | Too expensive or not right |

**This creates Mirra's "recommendation score" over time.** We can show users:
> "Mirra's picks: 87% wear rate. Your own shopping: 52% wear rate."

---

### 6. Context Correlation Loop
```
Track which looks work for which contexts → predict future needs
```

| Context | Signals |
|---|---|
| Weather | Temp + humidity at time of outfit approval |
| Calendar event type | Meeting, date, casual, wedding |
| Day of week | Weekday vs. weekend patterns |
| Season | Spring/summer/fall/winter preferences |
| Mood | Captured from voice tone or explicit input |

Over time, Mirra builds a **context → outfit mapping** that's personalized:
> "Board meetings: you always go navy blazer + gold earrings + matte lip. Should I build that again?"

---

## How Context Gets Injected into AI

Every conversation, Mirra's system prompt gets augmented with user context:

```python
def build_user_context(user_id: str) -> str:
    skin = get_latest_skin_scan(user_id)
    skin_trend = get_skin_trend(user_id, days=30)
    style = get_style_profile(user_id)
    closet_stats = get_closet_stats(user_id)
    recent_outfits = get_recent_outfits(user_id, limit=5)
    calendar = get_todays_events(user_id)
    weather = get_weather(user_id)

    return f"""
USER CONTEXT (injected every conversation):

Skin: {skin.scores}. Trend: {skin_trend}.
Style: Top colors {style.top_colors}. Formality avg: {style.formality_avg}.
Closet: {closet_stats.total_items} items. Gap: {closet_stats.biggest_gap}.
Recent: Last 5 looks — {recent_outfits}.
Today: {calendar.events}. Weather: {weather.temp_f}°F, {weather.condition}.
"""
```

This gets prepended to the system prompt via Deepgram's `UpdatePrompt` message at session start.

---

## Data Retention & Privacy

| Data | Storage | Retention |
|---|---|---|
| Selfie images | Supabase Storage (encrypted) | User-controlled, delete anytime |
| Skin scores | Supabase Postgres | Lifetime (for trends) |
| Outfit logs | Supabase Postgres | Lifetime |
| Style profile | Computed, not raw | Recomputed weekly |
| Voice transcripts | Not stored | Session only, discarded |
| VTO result images | Supabase Storage | 90 days, then archived |

**Privacy principle:** Mirra stores scores and metadata, not raw images (except user-uploaded closet photos). Voice is never stored.

---

## Notification Strategy (Post-Hackathon)

| Trigger | Notification | Loop It Feeds |
|---|---|---|
| Morning, calendar has events | "You've got a board meeting at 2pm. Want me to build a look?" | Context |
| 24 hours after approved look | "How'd yesterday's look go?" | Outcome |
| Item not worn in 90 days | "Your red blazer misses you. Build a look?" | Closet |
| Skin score changed significantly | "Your skin's looking better! Moisture up 8%." | Skin Trend |
| Season change | "Fall is here. Let's update your palette." | Style Drift |
| Purchase anniversary | "That Reformation dress — $9/wear after 11 wears. Best buy." | Purchase |
