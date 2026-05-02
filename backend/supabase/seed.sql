-- Mirra Seed Data — Demo User + 15 Closet Items
-- Run AFTER schema.sql
-- Uses Supabase auth.users → triggers auto-create of profiles + user_preferences

-- Step 1: Create demo user in auth.users (triggers handle_new_user)
insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
values (
  '00000000-0000-0000-0000-000000000001',
  'demo@mirra.ai',
  '{"display_name": "Demo User"}',
  now(), now(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated'
) on conflict (id) do nothing;

-- Step 2: Update profile with display name + location
update profiles set
  display_name = 'Demo User',
  location = 'San Francisco',
  onboarded = true
where id = '00000000-0000-0000-0000-000000000001';

-- Step 3: Seed body model
insert into body_model (user_id, skin_scores, skin_tone, face_shape) values (
  '00000000-0000-0000-0000-000000000001',
  '{"all": 75.76, "moisture": 62.4, "acne": 88.0, "wrinkle": 82.5}',
  '{"undertone": "warm", "depth": "medium", "hex": "#D4A574"}',
  '{"shape": "oval", "symmetry_score": 87.5}'
) on conflict (user_id) do nothing;

-- Step 4: Seed 15 closet items
insert into closet_items (user_id, name, category, color, brand, price, occasions, times_worn) values
  ('00000000-0000-0000-0000-000000000001', 'Navy Blazer', 'jacket', 'navy', 'J.Crew', 198, '{"office","meeting","date"}', 23),
  ('00000000-0000-0000-0000-000000000001', 'Black Leather Jacket', 'jacket', 'black', 'AllSaints', 450, '{"casual","date","concert"}', 15),
  ('00000000-0000-0000-0000-000000000001', 'White Midi Dress', 'dress', 'white', 'Reformation', 218, '{"brunch","date","wedding"}', 8),
  ('00000000-0000-0000-0000-000000000001', 'Sage Wrap Dress', 'dress', 'sage green', 'ASTR The Label', 89, '{"casual","date","brunch"}', 5),
  ('00000000-0000-0000-0000-000000000001', 'Cream Silk Blouse', 'top', 'cream', 'Everlane', 88, '{"office","meeting","brunch"}', 12),
  ('00000000-0000-0000-0000-000000000001', 'Black Turtleneck', 'top', 'black', 'Uniqlo', 29, '{"office","casual","date"}', 30),
  ('00000000-0000-0000-0000-000000000001', 'Grey Cashmere Sweater', 'top', 'grey', 'Naadam', 145, '{"casual","office","travel"}', 18),
  ('00000000-0000-0000-0000-000000000001', 'Dark Wash Jeans', 'bottom', 'indigo', 'Citizens of Humanity', 198, '{"casual","date","brunch"}', 40),
  ('00000000-0000-0000-0000-000000000001', 'Black Trousers', 'bottom', 'black', 'Theory', 265, '{"office","meeting","formal"}', 25),
  ('00000000-0000-0000-0000-000000000001', 'Khaki Chinos', 'bottom', 'khaki', 'Bonobos', 98, '{"casual","brunch","travel"}', 20),
  ('00000000-0000-0000-0000-000000000001', 'Black Heels', 'shoes', 'black', 'Sam Edelman', 140, '{"office","date","formal"}', 22),
  ('00000000-0000-0000-0000-000000000001', 'White Sneakers', 'shoes', 'white', 'Common Projects', 410, '{"casual","brunch","travel"}', 50),
  ('00000000-0000-0000-0000-000000000001', 'Brown Loafers', 'shoes', 'brown', 'G.H. Bass', 110, '{"office","casual","brunch"}', 28),
  ('00000000-0000-0000-0000-000000000001', 'Gold Watch', 'accessory', 'gold', 'Daniel Wellington', 189, '{"office","date","formal"}', 60),
  ('00000000-0000-0000-0000-000000000001', 'Pearl Stud Earrings', 'accessory', 'white', 'Mejuri', 58, '{"office","date","formal","casual"}', 45);
