-- Phrase de seuil éditable pour les événements roulette
ALTER TABLE roulette_events
  ADD COLUMN IF NOT EXISTS threshold_phrase TEXT DEFAULT NULL;
