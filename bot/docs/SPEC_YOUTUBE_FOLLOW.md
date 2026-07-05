# SPEC — Suivi YouTube (officiel + personnel)
## Bot Donjon Rouge — Nouvelle feature

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- NE PAS toucher aux fichiers existants du bot en dehors de ce qui est décrit ici
- Vérifier l'existant avant de créer quoi que ce soit (pas de doublons de tables, de commandes, de fichiers)
- Ne rien casser dans scheduler.js, config/, events/, lib/ existants — uniquement AJOUTER
- Si un fichier ou une table du même nom existe déjà, s'arrêter et demander confirmation avant d'écraser

---

## Objectif

Deux systèmes de suivi YouTube :

1. **Suivi officiel (admin/staff)** : des chaînes YouTube choisies par le staff sont surveillées, et chaque nouvelle vidéo est postée automatiquement dans un salon fixe du serveur.

2. **Suivi personnel (membres)** : chaque membre peut, via un panel avec bouton "➕ Ajouter suivi", indiquer une chaîne YouTube à suivre (en collant son lien). Le bot lui ouvre (ou réutilise) un salon Discord privé personnel (visible uniquement par lui + le staff), et le pingera dans ce salon à chaque nouvelle vidéo des chaînes qu'il suit personnellement.

---

## Méthode technique — pas de clé API YouTube nécessaire

Utiliser les flux RSS publics YouTube (gratuits, sans quota, sans clé API) :
```
https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
```
Ce flux XML contient les dernières vidéos publiées (id, titre, date de publication, lien).

**Résolution du channel_id à partir du lien collé par l'utilisateur :**
Le membre colle un lien de chaîne YouTube (ex: `https://www.youtube.com/@NomChaine`, `https://www.youtube.com/channel/UCxxxxx`, `https://www.youtube.com/c/NomChaine`, ou `https://www.youtube.com/user/NomChaine`).
Le bot doit :
1. Si l'URL contient déjà `/channel/UCxxxx` → extraire directement le channel_id
2. Sinon (format `@handle`, `/c/`, `/user/`) → faire un fetch HTTP de la page de la chaîne et parser le HTML pour trouver la meta tag `<meta itemprop="channelId" content="UCxxxx">` ou le lien canonique `<link rel="canonical" href=".../channel/UCxxxx">`
3. Si la résolution échoue → répondre au membre que le lien n'est pas reconnu et lui redemander

**Déduplication du polling :** une chaîne YouTube (channel_id) n'est vérifiée qu'**une seule fois** par cycle, peu importe le nombre de membres qui la suivent (officiel ou personnel confondus). Stocker le dernier video_id vu par channel_id, puis dispatcher les notifications à qui de droit.

---

## Tables Supabase à créer (nouvelles, ne pas toucher aux tables existantes)

### `youtube_channels` (registre unique de toutes les chaînes suivies, tous types confondus)
- `id` (uuid, pk)
- `channel_id` (text, unique) — ID YouTube UCxxxx
- `channel_name` (text) — nom affiché de la chaîne
- `channel_url` (text) — lien original
- `last_video_id` (text, nullable) — dernier video_id détecté
- `last_checked_at` (timestamp)
- `created_at` (timestamp)

### `youtube_follows_official` (suivis "officiels" postés dans le salon fixe)
- `id` (uuid, pk)
- `channel_id` (text, fk → youtube_channels.channel_id)
- `added_by` (discord_id)
- `created_at` (timestamp)

### `youtube_follows_member` (suivis personnels)
- `id` (uuid, pk)
- `discord_id` (text) — le membre qui suit
- `channel_id` (text, fk → youtube_channels.channel_id)
- `created_at` (timestamp)

### `youtube_member_channels` (salon privé Discord de chaque membre)
- `discord_id` (text, unique, pk)
- `discord_channel_id` (text) — ID du salon Discord privé créé pour ce membre

---

## Limites

- Un membre peut suivre **maximum 5 chaînes** en personnel (vérifier avant d'ajouter, message d'erreur clair si dépassé : "Tu suis déjà 5 chaînes, retire-en une pour en ajouter une nouvelle")
- Pas de limite sur le nombre de chaînes officielles (géré par staff uniquement)

---

## Fonctionnalités à développer

### 1. Panel "Suivi YouTube" (nouveau salon ou salon existant à définir avec Alan)
- Embed avec bouton `➕ Ajouter suivi`
- Bouton `➖ Retirer un suivi` (ouvre un menu de sélection avec les chaînes actuellement suivies par le membre)
- Au clic sur "Ajouter suivi" → ouvre une **modal Discord** demandant de coller le lien de la chaîne YouTube
- Validation :
  - Résoudre le channel_id à partir du lien (cf méthode ci-dessus)
  - Vérifier la limite de 5 chaînes perso
  - Vérifier si la chaîne existe déjà dans `youtube_channels`, sinon la créer
  - Ajouter la ligne dans `youtube_follows_member`
  - Créer le salon privé du membre s'il n'existe pas encore (cf point 2), sinon réutiliser celui existant
  - Confirmer au membre en éphémère : "✅ Chaîne ajoutée, tu seras pingé dans #ton-salon dès qu'une nouvelle vidéo sort"

