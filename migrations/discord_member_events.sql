CREATE TABLE IF NOT EXISTS discord_member_events (
  id          SERIAL      PRIMARY KEY,
  event_type  TEXT        NOT NULL CHECK (event_type IN ('join', 'leave')),
  discord_id  TEXT        NOT NULL,
  username    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discord_member_events_created_idx
  ON discord_member_events (created_at DESC);
