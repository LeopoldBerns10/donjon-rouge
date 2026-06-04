CREATE TABLE IF NOT EXISTS public.voice_channels (
  channel_id TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
