-- Mirra Seed Data — Demo User + 15 Closet Items
-- Run AFTER schema.sql
-- Uses Supabase auth.users → triggers auto-create of profiles + user_preferences

with demo as (
  select
    '00000000-0000-0000-0000-000000000001'::uuid as user_id,
    'demo@mirra.ai'::text as email,
    '{"display_name": "Demo User"}'::jsonb as meta,
    '00000000-0000-0000-0000-000000000000'::uuid as instance_id,
    'authenticated'::text as auth_role
)
insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
select user_id, email, meta, now(), now(), instance_id, auth_role, auth_role
from demo
on conflict (id) do nothing;

-- Step 2: Update profile with display name + location
with demo as (
  select '00000000-0000-0000-0000-000000000001'::uuid as user_id
)
update profiles set
  display_name = 'Demo User',
  location = 'San Francisco',
  onboarded = true
where id = (select user_id from demo);

-- Step 3: Seed body model
with demo as (
  select '00000000-0000-0000-0000-000000000001'::uuid as user_id
)
insert into body_model (user_id, skin_scores, skin_tone, face_shape)
select
  demo.user_id,
  '{"all": 75.76, "moisture": 62.4, "acne": 88.0, "wrinkle": 82.5}',
  '{"undertone": "warm", "depth": "medium", "hex": "#D4A574"}',
  '{"shape": "oval", "symmetry_score": 87.5}'
from demo
on conflict (user_id) do nothing;

-- Step 4: Seed 15 closet items
with demo as (
  select '00000000-0000-0000-0000-000000000001'::uuid as user_id
)
insert into closet_items (user_id, name, category, color, brand, price, occasions, times_worn)
select demo.user_id, item.*
from demo
cross join (
  values
    ('Navy Blazer', 'jacket', 'navy', 'J.Crew', 198, '{"office","meeting","date"}', 23),
    ('Black Leather Jacket', 'jacket', 'black', 'AllSaints', 450, '{"casual","date","concert"}', 15),
    ('White Midi Dress', 'dress', 'white', 'Reformation', 218, '{"brunch","date","wedding"}', 8),
    ('Sage Wrap Dress', 'dress', 'sage green', 'ASTR The Label', 89, '{"casual","date","brunch"}', 5),
    ('Cream Silk Blouse', 'top', 'cream', 'Everlane', 88, '{"office","meeting","brunch"}', 12),
    ('Black Turtleneck', 'top', 'black', 'Uniqlo', 29, '{"office","casual","date"}', 30),
    ('Grey Cashmere Sweater', 'top', 'grey', 'Naadam', 145, '{"casual","office","travel"}', 18),
    ('Dark Wash Jeans', 'bottom', 'indigo', 'Citizens of Humanity', 198, '{"casual","date","brunch"}', 40),
    ('Black Trousers', 'bottom', 'black', 'Theory', 265, '{"office","meeting","formal"}', 25),
    ('Khaki Chinos', 'bottom', 'khaki', 'Bonobos', 98, '{"casual","brunch","travel"}', 20),
    ('Black Heels', 'shoes', 'black', 'Sam Edelman', 140, '{"office","date","formal"}', 22),
    ('White Sneakers', 'shoes', 'white', 'Common Projects', 410, '{"casual","brunch","travel"}', 50),
    ('Brown Loafers', 'shoes', 'brown', 'G.H. Bass', 110, '{"office","casual","brunch"}', 28),
    ('Gold Watch', 'accessory', 'gold', 'Daniel Wellington', 189, '{"office","date","formal"}', 60),
    ('Pearl Stud Earrings', 'accessory', 'white', 'Mejuri', 58, '{"office","date","formal","casual"}', 45)
) as item(name, category, color, brand, price, occasions, times_worn);
