# FEATURE — Route de l'Infinie
## Bot Discord — Donjon Rouge

---

## Contexte

Jeu de comptage communautaire dans le salon dédié.
Les membres écrivent des nombres à la suite, un par un, avec un cadeau caché sur un nombre secret.

---

## Salons

| Usage | Channel ID |
|-------|-----------|
| Route de l'Infinie (jeu) | `1520108333846233098` |
| Panel CyberAlf (admin secret) | `1520111778766262386` |

---

## Règles du jeu

1. Chaque membre écrit le nombre suivant dans le salon `1520108333846233098`
2. Un membre ne peut pas écrire deux nombres consécutifs — il faut qu'un autre membre écrive entre les deux
3. Un membre doit attendre **1h** entre deux participations (sauf CyberAlf `610765755553939456`)
4. Seuls les nombres valides (= nombre précédent + 1) sont acceptés
5. Les mauvais messages sont supprimés avec un message éphémère d'erreur
6. CyberAlf peut poster des messages normaux que le bot laisse passer
7. Un cadeau est caché sur un nombre secret — quand atteint, le bot annonce le gagnant
8. La suite continue depuis le nombre atteint après le cadeau

---

## Nouvelle table Supabase — `route_infinie`

```sql
CREATE TABLE IF NOT EXISTS route_infinie (
  id              SERIAL PRIMARY KEY,
  current_number  INTEGER NOT NULL DEFAULT 0,
  last_discord_id TEXT,              -- dernier membre à avoir écrit
  last_time       TIMESTAMPTZ,       -- heure du dernier message
  gift_number     INTEGER,           -- nombre gagnant secret
  gift_desc       TEXT,              -- description du cadeau
  active          BOOLEAN DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Une seule ligne de config
INSERT INTO route_infinie (current_number, active) VALUES (0, true)
ON CONFLICT DO NOTHING;
```

### Nouvelle table — `route_infinie_cooldowns`

```sql
CREATE TABLE IF NOT EXISTS route_infinie_cooldowns (
  discord_id  TEXT PRIMARY KEY,
  last_time   TIMESTAMPTZ NOT NULL
);
```

---

## Fonctionnement — `src/lib/routeInfinie.js`

### `handleRouteMessage(message)`

Appelé depuis `messageCreate` pour chaque message dans le salon `1520108333846233098`.

```js
// 1. Si auteur = CyberAlf (610765755553939456) → laisser passer sans vérification
if (message.author.id === CYBERALF_ID) return

// 2. Supprimer tout message qui n'est pas un nombre entier positif
const num = parseInt(message.content.trim())
if (isNaN(num) || num.toString() !== message.content.trim()) {
  await message.delete()
  return message.channel.send({ content: `❌ <@${message.author.id}> Seuls les nombres sont autorisés ici !`, flags: 64 })
}

// 3. Vérifier que c'est le bon nombre (current + 1)
const state = await getRouteState()
if (num !== state.current_number + 1) {
  await message.delete()
  return message.reply({ content: `❌ Le prochain nombre est **${state.current_number + 1}** !`, ephemeral: true })
}

// 4. Vérifier que ce n'est pas le même membre que le dernier
if (message.author.id === state.last_discord_id) {
  await message.delete()
  return message.reply({ content: `❌ Tu ne peux pas écrire deux nombres consécutifs ! Attends qu'un autre membre joue.`, ephemeral: true })
}

// 5. Vérifier le cooldown 1h
const cooldown = await getCooldown(message.author.id)
if (cooldown && Date.now() - new Date(cooldown).getTime() < 3600000) {
  const remaining = Math.ceil((3600000 - (Date.now() - new Date(cooldown).getTime())) / 60000)
  await message.delete()
  return message.reply({ content: `⏳ Tu dois attendre encore **${remaining} minutes** avant de rejouer !`, ephemeral: true })
}

// 6. Nombre valide → mettre à jour l'état
await updateRouteState(num, message.author.id)
await setCooldown(message.author.id)

