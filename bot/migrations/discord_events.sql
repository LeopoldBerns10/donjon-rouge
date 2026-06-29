CREATE TABLE IF NOT EXISTS discord_events (
  id               SERIAL PRIMARY KEY,
  discord_event_id TEXT,
  type             TEXT NOT NULL,      -- 'raid', 'jdc', 'manual'
  title            TEXT NOT NULL,
  description      TEXT,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  announced        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
