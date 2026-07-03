# FEATURE — Événements Discord automatiques
## Bot Discord — Donjon Rouge

---

## Contexte

Le bot crée automatiquement des événements Discord visibles dans le calendrier du serveur.
Un message d'annonce est envoyé 1 jour avant chaque événement dans le salon annonces.

---

## Salon annonces

**ID :** `1441176254769401969`

---

## Serveur Discord

**Guild ID :** `610767309031866371`

---

## Types d'événements

### 1. Raids Capital (automatique, récurrent)
- **Fréquence :** chaque semaine
- **Début :** vendredi 9h00 UTC
- **Fin :** lundi 9h00 UTC
- **Titre :** "💎 Raid Capital — Donjon Rouge"
- **Description :** "Le Raid Capital commence ! Participez pour contribuer au clan et gagner des ressources Capital."

### 2. Jeux de Clan (automatique, mensuel)
- **Fréquence :** mensuelle, détectée via `jdc_active` dans `bot_config`
- **Début :** `jdc_start` depuis `bot_config`
- **Fin :** `jdc_end` depuis `bot_config`
- **Titre :** "🎮 Jeux de Clan — Donjon Rouge"
- **Description :** "Les Jeux de Clan sont lancés ! Objectif minimum : 5 000 pts pour les membres DR."

### 3. Événements manuels (via panel admin)
- Créés par CyberAlf via commande `/createevent`
- Titre, description, date début, date fin

---

## Nouvelle table Supabase — `discord_events`

```sql
CREATE TABLE IF NOT EXISTS discord_events (
  id              SERIAL PRIMARY KEY,
  discord_event_id TEXT,              -- ID de l'événement Discord créé
  type            TEXT NOT NULL,      -- 'raid', 'jdc', 'manual'
  title           TEXT NOT NULL,
  description     TEXT,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  announced       BOOLEAN DEFAULT FALSE,  -- annonce 1j avant envoyée
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Nouveau fichier — `src/lib/discordEvents.js`

### Fonctions principales

```js
// Créer un événement Discord dans le serveur
async function createDiscordEvent(client, { title, description, startTime, endTime })

// Supprimer un événement Discord (si déjà terminé)
async function deleteDiscordEvent(client, eventId)

// Créer/mettre à jour l'événement Raid de la semaine courante
async function ensureRaidEvent(client)

// Créer/mettre à jour l'événement JDC du mois courant
async function ensureJdcEvent(client)

// Vérifier et envoyer les annonces 1 jour avant
async function checkEventAnnouncements(client)
```

### Logique `ensureRaidEvent`
```js
// Calculer le prochain vendredi 9h UTC
// Vérifier si un événement raid existe déjà cette semaine en DB
// Si non → créer l'événement Discord + enregistrer en DB
// Si oui → vérifier que l'événement Discord existe encore (pas supprimé manuellement)
```

### Logique `ensureJdcEvent`
```js
// Lire jdc_active, jdc_start, jdc_end depuis bot_config
// Si jdc_active = true → créer l'événement JDC si pas déjà créé ce mois
// Si jdc_active = false → rien à faire
```

### Logique `checkEventAnnouncements`
```js
// Pour chaque événement dans discord_events où announced = false
// Si start_time - maintenant <= 24h → envoyer annonce dans salon 1441176254769401969
// Marquer announced = true

// Format de l'annonce :
// 📅 **[titre de l'événement]**
// L'événement commence demain !
// 🕐 Début : [date heure]
// 🕑 Fin : [date heure]
// [description]
```

---

## Intégration scheduler

Dans `src/scheduler.js`, ajouter à chaque tick :

```js
const { ensureRaidEvent, ensureJdcEvent, checkEventAnnouncements } = require('./lib/discordEvents.js')

// Dans checkAndUpdate :
await ensureRaidEvent(client).catch(e => console.error('[Events] Raid:', e))
await ensureJdcEvent(client).catch(e => console.error('[Events] JDC:', e))
await checkEventAnnouncements(client).catch(e => console.error('[Events] Annonces:', e))
```

---

## Commande slash `/createevent` (admin)

Réservée au rôle Chef (`611123759864348672`).

### Modal de création
- Titre (obligatoire)
- Description (obligatoire)  
- Date début — format `JJ/MM/YYYY HH:MM` (obligatoire)
- Date fin — format `JJ/MM/YYYY HH:MM` (obligatoire)

### Comportement
1. Créer l'événement Discord dans le serveur
2. Enregistrer dans `discord_events` avec type = 'manual'
3. Réponse éphémère : "✅ Événement créé !"

---

## Permissions Discord requises

Le bot doit avoir la permission **MANAGE_EVENTS** sur le serveur.
Vérifier dans discord.com/developers → application → Bot → Privileged Gateway Intents.

---

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/lib/discordEvents.js` | Nouveau — toute la logique |
| `src/commands/createevent.js` | Nouveau — commande slash |
| `src/scheduler.js` | Modifier — ajouter les 3 appels |
| `migrations/discord_events.sql` | Nouveau — migration SQL |

---

## Notes importantes

1. **Anti-doublon** — vérifier en DB avant de créer un événement pour ne pas en créer deux fois
2. **Événements passés** — ne pas recréer un événement dont la date de fin est passée
3. **Permission MANAGE_EVENTS** — obligatoire, le bot plantera sinon
4. **Format dates Discord** — les événements Discord utilisent des timestamps Unix