// 7. Vérifier si c'est le nombre gagnant
if (state.gift_number && num === state.gift_number) {
  await announceGift(message, state)
}
```

### `announceGift(message, state)`

```js
// Poster un embed festif dans le salon
const embed = new EmbedBuilder()
  .setColor(0xFFD700)
  .setTitle('🎊 CADEAU TROUVÉ ! 🎊')
  .setDescription([
    `🎉 Félicitations <@${message.author.id}> !`,
    `Tu es tombé sur le nombre magique **${state.gift_number}** !`,
    ``,
    `🎁 **Cadeau :** ${state.gift_desc}`,
    ``,
    `📩 Contact <@610765755553939456> pour le réclamer !`,
  ].join('\n'))
  .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
  .setFooter({ text: 'Route de l\'Infinie • Donjon Rouge' })
  .setTimestamp()

await message.channel.send({ content: `@everyone`, embeds: [embed] })

// Réinitialiser le cadeau (gift_number = null) jusqu'au prochain choix
await resetGift()
```

---

## Panel CyberAlf — salon `1520111778766262386`

### Accès
**Réservé exclusivement à CyberAlf** (`610765755553939456`).
Si quelqu'un d'autre clique sur un bouton → message éphémère "❌ Ce panel est réservé."

### Commande `/setuprouteinfinie`
Admin only → poste le panel dans le salon `1520111778766262386`.

### Format de l'embed panel
```
🗺️ ROUTE DE L'INFINIE — PANEL ADMIN

📊 État actuel :
• Nombre actuel : 1 247
• Dernier joueur : @CyberAlf
• Cadeau caché sur : ??? (secret)
• Description du cadeau : Une gemme rare !
• Statut : ✅ Actif
```

### Boutons
```
[ 🎁 Définir cadeau ]  [ 🔢 Voir progression ]  [ 🔄 Reset ]
```

| Bouton | custom_id | Action |
|--------|-----------|--------|
| 🎁 Définir cadeau | `route_set_gift` | Modal : nombre gagnant + description cadeau |
| 🔢 Voir progression | `route_view` | Refresh l'embed avec l'état actuel |
| 🔄 Reset | `route_reset` | Remet le compteur à 0 (avec confirmation) |

### Modal "Définir cadeau" (`modal_route_set_gift`)
- Champ 1 : "Nombre gagnant (secret)" — ex: 1500
- Champ 2 : "Description du cadeau" — ex: "500 gemmes CoC !"

### Embed panel mis à jour après modal
```
🗺️ ROUTE DE L'INFINIE — PANEL ADMIN

📊 État actuel :
• Nombre actuel : 1 247
• Dernier joueur : @membre
• Cadeau caché sur : 1 500 🎁
• Description : 500 gemmes CoC !
• Statut : ✅ Actif
```

---

## Intégration `messageCreate`

Dans `src/events/messageCreate.js` (ou créer le fichier si inexistant) :

```js
const { handleRouteMessage } = require('../lib/routeInfinie.js')
const ROUTE_CHANNEL_ID = '1520108333846233098'

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot) return
    if (message.channelId === ROUTE_CHANNEL_ID) {
      await handleRouteMessage(message)
    }
  }
}
```

---

## Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `src/lib/routeInfinie.js` | Logique complète du jeu |
| `src/commands/setuprouteinfinie.js` | Commande setup panel |
| `migrations/route_infinie.sql` | Migration SQL |

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/events/messageCreate.js` | Ajouter routing vers `handleRouteMessage` |
| `src/events/interactionCreate.js` | Router `route_set_gift`, `route_view`, `route_reset` + modal |
| `index.js` | Charger la commande `/setuprouteinfinie` |

---

## Design du salon

Les messages dans le salon seront épurés — uniquement les nombres des membres et les messages de CyberAlf. Les messages d'erreur sont éphémères donc invisibles pour les autres.

Quand un cadeau est trouvé, l'embed festif doré 🏆 sera visible par tous avec @everyone.

---

## Notes importantes

1. **CyberAlf bypass tout** — ses messages ne sont jamais supprimés ni vérifiés
2. **Cooldown 1h** stocké dans `route_infinie_cooldowns` — persistant même si le bot redémarre
3. **Le nombre gagnant est secret** — dans l'embed panel il est visible pour CyberAlf uniquement
4. **Reset** remet `current_number = 0` et `last_discord_id = null` mais conserve le cadeau
5. **Si pas de cadeau défini** — le jeu continue normalement sans annoncer de gagnant
