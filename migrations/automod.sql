-- Automodération Discord — Phase 2

CREATE TABLE IF NOT EXISTS mod_banned_words (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  word       TEXT        NOT NULL UNIQUE,
  added_by   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mod_warnings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT        NOT NULL,
  reason     TEXT        NOT NULL,
  warned_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mod_warnings_discord_id ON mod_warnings (discord_id);
CREATE INDEX IF NOT EXISTS idx_mod_warnings_expires_at  ON mod_warnings (expires_at);
