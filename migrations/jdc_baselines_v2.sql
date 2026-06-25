-- Migration : contrainte unique (player_tag, season) au lieu de (player_tag, clan_tag, season)
-- Les baselines sont par joueur et par saison, indépendamment du clan.

-- 1. Supprimer les doublons éventuels (garder la ligne avec le plus petit id)
DELETE FROM jdc_baselines a
USING jdc_baselines b
WHERE a.id > b.id
  AND a.player_tag = b.player_tag
  AND a.season = b.season;

-- 2. Supprimer l'ancienne contrainte
ALTER TABLE jdc_baselines
  DROP CONSTRAINT IF EXISTS jdc_baselines_player_tag_clan_tag_season_key;

-- 3. Ajouter la nouvelle contrainte
ALTER TABLE jdc_baselines
  ADD CONSTRAINT jdc_baselines_player_tag_season_key
  UNIQUE (player_tag, season);
