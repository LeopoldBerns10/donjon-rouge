# FEATURE — Salon de logs du bot

## Objectif

Créer un système de logging centralisé qui poste toutes les actions du bot dans un salon privé réservé à CyberAlf.

## Salon

**ID :** `1522722935918559364`
**Accès :** CyberAlf uniquement (salon privé Discord)

---

## Nouveau fichier — `src/lib/botLogger.js`

Créer un module singleton qui expose une fonction `log(client, action, details)` :

```js
const LOG_CHANNEL_ID = '1522722935918559364'

async function log(client, category, message, isError = false) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
  const emoji = isError ? '🔴' : getCategoryEmoji(category)
  
  await channel.send(`${emoji} \`[${timestamp}]\` **${category}** — ${message}`).catch(() => {})
}

function getCategoryEmoji(category) {
  const emojis = {
    'SCHEDULER': '⚙️',
    'COMMANDE': '🎮',
    'BOUTON': '🖱️',
    'ANNIVERSAIRE': '🎂',
    'SONDAGE': '📊',
    'ROUTE': '🗺️',
    'GUERRE': '⚔️',
    'RAID': '💎',
    'JDC': '🎮',
    'MEMBRE': '👤',
    'ERREUR': '🔴',
    'EVENT': '📅',
    'GDC': '✉️',
  }
  return emojis[category] ?? '📝'
}

module.exports = { log }
```

---

## Actions à logger

### Scheduler (automatique)
- Embeds rappel mis à jour (toutes les 30min) — log groupé une fois par heure max
- Pings guerre envoyés à 10h et 20h
- Anniversaires souhaités
- Stats hebdomadaires envoyées
- Snapshot mensuel pris
- Messages GDC dimanche/mardi envoyés
- Refresh ligue du lundi
- Événements Discord créés automatiquement
- Erreurs scheduler

### Commandes slash
- `/refreshrappel` — qui l'a lancé
- `/refreshjdc` — qui l'a lancé
- `/refreshraid` — qui l'a lancé
- `/createevent` — titre + dates
- `/setupanniversaire`, `/setuppoll`, `/setuprouteinfinie`
- `/classement` — qui l'a consulté
- Toute commande admin

### Boutons panel
- Messages envoyés (rappel guerre, raid, JDC, custom, global)
- Modifications de messages (arrivée, départ, GDC dimanche/mardi)
- Actions Route de l'Infinie (cadeau défini, reset)
- Création/fin de sondage

### Événements membres
- Nouveau membre arrivé (username)
- Membre parti (username)
- Compte CoC lié (/lier)
- Compte CoC délié (/delier)

### Erreurs
- Toute erreur catchée dans interactionCreate.js
- Erreurs scheduler
- Erreurs API CoC

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/lib/botLogger.js` | Nouveau — module logging |
| `src/scheduler.js` | Ajouter logs actions automatiques importantes |
| `src/events/interactionCreate.js` | Ajouter logs commandes + boutons + erreurs |
| `src/events/guildMemberAdd.js` | Logger arrivée membre |
| `src/events/guildMemberRemove.js` | Logger départ membre |
| `src/lib/birthdayManager.js` | Logger souhaits anniversaire |
| `src/lib/pollManager.js` | Logger création/fin sondage |
| `src/lib/routeInfinie.js` | Logger cadeau défini + reset |
| `src/lib/discordEvents.js` | Logger événements créés |
| `src/lib/rappelManager.js` | Logger pings envoyés |

---

## Contraintes

- Ne jamais bloquer une action si le log échoue (toujours `.catch(() => {})`)
- Limiter le spam : pour les actions répétitives (embeds toutes les 30min), logger au maximum 1 fois par heure via anti-doublon
- Ne pas logger les actions de routine si elles ne changent rien (ex: embed édité = même contenu)
- Les erreurs sont toujours loggées même si répétitives

---

## Format des messages

```
⚙️ [03/07/2026 14:30] SCHEDULER — Embeds rappel mis à jour (DR1 notInWar, DR2 notInWar, Raid ongoing)
🎮 [03/07/2026 14:31] COMMANDE — /refreshrappel lancé par CyberAlf
👤 [03/07/2026 14:32] MEMBRE — Nouveau membre : username a rejoint le serveur
🎂 [03/07/2026 14:33] ANNIVERSAIRE — Souhait envoyé à @membre (25 ans)
🔴 [03/07/2026 14:34] ERREUR — scheduler.js: Cannot read property of undefined
```

