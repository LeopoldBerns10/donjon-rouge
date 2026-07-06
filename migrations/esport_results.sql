-- Table des résultats E-Sport (matchs officiels de la team DR E-Sport)
CREATE TABLE IF NOT EXISTS esport_results (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  round       text        NOT NULL,
  opponent    text        NOT NULL,
  score_dr    integer     NOT NULL,
  score_opp   integer     NOT NULL,
  won         boolean     NOT NULL,
  played_at   date        NOT NULL,
  created_at  timestamptz DEFAULT now()
);
