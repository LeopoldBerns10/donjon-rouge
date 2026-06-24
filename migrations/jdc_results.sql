CREATE TABLE IF NOT EXISTS jdc_results (
  id           SERIAL PRIMARY KEY,
  clan_tag     TEXT        NOT NULL,
  clan_name    TEXT        NOT NULL,
  season       TEXT        NOT NULL,           -- ex: "2026-06"
  total_points INTEGER     NOT NULL,
  tier_reached INTEGER     NOT NULL,           -- 1 à 6, 0 si aucun
  members      JSONB       NOT NULL,           -- [{tag, name, points}]
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jdc_results_season_idx ON jdc_results (season);
CREATE INDEX IF NOT EXISTS jdc_results_clan_tag_idx ON jdc_results (clan_tag);
