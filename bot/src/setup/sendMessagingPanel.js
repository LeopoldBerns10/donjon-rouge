const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')
const { MESSAGING_CHANNEL_ID } = require('../config/messaging.js')

async function sendMessagingPanel(client) {
  const channel = await client.channels.fetch(MESSAGING_CHANNEL_ID)
  if (!channel) throw new Error('Salon de messagerie introuvable.')

  // Supprimer l'ancien panel s'il existe
  const { data: existing } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', 'messaging_panel_id')
    .maybeSingle()

  if (existing?.value) {
    await channel.messages.fetch(existing.value)
      .then(m => m.delete())
      .catch(() => {})
  }

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('📨 Centre de messagerie — Donjon Rouge')
    .setDescription('Envoie des messages privés ciblés aux membres via le bot.')
    .addFields(
      {
        name: '📋 Comment ça marche',
        value: '1️⃣ Clique sur un bouton ci-dessous\n2️⃣ Sélectionne les destinataires\n3️⃣ Choisis ou écris ton message\n4️⃣ Confirme l\'envoi',
        inline: false,
      },
      {
        name: '⚡ Envois rapides',
        value: '⚔️ Rappel GDC/LDC — membres sans attaque\n💎 Rappel Raid — membres sans attaque raid\n📋 Message personnalisé — sélection manuelle',
        inline: false,
      },
      {
        name: '🔧 Commandes disponibles',
        value: '`/msg-rappel-guerre` — rappel aux retardataires guerre\n`/msg-rappel-raid` — rappel aux non-raideurs\n`/msg-custom` — message personnalisé',
        inline: false,
      },
    )
    .setTimestamp()

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('msg_rappel_guerre').setLabel('⚔️ Rappel Guerre').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('msg_rappel_raid').setLabel('💎 Rappel Raid').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('messaging_jdc_reminder').setLabel('🎮 Rappel JDC').setStyle(ButtonStyle.Success),
  )
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_refresh_war').setLabel('🔄 War').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('admin_refresh_raid').setLabel('🔄 Raid').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('admin_refresh_jdc').setLabel('🔄 JDC').setStyle(ButtonStyle.Secondary),
  )
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_refresh_league').setLabel('🔄 Ligues').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('admin_refresh_status').setLabel('🔄 Statut').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('admin_refresh_rappel').setLabel('🔄 Rappels').setStyle(ButtonStyle.Secondary),
  )
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('msg_custom').setLabel('✏️ Message personnalisé').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('msg_global').setLabel('📢 Message global').setStyle(ButtonStyle.Danger),
  )
  const row5 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('admin_create_event').setLabel('📅 Créer événement').setStyle(ButtonStyle.Success),
  )

  const msg = await channel.send({ embeds: [embed], components: [row1, row2, row3, row4, row5] })
  await supabase.from('bot_config').upsert({ key: 'messaging_panel_id', value: msg.id, updated_at: new Date().toISOString() })
  return msg
}

module.exports = { sendMessagingPanel }
