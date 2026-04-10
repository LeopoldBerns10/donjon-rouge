-- Ajoute les colonnes manquantes à forum_posts pour le système Discord-like

ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES forum_categories(id) ON DELETE SET NULL;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Met à jour le cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
