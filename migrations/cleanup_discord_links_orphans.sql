-- Suppression des entrées discord_links pour les membres ayant quitté le serveur Discord.
-- À exécuter une seule fois dans l'éditeur SQL Supabase.
DELETE FROM discord_links
WHERE coc_tag IN ('#LR22UYRP8', '#LUQJL02JJ', '#YCCG8CY82');
