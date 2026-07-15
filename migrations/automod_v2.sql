-- Automodération v2 — remplace mod_banned_words + ancien mod_warnings

DROP TABLE IF EXISTS mod_banned_words CASCADE;
DROP TABLE IF EXISTS mod_warnings CASCADE;

-- Configuration centralisée clé/valeur JSON
CREATE TABLE IF NOT EXISTS mod_config (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL UNIQUE,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Avertissements et mutes
CREATE TABLE IF NOT EXISTS mod_warnings (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id   TEXT        NOT NULL,
  discord_name TEXT,
  reason       TEXT        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'manual',
  warned_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  auto         BOOLEAN     DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_mod_warnings_discord_id ON mod_warnings (discord_id);
CREATE INDEX IF NOT EXISTS idx_mod_warnings_expires_at  ON mod_warnings (expires_at);
CREATE INDEX IF NOT EXISTS idx_mod_warnings_type        ON mod_warnings (type);

-- Valeurs par défaut
INSERT INTO mod_config (key, value) VALUES
  ('automod_enabled',        'false'),
  ('exempt_roles',           '["611123759864348672","1297318759396278425"]'),
  ('exempt_members',         '[]'),
  ('ignored_channels',       '["1522722935918559364"]'),
  ('monitored_channels',     '"all"'),
  ('banned_words_enabled',   'true'),
  ('banned_words_list',      '["merde","putain","connard","enculé","salope","con","conne","bâtard","fils de pute","nique","niquer","fdp","tg","va te faire","pd","tapette","attardé","mongol","trisomique","pédé","racist","nazi"]'),
  ('spam_enabled',           'true'),
  ('spam_threshold',         '5'),
  ('spam_interval_seconds',  '10'),
  ('caps_enabled',           'true'),
  ('caps_threshold_percent', '70'),
  ('caps_min_length',        '10'),
  ('links_enabled',          'false'),
  ('links_whitelist',        '[]'),
  ('mentions_enabled',       'true'),
  ('mentions_max',           '5'),
  ('warn_threshold',         '3'),
  ('mute_durations',         '[10,60,1440]'),
  ('warn_expiry_hours',      '24'),
  ('log_channel',            '"1522722935918559364"'),
  ('warn_dm_enabled',        'true'),
  ('action_message_style',   '"dm"')
ON CONFLICT (key) DO NOTHING;
