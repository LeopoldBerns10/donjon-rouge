CREATE TABLE IF NOT EXISTS jdc_baselines (
  id             BIGSERIAL   PRIMARY KEY,
  player_tag     TEXT        NOT NULL,
  clan_tag       TEXT        NOT NULL,
  season         TEXT        NOT NULL,  -- 'YYYY-MM'
  baseline_value INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_tag, clan_tag, season)
);

CREATE INDEX IF NOT EXISTS jdc_baselines_season_idx     ON jdc_baselines (season);
CREATE INDEX IF NOT EXISTS jdc_baselines_player_tag_idx ON jdc_baselines (player_tag);
