CREATE TABLE IF NOT EXISTS member_participation (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id         TEXT,
  coc_name           TEXT        NOT NULL,
  coc_tag            TEXT        NOT NULL,
  event_type         TEXT        NOT NULL CHECK (event_type IN ('gdc', 'jdc')),
  event_date         DATE        NOT NULL,
  participated       BOOLEAN     NOT NULL DEFAULT FALSE,
  attack_percentage  INTEGER,
  double_perf        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (coc_tag, event_type, event_date)
);

-- Accélère les calculs de taux par joueur Discord
CREATE INDEX IF NOT EXISTS member_participation_discord_idx
  ON member_participation (discord_id, event_type, event_date);

-- Accélère les lookups par tag CoC (joueurs non liés)
CREATE INDEX IF NOT EXISTS member_participation_tag_idx
  ON member_participation (coc_tag, event_date);
