-- ============================================================
-- FunnelManager — Profiles + asignación de módulos
-- Ejecutar en: Supabase Dashboard → SQL Editor (NUEVA query)
-- ============================================================

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name  TEXT        NOT NULL DEFAULT '',
  email      TEXT,
  color      TEXT        DEFAULT '#7C3AED',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_authenticated" ON profiles;
CREATE POLICY "profiles_read_authenticated" ON profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  palette TEXT[] := ARRAY['#7C3AED','#10B981','#3B82F6','#F59E0B','#E24B4A','#6366F1','#EC4899','#8B5CF6'];
  c       TEXT;
BEGIN
  c := palette[1 + (abs(hashtext(NEW.id::text)) % array_length(palette, 1))];
  INSERT INTO profiles (id, email, full_name, color)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    c
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Backfill profiles for existing users
INSERT INTO profiles (id, email, full_name, color)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  (ARRAY['#7C3AED','#10B981','#3B82F6','#F59E0B','#E24B4A','#6366F1','#EC4899','#8B5CF6'])[
    1 + (abs(hashtext(u.id::text)) % 8)
  ]
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM profiles);

-- 4. Add assigned_to column to funnel_nodes
ALTER TABLE funnel_nodes
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);

-- 5. Drop old public_users view (replaced by profiles)
DROP VIEW IF EXISTS public_users;

-- 6. Helper trigger to keep profiles.updated_at fresh
CREATE OR REPLACE FUNCTION touch_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_touch_updated ON profiles;
CREATE TRIGGER profiles_touch_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_profile_updated_at();
