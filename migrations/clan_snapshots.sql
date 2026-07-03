CREATE TABLE IF NOT EXISTS clan_snapshots (
  id               SERIAL      PRIMARY KEY,
  snapshot_date    DATE        NOT NULL,
  clan_tag         TEXT        NOT NULL,
  member_count     INTEGER,
  avg_trophies     INTEGER,
  total_donations  INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (snapshot_date, clan_tag)
);

CREATE INDEX IF NOT EXISTS clan_snapshots_date_idx
  ON clan_snapshots (snapshot_date DESC);
