CREATE TABLE IF NOT EXISTS polls (
  id            SERIAL PRIMARY KEY,
  message_id    TEXT NOT NULL UNIQUE,  -- ID du message Discord du sondage
  channel_id    TEXT NOT NULL,
  creator_id    TEXT NOT NULL,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,        -- ["Option 1", "Option 2", ...]
  votes         JSONB NOT NULL DEFAULT '{}', -- {"discord_id": option_index}
  ends_at       TIMESTAMPTZ NOT NULL,
  ended         BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
