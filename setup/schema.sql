-- Innerloop database schema (PostgreSQL — works on Neon, Supabase, or any Postgres).
-- Run this once against your database before starting the n8n workflows.

-- 1) Continuous glucose readings (written by the "blood sugar tracker" n8n workflow).
CREATE TABLE IF NOT EXISTS blutzucker (
  id            SERIAL PRIMARY KEY,
  timestamp     TIMESTAMPTZ NOT NULL UNIQUE,   -- reading time (from the CGM), used for upserts
  value_mgdl    INTEGER     NOT NULL,           -- glucose in mg/dL
  trend         INTEGER     DEFAULT 0,          -- LibreLinkUp trend arrow (0–5)
  is_high       BOOLEAN     DEFAULT FALSE,      -- > 140 mg/dL
  is_low        BOOLEAN     DEFAULT FALSE,      -- < 70 mg/dL
  fetched_at    TIMESTAMPTZ DEFAULT now(),      -- when this row was written
  timestamp_utc TIMESTAMPTZ                     -- normalised UTC copy of `timestamp`
);
CREATE INDEX IF NOT EXISTS blutzucker_ts_idx ON blutzucker (timestamp_utc);

-- 2) Meals (written by the OpenClaw Telegram agent after it reads a food photo).
CREATE TABLE IF NOT EXISTS mahlzeiten (
  id              SERIAL PRIMARY KEY,
  timestamp       TIMESTAMPTZ NOT NULL,         -- when the meal was eaten
  mahlzeit        TEXT        NOT NULL,          -- description, e.g. "Yogurt bowl with blueberries"
  kalorien        INTEGER,                       -- calories (kcal)
  kohlenhydrate_g NUMERIC,                       -- carbs (g)
  zucker_g        NUMERIC,                       -- sugar (g)
  protein_g       NUMERIC,                       -- protein (g)
  fett_g          NUMERIC,                       -- fat (g)
  ballaststoffe_g NUMERIC,                       -- fibre (g)
  portionsgroesse TEXT,                          -- portion size
  gi_schaetzung   TEXT,                          -- estimated glycemic index / load
  notizen         TEXT,                          -- free-text notes
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mahlzeiten_ts_idx ON mahlzeiten (timestamp);

-- 3) Apple Health metrics + workouts (written by the "Apple Health Import" n8n workflow).
--    One row per (metric, timestamp). Metrics include: heart_rate, resting_heart_rate,
--    heart_rate_variability, step_count, sleep_total, sleep_deep, sleep_rem, sleep_core,
--    sleep_awake, WorkoutDuration, WorkoutDistance, WorkoutSpeed, WorkoutActiveCalories, ...
CREATE TABLE IF NOT EXISTS apple_health (
  id         SERIAL PRIMARY KEY,
  timestamp  TIMESTAMPTZ NOT NULL,
  metric     TEXT        NOT NULL,
  value      NUMERIC,
  unit       TEXT,
  source     TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (timestamp, metric)                     -- lets the importer skip duplicates (ON CONFLICT DO NOTHING)
);
CREATE INDEX IF NOT EXISTS apple_health_metric_ts_idx ON apple_health (metric, timestamp);

-- 4) Read-only role for the public dashboard API (recommended).
--    The dashboard connects with THIS role, never the owner. It can only read.
--    Replace 'change_me' with a strong password and use it in NEON_CONN (see .env.example).
-- CREATE ROLE dashboard_ro LOGIN PASSWORD 'change_me';
-- GRANT CONNECT ON DATABASE neondb TO dashboard_ro;   -- use your DB name
-- GRANT USAGE ON SCHEMA public TO dashboard_ro;
-- GRANT SELECT ON blutzucker, mahlzeiten, apple_health TO dashboard_ro;
