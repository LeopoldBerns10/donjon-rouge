CREATE TABLE IF NOT EXISTS route_infinie (
  id              SERIAL PRIMARY KEY,
  current_number  INTEGER NOT NULL DEFAULT 0,
  last_discord_id TEXT,
  last_time       TIMESTAMPTZ,
  gift_number     INTEGER,
  gift_desc       TEXT,
  active          BOOLEAN DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO route_infinie (current_number, active) VALUES (0, true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS route_infinie_cooldowns (
  discord_id  TEXT PRIMARY KEY,
  last_time   TIMESTAMPTZ NOT NULL
);
