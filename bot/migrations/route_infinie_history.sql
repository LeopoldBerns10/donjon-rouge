CREATE TABLE IF NOT EXISTS route_infinie_refused_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id      TEXT NOT NULL,
  coc_name        TEXT,
  attempted_value TEXT NOT NULL,
  reason          TEXT NOT NULL,
  expected_value  INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_infinie_message_edits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id       TEXT NOT NULL,
  original_content TEXT,
  new_content      TEXT,
  action           TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
