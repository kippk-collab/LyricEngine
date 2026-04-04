-- LyricEngine Initial Schema
-- Run this in the Supabase SQL editor after creating your project.

-- ─── Word Cache ───────────────────────────────────────────────────────────────

CREATE TABLE words (
  id SERIAL PRIMARY KEY,
  word TEXT UNIQUE NOT NULL,
  num_syllables INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_words_word ON words(word);

CREATE TABLE word_relations (
  id SERIAL PRIMARY KEY,
  word_id INT REFERENCES words(id) NOT NULL,
  related_word TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  -- relation_type values: 'rhy','nry','syn','ant','trg','bga','bgb','jja','jjb','spc','gen','com','par','hom','cns','phrases'
  related_num_syllables INT,
  source TEXT DEFAULT 'datamuse',
  -- source values: 'datamuse', 'phrases_api', 'manual'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(word_id, related_word, relation_type)
);

CREATE INDEX idx_word_relations_word_type ON word_relations(word_id, relation_type);

-- Tracks which (word, relation_type) pairs have been fetched.
-- Solves the "never fetched" vs "fetched but empty" ambiguity.
CREATE TABLE word_fetch_log (
  id SERIAL PRIMARY KEY,
  word_id INT REFERENCES words(id) NOT NULL,
  relation_type TEXT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(word_id, relation_type)
);

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY,                    -- matches auth.users.id from Supabase Auth
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  tier TEXT NOT NULL DEFAULT 'free',      -- 'free', 'basic', 'pro'
  api_uses_this_month INT DEFAULT 0,
  billing_cycle_start DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  action_type TEXT NOT NULL,
  -- action_type values: 'search', 'fetch_rhy', 'fetch_syn', 'fetch_ant', 'fetch_trg', etc., 'target', 'target_new_tab', 'recall_workspace'
  word TEXT,
  source TEXT,                            -- 'api' or 'cache'
  workspace_id INT,                       -- populated for recall_workspace actions
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_activity_user ON user_activity(user_id);
CREATE INDEX idx_user_activity_created ON user_activity(created_at);

-- ─── Workspaces ───────────────────────────────────────────────────────────────

CREATE TABLE workspaces (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  state JSONB NOT NULL,
  -- state schema: { version, theme, activeTabIndex, tabs: [{ id, name, targetWord, expandedRelations, collapsedSyllableGroups, viewMode, vizModel, theme }] }
  is_autosave BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,               -- null until user shares; set to null to revoke
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workspaces_user ON workspaces(user_id);
CREATE INDEX idx_workspaces_share_token ON workspaces(share_token) WHERE share_token IS NOT NULL;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Cache tables (words, word_relations, word_fetch_log) are global/shared.
-- Any user (including unauthenticated/anon) can read and write to them.
-- When auth is wired (WS7), reads stay open; writes can be restricted to authenticated.

ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_fetch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Shared word cache: open to all (anon + authenticated)
CREATE POLICY "Cache readable by all" ON words FOR SELECT USING (true);
CREATE POLICY "Cache insertable by all" ON words FOR INSERT WITH CHECK (true);

CREATE POLICY "Relations readable by all" ON word_relations FOR SELECT USING (true);
CREATE POLICY "Relations insertable by all" ON word_relations FOR INSERT WITH CHECK (true);

CREATE POLICY "Fetch log readable by all" ON word_fetch_log FOR SELECT USING (true);
CREATE POLICY "Fetch log insertable by all" ON word_fetch_log FOR INSERT WITH CHECK (true);

-- Users: MVP dev uses a hardcoded UUID, so allow all for now.
-- TODO (WS7): tighten to: USING (auth.uid() = id)
CREATE POLICY "Users readable by all" ON users FOR SELECT USING (true);
CREATE POLICY "Users writable by all" ON users FOR ALL USING (true);

-- User activity: same MVP bypass.
-- TODO (WS7): tighten to: USING (auth.uid() = user_id)
CREATE POLICY "Activity readable by all" ON user_activity FOR SELECT USING (true);
CREATE POLICY "Activity writable by all" ON user_activity FOR INSERT WITH CHECK (true);

-- Workspaces: own rows + public shared workspaces.
-- TODO (WS7): remove the "all" policy, keep only the two scoped ones below.
CREATE POLICY "Workspaces all access MVP" ON workspaces FOR ALL USING (true);
-- Future scoped policies (uncomment and remove the above when auth is live):
-- CREATE POLICY "Own workspaces" ON workspaces FOR ALL USING (auth.uid() = user_id);
-- CREATE POLICY "Public shared workspaces readable" ON workspaces FOR SELECT USING (is_public = true);

-- ─── Seed: Kipp's user row (tier = pro for MVP) ───────────────────────────────
-- Replace the UUID below with your actual Supabase Auth user UUID after first sign-in,
-- or use a hardcoded UUID for local dev before auth is wired up.

INSERT INTO users (id, email, display_name, tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'kippkoenig@gmail.com',
  'Kipp',
  'pro'
);
