-- ╔══════════════════════════════════════════════╗
-- ║         NexAuth — Supabase SQL Schema        ║
-- ║  Run this in: Supabase → SQL Editor → Run    ║
-- ╚══════════════════════════════════════════════╝

-- ── USERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  first_name  TEXT DEFAULT '',
  last_name   TEXT DEFAULT '',
  plan        TEXT DEFAULT 'free',  -- free | pro | enterprise
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── APPS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apps (
  id          UUID PRIMARY KEY,
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT DEFAULT 'active',  -- active | paused
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── LICENSES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id          UUID PRIMARY KEY,
  app_id      UUID REFERENCES apps(id) ON DELETE CASCADE,
  key         TEXT UNIQUE NOT NULL,
  type        TEXT DEFAULT 'lifetime',  -- lifetime | yearly | monthly | weekly | daily
  status      TEXT DEFAULT 'active',   -- active | revoked | expired | banned
  hwid        TEXT DEFAULT NULL,       -- bound hardware id
  used_by     TEXT DEFAULT NULL,       -- username who claimed it
  note        TEXT DEFAULT '',
  expires_at  TIMESTAMPTZ DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── BLACKLIST ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS blacklist (
  id          UUID PRIMARY KEY,
  app_id      UUID REFERENCES apps(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- hwid | ip | license
  value       TEXT NOT NULL,
  reason      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── API KEYS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY,
  app_id      UUID REFERENCES apps(id) ON DELETE CASCADE,
  owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT DEFAULT 'Default Key',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── ACTIVITY LOGS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY,
  app_id      UUID REFERENCES apps(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,  -- license_validated | hwid_mismatch | login | banned | etc
  license_id  UUID DEFAULT NULL,
  hwid        TEXT DEFAULT NULL,
  ip          TEXT DEFAULT NULL,
  meta        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_licenses_app    ON licenses(app_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key    ON licenses(key);
CREATE INDEX IF NOT EXISTS idx_licenses_hwid   ON licenses(hwid);
CREATE INDEX IF NOT EXISTS idx_blacklist_app   ON blacklist(app_id);
CREATE INDEX IF NOT EXISTS idx_logs_app        ON activity_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_logs_created    ON activity_logs(created_at DESC);

-- ── DONE ───────────────────────────────────────────
-- All tables created successfully!
-- Now go to your .env file and fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
