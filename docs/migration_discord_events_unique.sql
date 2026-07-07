-- Migration : contrainte UNIQUE partielle sur discord_events (type, start_time)
-- Concerne uniquement les types automatiques : raid, jdc, ldc
-- Les événements "manual" et "supercell" peuvent légitimement partager un même start_time
--
-- ⚠️  PRÉREQUIS : nettoyer d'abord les doublons existants en base.
--    Voir la section "Nettoyage" ci-dessous.
--
-- À exécuter dans : Supabase Dashboard > SQL Editor

-- ─── Étape 1 : nettoyage des doublons existants ──────────────────────────────
-- Conserver la ligne avec l'id le plus bas (première créée), supprimer les autres.
-- Exécuter UNIQUEMENT après avoir supprimé les événements Discord en doublon
-- via le serveur Discord.

DELETE FROM discord_events
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY type, start_time ORDER BY id ASC) AS rn
    FROM discord_events
    WHERE type IN ('raid', 'jdc', 'ldc')
  ) ranked
  WHERE rn > 1
);

-- ─── Étape 2 : ajout de la contrainte UNIQUE partielle ───────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS discord_events_auto_unique
ON discord_events (type, start_time)
WHERE type IN ('raid', 'jdc', 'ldc');
