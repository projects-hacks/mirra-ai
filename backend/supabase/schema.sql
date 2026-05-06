-- Mirra Supabase Schema (with Auth + Profile + User Preferences)
-- Uses Supabase Auth — auth.users is the identity source
-- Our tables reference auth.uid() via user_id

-- ============================================================
-- USERS & PROFILE
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  location text default 'San Francisco',
  timezone text default 'America/Los_Angeles',
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  -- Budget
  budget_min float default 0,
  budget_max float default 500,
  currency text default 'USD',
  -- Style
  style_preference text default 'balanced', -- 'casual', 'formal', 'balanced', 'edgy'
  favorite_brands text[] default '{}',
  avoided_brands text[] default '{}',
  favorite_colors text[] default '{}',
  avoided_colors text[] default '{}',
  -- Size
  size_top text,          -- 'XS','S','M','L','XL'
  size_bottom text,
  size_dress text,
  size_shoes text,
  -- Skin
  known_allergies text[] default '{}',
  skin_type text,         -- 'oily','dry','combination','normal','sensitive'
  skin_concerns text[] default '{}', -- ['acne','wrinkles','dark_circles']
  language text default 'en',
  notifications_enabled boolean default true,
  -- Privacy
  store_selfies boolean default true,
  data_retention_days int default 365,
  -- Calendar
  google_calendar_token jsonb,
  calendar_connected boolean default false,
  updated_at timestamptz default now()
);

-- ============================================================
-- BODY MODEL (latest snapshot of user's appearance profile)
-- ============================================================

create table body_model (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  skin_scores jsonb,
  skin_tone jsonb,         -- { undertone, depth, hex, color_season }
  face_shape jsonb,        -- { shape, symmetry_score, proportions }
  color_palette jsonb,     -- { best_colors: [], avoid_colors: [] }
  preferences jsonb default '{}',
  updated_at timestamptz default now()
);

-- ============================================================
-- SKIN SCANS (time-series for trend tracking)
-- ============================================================

create table skin_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  scores jsonb not null,
  skin_age int,
  scan_context text,       -- 'morning', 'afternoon', 'evening', 'night'
  location_at_scan text,   -- actual location where scan happened (detected from IP)
  weather_at_scan jsonb,   -- snapshot of weather when scanned
  selfie_url text,         -- URL to selfie in Supabase Storage for before/after comparisons
  created_at timestamptz default now()
);
create index idx_skin_scans_user_date on skin_scans(user_id, created_at desc);

-- ============================================================
-- CLOSET (user's wardrobe)
-- ============================================================

create table closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  category text not null,  -- 'jacket','dress','top','bottom','shoes','accessory'
  subcategory text,        -- 'blazer','midi_dress','sneakers'
  color text,
  color_hex text,          -- for matching algorithms
  brand text,
  price float,
  purchase_date date,
  image_url text,
  occasions text[] default '{}',
  seasons text[] default '{}',  -- 'spring','summer','fall','winter'
  formality float default 0.5,  -- 0.0=casual, 1.0=formal
  last_worn timestamptz,
  times_worn int default 0,
  is_favorite boolean default false,
  is_archived boolean default false,
  notes text,
  created_at timestamptz default now()
);
create index idx_closet_user on closet_items(user_id);
create index idx_closet_category on closet_items(user_id, category);

-- ============================================================
-- PROOF CARDS (approval receipts → become look diary)
-- ============================================================

create table proof_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  look_name text,
  occasion text,
  tone_match float,
  style_fit float,
  skin_safe boolean,
  owned_items jsonb default '[]',
  new_items jsonb default '[]',
  total_cost float default 0,
  approved boolean default false,
  result_image_url text,
  weather jsonb,
  calendar_event text,
  created_at timestamptz default now()
);
create index idx_proof_cards_user on proof_cards(user_id, created_at desc);

-- ============================================================
-- OUTFIT LOGS (outcome tracking → feedback loop)
-- ============================================================

create table outfit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  proof_card_id uuid references proof_cards(id) on delete set null,
  occasion text,
  weather jsonb,
  items jsonb default '[]',
  outcome text default 'pending', -- 'wore','skipped','returned','loved'
  rating int,                     -- 1-5 stars
  feedback text,
  compliments boolean default false,
  photos text[] default '{}',     -- user-uploaded outfit photos
  created_at timestamptz default now()
);
create index idx_outfit_logs_user on outfit_logs(user_id, created_at desc);

-- ============================================================
-- STYLE PROFILE (computed weekly from outfit_logs + closet)
-- ============================================================

create table style_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  period text not null,           -- '2026-W18', '2026-Q1', '2026'
  top_colors text[] default '{}',
  top_categories text[] default '{}',
  top_brands text[] default '{}',
  formality_avg float default 0.5,
  accessory_prefs jsonb default '{}',
  outfit_success_rate float,      -- % of 'wore'+'loved' outcomes
  avg_cost_per_wear float,
  computed_at timestamptz default now()
);
create index idx_style_profile_user on style_profile(user_id, period);

-- ============================================================
-- PRODUCT RECOMMENDATIONS (track what Mirra suggested)
-- ============================================================

create table product_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_name text,
  product_url text,
  product_image text,
  price float,
  source text,            -- 'serper', 'catalog', 'affiliate'
  recommended_for text,   -- occasion or reason
  action text default 'suggested', -- 'suggested','clicked','purchased','returned'
  created_at timestamptz default now()
);
create index idx_recommendations_user on product_recommendations(user_id, created_at desc);

-- ============================================================
-- SESSIONS (conversation history)
-- ============================================================

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  conversation jsonb default '[]',
  selfie_url text,
  tools_called text[] default '{}',
  duration_seconds int,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (users can only access their own data)
-- ============================================================

alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table body_model enable row level security;
alter table skin_scans enable row level security;
alter table closet_items enable row level security;
alter table proof_cards enable row level security;
alter table outfit_logs enable row level security;
alter table style_profile enable row level security;
alter table product_recommendations enable row level security;
alter table sessions enable row level security;

-- Policy: users can only read/write their own rows
create policy "Users read own data" on profiles for select using (auth.uid() = id);
create policy "Users update own data" on profiles for update using (auth.uid() = id);

create policy "Users read own prefs" on user_preferences for select using (auth.uid() = user_id);
create policy "Users write own prefs" on user_preferences for all using (auth.uid() = user_id);

create policy "Users own body_model" on body_model for all using (auth.uid() = user_id);
create policy "Users own skin_scans" on skin_scans for all using (auth.uid() = user_id);
create policy "Users own closet" on closet_items for all using (auth.uid() = user_id);
create policy "Users own proof_cards" on proof_cards for all using (auth.uid() = user_id);
create policy "Users own outfit_logs" on outfit_logs for all using (auth.uid() = user_id);
create policy "Users own style_profile" on style_profile for all using (auth.uid() = user_id);
create policy "Users own recommendations" on product_recommendations for all using (auth.uid() = user_id);
create policy "Users own sessions" on sessions for all using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS (auto-update timestamps)
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger preferences_updated_at before update on user_preferences
  for each row execute function update_updated_at();

create trigger body_model_updated_at before update on body_model
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);

  insert into user_preferences (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
