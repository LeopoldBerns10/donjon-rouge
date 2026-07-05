-- Registre unique de toutes les chaînes suivies (officielles + personnelles)
CREATE TABLE IF NOT EXISTS youtube_channels (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id      text UNIQUE NOT NULL,
  channel_name    text NOT NULL,
  channel_url     text NOT NULL,
  last_video_id   text,
  last_checked_at timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Suivis officiels postés dans le salon fixe
CREATE TABLE IF NOT EXISTS youtube_follows_official (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id  text NOT NULL REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
  added_by    text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yfo_channel_id ON youtube_follows_official(channel_id);

-- Suivis personnels des membres
CREATE TABLE IF NOT EXISTS youtube_follows_member (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id  text NOT NULL,
  channel_id  text NOT NULL REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (discord_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_yfm_channel_id ON youtube_follows_member(channel_id);
CREATE INDEX IF NOT EXISTS idx_yfm_discord_id ON youtube_follows_member(discord_id);

-- Salon Discord privé de chaque membre
CREATE TABLE IF NOT EXISTS youtube_member_channels (
  discord_id          text PRIMARY KEY,
  discord_channel_id  text NOT NULL
);
