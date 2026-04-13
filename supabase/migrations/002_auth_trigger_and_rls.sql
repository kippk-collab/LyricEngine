-- LyricEngine: Auth trigger + RLS tightening
-- Run this in the Supabase SQL editor after enabling Email OTP in the dashboard.

-- ─── FK cascades ─────────────────────────────────────────────────────────────
-- The seed user row has a placeholder UUID. When Kipp signs in via OTP,
-- the trigger below updates that row's id to match auth.users.id.
-- ON UPDATE CASCADE ensures activity/workspace FKs follow the change.

ALTER TABLE user_activity DROP CONSTRAINT user_activity_user_id_fkey;
ALTER TABLE user_activity ADD CONSTRAINT user_activity_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE;

ALTER TABLE workspaces DROP CONSTRAINT workspaces_user_id_fkey;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE;

-- ─── User provisioning trigger ───────────────────────────────────────────────
-- Fires on auth.users INSERT (new sign-up via OTP).
-- If a seed/placeholder row exists for that email, update its UUID.
-- Otherwise, create a fresh row with free tier.

-- DEFAULT_NEW_USER_TIER: Change this to 'free' when done testing with friends.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tier TEXT := 'pro';  -- ← flip to 'free' for production
BEGIN
  UPDATE public.users SET id = NEW.id WHERE email = NEW.email;
  IF NOT FOUND THEN
    INSERT INTO public.users (id, email, display_name, tier)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      default_tier
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Tighten RLS policies ────────────────────────────────────────────────────
-- Cache tables (words, word_relations, word_fetch_log) stay open - no changes.

-- Users: own row only
DROP POLICY IF EXISTS "Users readable by all" ON users;
DROP POLICY IF EXISTS "Users writable by all" ON users;
CREATE POLICY "Users read own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON users FOR UPDATE USING (auth.uid() = id);

-- User activity: own rows only
DROP POLICY IF EXISTS "Activity readable by all" ON user_activity;
DROP POLICY IF EXISTS "Activity writable by all" ON user_activity;
CREATE POLICY "Activity insert own" ON user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Activity read own" ON user_activity FOR SELECT USING (auth.uid() = user_id);

-- Workspaces: own rows + public shared readable
DROP POLICY IF EXISTS "Workspaces all access MVP" ON workspaces;
CREATE POLICY "Own workspaces" ON workspaces FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public shared workspaces readable" ON workspaces FOR SELECT USING (is_public = true);
