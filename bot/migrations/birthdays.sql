CREATE TABLE IF NOT EXISTS birthdays (
  id            SERIAL PRIMARY KEY,
  discord_id    TEXT NOT NULL UNIQUE,
  discord_name  TEXT NOT NULL,
  birth_day     INTEGER NOT NULL,  -- jour (1-31)
  birth_month   INTEGER NOT NULL,  -- mois (1-12)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
