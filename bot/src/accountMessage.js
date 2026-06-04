const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('./supabase.js')
const { ACCOUNT_CHANNEL_ID } = require('./config/reminders.js')
const { getClanInfo } = require('./cocApi.js')

let accountMessageId = null

function buildAccountEmbed(badgeUrl) {
  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('⚔️ Espace Guerrier — Donjon Rouge')
    .setDescription('Bienvenue guerrier ! Accède à ton espace personnel ou explore les stats du clan.')
    .addFields({ name: '🔗 Pas encore lié ?', value: 'Utilise `/lier` pour associer ton compte CoC', inline: false })
    .setFooter({ text: 'Donjon Rouge • Espace Guerrier' })

  if (badgeUrl) embed.setThumbnail(badgeUrl)

  return embed
}

function buildAccountComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_warrior_space')
        .setLabel('👤 Mon espace guerrier')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('lier_compte')
        .setLabel('🔗 Lier mon compte')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('stats_clan')
        .setLabel('👥 Stats du clan')
        .setStyle(ButtonStyle.Secondary)
    )
  ]
}

async function getOrCreateAccountMessage(client) {
  const channel = await client.channels.fetch(ACCOUNT_CHANNEL_ID).catch(() => null)
  if (!channel) {
    console.error('[AccountMessage] Canal introuvable :', ACCOUNT_CHANNEL_ID)
    return
  }

  // Vérifie le cache mémoire
  if (accountMessageId) {
    try {
      await channel.messages.fetch(accountMessageId)
      return // Message existe — on ne touche pas au démarrage
    } catch {
      accountMessageId = null
    }
  }

  // Vérifie Supabase
  const { data } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', 'account_message_id')
    .maybeSingle()

  if (data?.value) {
    try {
      await channel.messages.fetch(data.value)
      accountMessageId = data.value
      return // Message existe — restaure l'ID sans éditer
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        await supabase.from('bot_config').delete().eq('key', 'account_message_id')
      } else {
        return // Erreur transitoire — ne pas recréer
      }
    }
  }

  // Nettoie le salon avant de créer un nouveau message
  await channel.bulkDelete(100).catch(() => {})

  let badgeUrl = null
  try {
    const clan = await getClanInfo()
    badgeUrl = clan?.badgeUrls?.large ?? clan?.badgeUrls?.medium ?? null
  } catch {
    console.warn('[AccountMessage] Badge du clan indisponible')
  }

  const payload = { embeds: [buildAccountEmbed(badgeUrl)], components: buildAccountComponents() }
  const msg = await channel.send(payload)
  await supabase
    .from('bot_config')
    .upsert({ key: 'account_message_id', value: msg.id, updated_at: new Date().toISOString() })
  accountMessageId = msg.id
  console.log(`[AccountMessage] Nouveau message créé : ${msg.id}`)
}

function getAccountMessageId() {
  return accountMessageId
}

module.exports = { getOrCreateAccountMessage, getAccountMessageId }
