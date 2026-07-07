-- Migration : ajout colonne "role" dans war_signups
-- A exécuter dans Supabase Dashboard > SQL Editor
--
-- DEFAULT 'titulaire' garantit que toutes les lignes existantes reçoivent
-- automatiquement la valeur 'titulaire' — aucune donnée n'est perdue.

ALTER TABLE war_signups
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'titulaire';
