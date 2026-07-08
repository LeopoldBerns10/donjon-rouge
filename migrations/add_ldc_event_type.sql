-- Étend le CHECK constraint pour autoriser event_type = 'ldc'
ALTER TABLE member_participation
  DROP CONSTRAINT IF EXISTS member_participation_event_type_check;

ALTER TABLE member_participation
  ADD CONSTRAINT member_participation_event_type_check
  CHECK (event_type IN ('gdc', 'jdc', 'ldc'));
