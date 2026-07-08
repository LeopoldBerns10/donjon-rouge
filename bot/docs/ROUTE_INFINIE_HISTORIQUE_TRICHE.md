# Route de l'Infinie — Historique des refus + Détection suppression/modification
## Bot Donjon Rouge — Nouvelle feature

---

## ⚠️ RÈGLES AVANT DE COMMENCER
- Ne rien casser dans le jeu Route de l'Infinie existant (handleRouteMessage, cooldown, panel secret CyberAlf, cadeau)
- Inspecter l'existant avant toute modification (déjà fait lors du diagnostic précédent : handleRouteMessage gère 4 types de refus, route_infinie_cooldowns ne stocke que discord_id + last_time du dernier coup réussi)
- Vérifier l'existant avant de créer une nouvelle table ou fonction (pas de doublon)

---

## Contexte

Alan soupçonne de la triche sur le jeu Route de l'Infinie : certains nombres corrects semblent refusés sans raison claire, et des joueurs pourraient poster un nombre, voir que ce n'est pas le bon (ou par erreur), puis le supprimer/modifier avant que quelqu'un d'autre ne le voie. Actuellement, AUCUNE trace n'est gardée des tentatives refusées ni des suppressions/modifications de message dans ce salon.

**Important (contrainte technique Discord) :** il n'existe aucun moyen d'empêcher un membre de supprimer ou modifier son propre message sur Discord (pas de permission dédiée à ça). La solution est donc de **détecter et logger** ces actions plutôt que de les bloquer.

---

## Objectif — 2 features

### 1. Historique des tentatives refusées
Créer une table qui enregistre chaque refus dans handleRouteMessage, pour les 4 cas déjà identifiés :
- Texte non numérique
- Mauvais nombre
- Même joueur deux fois de suite
- Cooldown 1h pas écoulé

### 2. Détection de suppression/modification de message dans le salon Route de l'Infinie
Le bot doit écouter les événements Discord `messageDelete` et `messageUpdate` (via `partials` si nécessaire pour capter les messages non mis en cache) spécifiquement sur le salon Route de l'Infinie (ID `1520108333846233098`), et à chaque suppression/modification détectée :
- Logger l'info dans une table dédiée (contenu original, auteur, action : suppression ou modification, ancien contenu vs nouveau contenu si modification, date)
- Envoyer immédiatement une alerte dans le salon Logs bot (`1522722935918559364`) avec le pseudo, le contenu original, et l'action détectée — pour qu'Alan puisse réagir vite

---

## Détails techniques

### Table 1 — `route_infinie_refused_attempts`
- `id` (uuid, pk)
- `discord_id` (text)
- `coc_name` (text, si disponible facilement, sinon juste discord_id/username Discord)
- `attempted_value` (text) — ce que le joueur a écrit (peut être non numérique)
- `reason` (text) — un des 4 cas : `not_numeric`, `wrong_number`, `same_player_twice`, `cooldown_active`
- `expected_value` (integer, nullable) — le nombre qui était attendu si pertinent (cas `wrong_number`)
- `created_at` (timestamp)

Insérer une ligne à chaque fois qu'un des 4 refus se déclenche dans `handleRouteMessage`, en plus du comportement déjà existant (suppression du message, message d'erreur éphémère) — ne rien changer à ce comportement actuel, juste ajouter l'écriture en base.

### Table 2 — `route_infinie_message_edits`
- `id` (uuid, pk)
- `discord_id` (text)
- `original_content` (text)
- `new_content` (text, nullable — rempli seulement si c'est une modification, pas une suppression)
- `action` (text) — `deleted` ou `edited`
- `created_at` (timestamp)

### Listener Discord
- `client.on('messageDelete', ...)` et `client.on('messageUpdate', ...)` filtrés sur `channel.id === '1520108333846233098'`
- Ignorer les messages du bot lui-même (messages système, embeds, boutons)
- Pour `messageDelete` : si le message est en cache, récupérer son contenu ; si le message n'est pas en cache (Discord ne fournit pas toujours le contenu d'un message supprimé non caché), logger au minimum l'ID et l'auteur si disponible, avec une mention "contenu non récupérable"
- Pour `messageUpdate` : comparer `oldMessage.content` et `newMessage.content`

### Alerte dans Logs bot
Format suggéré :
```
🔴 [timestamp] TRICHE SUSPECTÉE — Route de l'Infinie — {pseudo} a supprimé son message : "{contenu}"
```
ou
```
🔴 [timestamp] TRICHE SUSPECTÉE — Route de l'Infinie — {pseudo} a modifié son message : "{ancien}" → "{nouveau}"
```

---

## Emplacement des fichiers
- Migration SQL : `bot/migrations/route_infinie_history.sql`
- Logique refus : modifier directement dans le fichier existant gérant `handleRouteMessage` (probablement `bot/src/lib/routeInfinie.js`)
- Nouveau listener messageDelete/messageUpdate : nouveau fichier `bot/src/events/routeInfinieAudit.js`, à enregistrer au démarrage du bot comme les autres listeners d'événements (`guildMemberAdd.js`, etc.)

---

## Récap attendu de Claude Code
- Fichiers créés/modifiés
- Confirmation que le comportement actuel du jeu n'est pas cassé (refus toujours fonctionnels comme avant)
- Confirmation de l'activation des `partials` Discord.js si nécessaire pour capter les messages non cachés
- Migration SQL à exécuter