### 2. Salon privé personnel
- Nommage suggéré : `📺-suivi-{pseudo}`
- Permissions : visible uniquement par le membre concerné + rôles staff (Chef ID `611123759864348672` + rôle Adjoint) + le bot
- Catégorie Discord dédiée à créer si elle n'existe pas : `📺 SUIVIS YOUTUBE`
- Un membre = un seul salon qui regroupe toutes ses chaînes suivies (pas un salon par chaîne)

### 3. Commande admin pour suivi officiel
- `/addyoutubeofficial <lien>` (réservé staff, mêmes permissions que les autres commandes admin type `/createevent`)
- Même logique de résolution de channel_id
- Ajoute dans `youtube_follows_official` + poste dans le salon fixe défini (channel ID à définir avec Alan, ou paramétrable via `bot_config`)
- `/removeyoutubeofficial` pour retirer une chaîne officielle

### 4. Scheduler de vérification (nouveau module, ne pas modifier scheduler.js existant — créer un fichier séparé et l'appeler depuis scheduler.js par un simple import/appel de fonction)
- Fréquence : toutes les 15 minutes
- Pour chaque chaîne dans `youtube_channels` :
  - Fetch le flux RSS `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`
  - Parser la première vidéo (la plus récente)
  - Si `video_id` différent de `last_video_id` stocké :
    - Mettre à jour `last_video_id` et `last_checked_at`
    - Si la chaîne est suivie en officiel (présente dans `youtube_follows_official`) → poster le lien de la vidéo dans le salon fixe (juste le lien brut pour profiter de l'aperçu automatique Discord, pas besoin d'embed custom)
    - Si la chaîne est suivie en personnel par un ou plusieurs membres (présente dans `youtube_follows_member`) → pour chaque membre concerné, poster le lien dans son salon privé avec un ping `<@discord_id>` juste avant le lien
- Important : ne jamais reposter une ancienne vidéo au premier ajout d'une chaîne — au moment de la création d'une chaîne dans `youtube_channels`, faire un premier fetch pour initialiser `last_video_id` SANS notifier personne (sinon tout le monde reçoit un ping pour une vidéo déjà vue)

### 5. Gestion de la suppression d'un salon privé
- Si un membre retire sa dernière chaîne suivie, laisser le salon privé en place (ne pas le supprimer automatiquement, au cas où il veuille resuivre plus tard) — sauf si Alan préfère l'inverse, à confirmer plus tard si besoin

---

## Migration SQL
Le fichier de migration doit être créé dans :
`C:\Users\Papa\donjon-rouge\bot\migrations\youtube_follow.sql`

Il doit contenir les 4 tables décrites ci-dessus avec leurs types, contraintes (unique, fk) et index nécessaires (au minimum un index sur `channel_id` dans chaque table de suivi).

---

## Emplacement des nouveaux fichiers de code (à respecter, cohérent avec l'existant)
- Logique de résolution de lien YouTube + appel RSS : `bot/src/lib/youtubeTracker.js`
- Gestion du panel + modal + boutons : `bot/src/lib/youtubePanelHandlers.js` (ou ajout dans `panelHandlers.js` existant si plus cohérent — à évaluer par Claude Code selon la structure actuelle du fichier)
- Commandes admin : `bot/src/commands/addyoutubeofficial.js` et `bot/src/commands/removeyoutubeofficial.js`
- Setup du panel : `bot/src/setup/sendYoutubePanel.js` (suivre le même modèle que `sendPollPanel.js` / `sendBirthdayPanel.js`)

---

## Points à clarifier avec Alan avant de coder (Claude Code doit lister ces questions dans son récap plutôt que de deviner)
1. Quel salon Discord accueille le panel "Ajouter suivi" ? (nouveau salon ou existant ?)
2. Quel salon Discord fixe reçoit les vidéos des chaînes suivies en "officiel" ?
3. Nom exact de la catégorie Discord pour les salons privés des membres (proposition : `📺 SUIVIS YOUTUBE`)

---

## Ne pas oublier
- Tester la résolution de channel_id sur plusieurs formats de lien réels avant de considérer la feature terminée
- Vérifier que le rate-limit Discord n'est pas un problème si beaucoup de vidéos sortent en même temps (envoyer les messages avec un léger délai entre chaque si nécessaire)
- Faire un récap complet à la fin (fichiers créés/modifiés, tables créées, commandes ajoutées, questions en attente)
