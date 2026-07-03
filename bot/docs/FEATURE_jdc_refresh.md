# FEATURE — JDC Refresh & Intégration panel admin
## Bot Discord — Donjon Rouge

---

## Contexte

Cette feature ajoute deux choses manquantes au système JDC existant :
1. Un bouton **Actualiser** sous les embeds JDC dans le salon de tracking
2. L'intégration des JDC dans le **refresh global** du panel admin

---

## Fonctionnalité 1 — Bouton Actualiser dans le salon `1511988581135159376`

### Comportement
- Sous chaque embed JDC (DR1 et DR2), ajouter un bouton **🔄 Actualiser**
- Au clic → supprime l'ancien embed + reposte un embed frais avec les points à jour
- Réservé au rôle **Chef** (`611123759864348672`) — réponse éphémère d'erreur si autre rôle
- Réponse éphémère de confirmation : *"✅ Embed JDC mis à jour."*

### Implémentation

**Dans `src/lib/jdcTracker.js` — `buildJdcEmbed()`**
Ajouter un `ActionRow` avec un bouton sous l'embed :
```js
const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`jdc_refresh_${clan.key}`)  // ex: jdc_refresh_dr1 ou jdc_refresh_dr2
    .setLabel('Actualiser')
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Secondary)
)
// Retourner { embeds: [embed], components: [row] }
```

**Dans `src/events/interactionCreate.js`**
Ajouter le routing pour `jdc_refresh_dr1` et `jdc_refresh_dr2` :
```js
if (interaction.customId.startsWith('jdc_refresh_')) {
  const clanKey = interaction.customId.replace('jdc_refresh_', '') // 'dr1' ou 'dr2'
  await handleJdcRefresh(interaction, clanKey)
}
```

**Dans `src/lib/jdcTracker.js` — nouvelle fonction `handleJdcRefresh()`**
```js
async function handleJdcRefresh(interaction, clanKey) {
  // 1. Vérifier rôle Chef
  if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
    return interaction.reply({ content: '❌ Réservé aux Chefs.', ephemeral: true })
  }
  await interaction.deferReply({ ephemeral: true })

  // 2. Supprimer l'ancien message embed de bot_config
  await supabase.from('bot_config')
    .delete()
    .eq('key', `jdc_embed_${clanKey}_id`)

  // 3. Récupérer les données fraîches et repost
  const startStr = await getConfig('jdc_start')
  const endStr   = await getConfig('jdc_end')
  const season   = startStr ? startStr.slice(0, 7) : new Date().toISOString().slice(0, 7)
  const clan     = CLANS.find(c => c.key === clanKey)
  const channel  = await client.channels.fetch(JDC_TRACKING_CHANNEL)
  const members  = await fetchClanMembersWithPoints(clanKey, season)
  const embed    = buildJdcEmbed(clan, members, startStr, endStr)
  await ensureJdcMessage(channel, `jdc_embed_${clanKey}_id`, embed)

  await interaction.editReply({ content: '✅ Embed JDC mis à jour.' })
}
```

**Exporter `handleJdcRefresh` depuis `jdcTracker.js`**

---

## Fonctionnalité 2 — Refresh global dans le panel admin (`1512087471373029508`)

### Contexte
Le panel admin dispose déjà d'un bouton de refresh pour les raids et la guerre.
Il faut ajouter un bouton **🎮 Refresh JDC** dans ce panel.

### Bouton à ajouter
```
[ 🔄 Refresh Guerre ]  [ 🔄 Refresh Raid ]
[ 🎮 Refresh JDC    ]                        ← NOUVEAU
```

**Button custom_id :** `admin_refresh_jdc`

### Comportement au clic
1. Vérifier rôle Chef
2. Supprimer `jdc_embed_dr1_id` ET `jdc_embed_dr2_id` de `bot_config`
3. Appeler `updateJdcEmbeds(client)` pour repost les deux embeds DR1 + DR2
4. Réponse éphémère : *"✅ Embeds JDC DR1 et DR2 actualisés."*

### Fichiers à modifier
- `src/setup/sendMessagingPanel.js` (ou fichier du panel admin) → ajouter le bouton `admin_refresh_jdc`
- `src/lib/panelHandlers.js` → ajouter le handler `admin_refresh_jdc`
- `src/events/interactionCreate.js` → router `admin_refresh_jdc`
- `src/lib/jdcTracker.js` → exporter `updateJdcEmbeds` si pas déjà fait (vérifier)

### Handler dans `panelHandlers.js`
```js
async function handleAdminRefreshJdc(interaction, client) {
  if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
    return interaction.reply({ content: '❌ Réservé aux Chefs.', ephemeral: true })
  }
  await interaction.deferReply({ ephemeral: true })

  // Supprimer les anciens IDs pour forcer la recréation
  await supabase.from('bot_config')
    .delete()
    .in('key', ['jdc_embed_dr1_id', 'jdc_embed_dr2_id'])

  // Repost les deux embeds
  await updateJdcEmbeds(client)

  await interaction.editReply({ content: '✅ Embeds JDC DR1 et DR2 actualisés.' })
}
```

---

## Résumé des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/lib/jdcTracker.js` | Ajouter bouton 🔄 dans `buildJdcEmbed()`, ajouter `handleJdcRefresh()`, exporter les deux |
| `src/events/interactionCreate.js` | Router `jdc_refresh_dr1`, `jdc_refresh_dr2`, `admin_refresh_jdc` |
| `src/lib/panelHandlers.js` | Ajouter `handleAdminRefreshJdc()` |
| `src/setup/sendMessagingPanel.js` | Ajouter bouton `admin_refresh_jdc` dans le panel |

---

## Notes

- Le bouton **🔄 Actualiser** dans le salon tracking est visible par tous mais ne fonctionne que pour les Chefs
- Le refresh supprime toujours l'ancien message et en crée un nouveau (pas un simple edit) pour éviter les embeds corrompus
- Si `jdc_active = false`, le refresh répond : *"Aucun Jeux de Clan en cours."*
