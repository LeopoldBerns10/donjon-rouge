# FEATURE — Refonte système de rappels
## Bot Discord — Donjon Rouge

---

## Contexte

Refonte complète du système de rappels dans le salon `1510972919407317142`.

Actuellement : les rappels sont des messages temporaires supprimés après 2h.
Objectif : deux types de messages persistants par événement actif.

---

## Principe général

Pour chaque événement actif (Guerre DR1, Guerre DR2, Raid, JDC) :

### Message 1 — Embed liste (sans ping)
- Embed persistant avec la liste des retardataires
- **Pas de mentions** — juste les noms
- Mis à jour **toutes les heures** par le scheduler
- Reste visible en permanence jusqu'à la fin de l'événement
- Stocké dans `bot_config` avec une clé dédiée

### Message 2 — Message mentions (avec ping)
- Message avec @mentions des retardataires
- Envoyé à **10h et 20h** uniquement
- **Remplace l'ancien** message de mentions (supprime avant d'envoyer)
- Reste visible jusqu'au prochain envoi (10h ou 20h)
- Stocké dans `bot_config` avec une clé dédiée

---

## Clés bot_config

| Clé | Description |
|-----|-------------|
| `rappel_embed_dr1_id` | ID embed liste DR1 |
| `rappel_embed_dr2_id` | ID embed liste DR2 |
| `rappel_embed_raid_id` | ID embed liste Raid |
| `rappel_embed_jdc_id` | ID embed liste JDC |
| `rappel_ping_dr1_id` | ID message mentions DR1 |
| `rappel_ping_dr2_id` | ID message mentions DR2 |
| `rappel_ping_raid_id` | ID message mentions Raid |
| `rappel_ping_jdc_id` | ID message mentions JDC |

---

## Embed liste — format

### Guerre DR1 / DR2
```
⚔️ RETARDATAIRES GUERRE — DR1
📅 Guerre en cours • Mis à jour il y a 2 min

Membres sans attaque :
• CyberAlf
• Jérémie
• KD2L

3 membres n'ont pas encore attaqué
```

### Raid Capital
```
💎 RETARDATAIRES RAID CAPITAL
📅 Raid en cours • Mis à jour il y a 2 min

Membres sans attaque raid :
• CyberAlf
• Jérémie

2 membres n'ont pas encore raidé
```

### JDC
```
🎮 RETARDATAIRES JDC
📅 Jeux de Clan en cours • Mis à jour il y a 2 min

Membres à 0 pts :
• Hibou.KD
• Barbar

Membres en cours (< 5 000 pts) :
• KD2L — 3 350 pts
• Hisoka — 4 600 pts

12 membres n'ont pas atteint l'objectif DR (5 000 pts)
```

**Si événement inactif :**
```
⚔️ RETARDATAIRES GUERRE — DR1
😴 Aucune guerre en cours
```

---

## Message mentions — format

### Guerre
```
⚔️ @membre1 @membre2 @membre3
Vous n'avez pas encore attaqué en guerre DR1 !
Il reste X heures — chaque attaque compte ! ⚔️
```

### Raid
```
💎 @membre1 @membre2
Vous n'avez pas encore participé au Raid Capital !
Le raid se termine lundi à 9h ⏰
```

### JDC — 0 pts
```
🎮 @membre1 @membre2
Jeux de Clan en cours ! Vous n'avez pas encore participé.
Objectif DR : 5 000 pts minimum 🎯
```

### JDC — en cours
```
🔥 @membre1 (3 350 pts) @membre2 (4 600 pts)
Tu es en bonne voie mais l'objectif DR est 5 000 pts !
```

---

## Intégration scheduler

### Toutes les heures — mettre à jour les embeds liste
```js
// Dans scheduler.js
await updateRappelEmbeds(client)  // met à jour les 4 embeds liste
```

### À 10h et 20h — envoyer les mentions
```js
const hour = new Date().getUTCHours() + 2 // heure Paris
if (hour === 10 || hour === 20) {
  await sendRappelPings(client)  // envoie/remplace les messages mentions
}
```

---

## Nouveau fichier — `src/lib/rappelManager.js`

Centralise toute la logique des rappels :

```js
// Fonctions principales
async function updateRappelEmbeds(client)  // met à jour les 4 embeds liste
async function sendRappelPings(client)     // envoie les messages mentions à 10h/20h
async function buildWarRappelEmbed(clanKey, members)  // construit l'embed guerre
async function buildRaidRappelEmbed(members)           // construit l'embed raid
async function buildJdcRappelEmbed(members)            // construit l'embed JDC
async function ensureRappelEmbed(channel, key, embed)  // gère le message persistant
async function replacePingMessage(channel, key, content) // remplace le message mentions
```

---

## Suppression de l'ancien système

- Supprimer les messages auto-supprimés après 2h dans `scheduler.js`
- Supprimer `checkJdcReminders` dans `jdcTracker.js` (remplacé par `sendRappelPings`)
- Les anciennes clés `reminder_dr1_msg`, `reminder_dr2_msg`, `reminder_raid_msg` restent pour les embeds existants dans le salon rappel — **ne pas toucher aux embeds DR1/DR2/Raid existants** qui fonctionnent déjà

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/lib/rappelManager.js` | Nouveau fichier — toute la logique rappels |
| `src/scheduler.js` | Remplacer les anciens rappels par `updateRappelEmbeds` + `sendRappelPings` à 10h/20h |
| `src/lib/jdcTracker.js` | Supprimer `checkJdcReminders` |
| `src/commands/refreshrappel.js` | Adapter pour appeler `updateRappelEmbeds` + `sendRappelPings` |
| `src/lib/panelHandlers.js` | Adapter `handleAdminRefreshRappel` |

---

## Notes importantes

1. **Heures Paris** — le scheduler tourne en UTC, ajouter +2h (CEST) pour cibler 10h et 20h heure locale
2. **Événement inactif** — si guerre/raid/JDC inactif, l'embed liste affiche "Aucun événement en cours" et le message mentions n'est pas envoyé
3. **Aucune mention dans les embeds** — les embeds liste n'utilisent jamais @mention, seulement les noms
4. **Un seul message mentions par événement** — toujours remplacer l'ancien avant d'envoyer le nouveau
5. **Membres sans compte lié** — si un membre CoC n'a pas de compte Discord lié dans `discord_links`, afficher son nom CoC dans l'embed mais ne pas le mentionner dans le ping
