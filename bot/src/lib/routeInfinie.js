const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js')
const supabase = require('../supabase.js')

const ROUTE_CHANNEL_ID = '1520108333846233098'
const PANEL_CHANNEL_ID = '1520111778766262386'
const CYBERALF_ID      = '610765755553939456'

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getRouteState() {
  const { data } = await supabase.from('route_infinie').select('*').eq('active', true).maybeSingle()
  return data
}

async function updateRouteState(num, discordId) {
  const now = new Date().toISOString()
  await supabase.from('route_infinie').update({
    current_number:  num,
    last_discord_id: discordId,
    last_time:       now,
    updated_at:      now,
  }).eq('active', true)
}

async function getCooldown(discordId) {
  const { data } = await supabase
    .from('route_infinie_cooldowns')
    .select('last_time')
    .eq('discord_id', discordId)
    .maybeSingle()
  return data?.last_time ?? null
}

async function setCooldown(discordId) {
  await supabase.from('route_infinie_cooldowns').upsert(
    { discord_id: discordId, last_time: new Date().toISOString() },
    { onConflict: 'discord_id' }
  )
}

async function resetGift() {
  await supabase.from('route_infinie').update({
    gift_number: null,
    updated_at:  new Date().toISOString(),
  }).eq('active', true)
}

// ─── Jeu ─────────────────────────────────────────────────────────────────────

async function sendError(message, content) {
  const errMsg = await message.channel.send({ content }).catch(() => null)
  if (errMsg) setTimeout(() => errMsg.delete().catch(() => {}), 5000)
}

async function announceGift(message, state) {
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('🎊 CADEAU TROUVÉ ! 🎊')
    .setDescription([
      `🎉 Félicitations <@${message.author.id}> !`,
      `Tu es tombé sur le nombre magique **${state.gift_number}** !`,
      ``,
      `🎁 **Cadeau :** ${state.gift_desc}`,
      ``,
      `📩 Contact <@${CYBERALF_ID}> pour le réclamer !`,
    ].join('\n'))
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Route de l\'Infinie • Donjon Rouge' })
    .setTimestamp()

  await message.channel.send({ content: '@everyone', embeds: [embed] })
  await resetGift()
}

async function handleRouteMessage(message) {
  if (message.author.id === CYBERALF_ID) {
    const trimmed = message.content.trim()
    const num     = parseInt(trimmed, 10)
    if (!isNaN(num) && num.toString() === trimmed && num >= 1) {
      const state = await getRouteState()
      await updateRouteState(num, CYBERALF_ID)
      if (state?.gift_number && num === state.gift_number) {
        await announceGift(message, state)
      }
    }
    return
  }

  const trimmed = message.content.trim()
  const num     = parseInt(trimmed, 10)

  if (isNaN(num) || num.toString() !== trimmed || num < 1) {
    await message.delete().catch(() => {})
    return sendError(message, `❌ Tu n'es pas autorisé à écrire du texte ici !`)
  }

  const state = await getRouteState()
  if (!state) return

  if (num !== state.current_number + 1) {
    await message.delete().catch(() => {})
    return sendError(message, `❌ Ce nombre n'est pas correct ! Le prochain nombre est **${state.current_number + 1}**.`)
  }

  if (message.author.id === state.last_discord_id) {
    await message.delete().catch(() => {})
    return sendError(message, `❌ Un autre joueur doit d'abord réagir avant toi !`)
  }

  const cooldown = await getCooldown(message.author.id)
  if (cooldown) {
    const elapsed   = Date.now() - new Date(cooldown).getTime()
    const remaining = 3600000 - elapsed
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60000)
      await message.delete().catch(() => {})
      return sendError(message, `⏳ Tu dois attendre encore **${minutes} minute${minutes > 1 ? 's' : ''}** avant de jouer à nouveau !`)
    }
  }

  await updateRouteState(num, message.author.id)
  await setCooldown(message.author.id)

  if (state.gift_number && num === state.gift_number) {
    await announceGift(message, state)
  }
}

// ─── Panel admin ──────────────────────────────────────────────────────────────

function buildPanelEmbed(state) {
  const lastPlayer = state.last_discord_id ? `<@${state.last_discord_id}>` : 'Aucun'
  const giftLine   = state.gift_number ? `${state.gift_number.toLocaleString('fr-FR')} 🎁` : '❌ Non défini'
  const giftDesc   = state.gift_desc ?? '—'
  const statut     = state.active ? '✅ Actif' : '❌ Inactif'

  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🗺️ ROUTE DE L\'INFINIE — PANEL ADMIN')
    .setDescription([
      '📊 **État actuel :**',
      `• Nombre actuel : **${state.current_number.toLocaleString('fr-FR')}**`,
      `• Dernier joueur : ${lastPlayer}`,
      `• Cadeau caché sur : ${giftLine}`,
      `• Description du cadeau : ${giftDesc}`,
      `• Statut : ${statut}`,
    ].join('\n'))
    .setFooter({ text: 'Route de l\'Infinie • Panel Admin' })
    .setTimestamp()
}

function buildPanelComponents() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('route_set_gift').setLabel('🎁 Définir cadeau').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('route_view').setLabel('🔢 Voir progression').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('route_reset').setLabel('🔄 Reset').setStyle(ButtonStyle.Danger),
  )
}

async function refreshPanelEmbed(client, state) {
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'route_panel_msg_id').maybeSingle()
  if (!data?.value) return
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null)
  if (!channel) return
  const msg = await channel.messages.fetch(data.value).catch(() => null)
  if (!msg) return
  await msg.edit({ embeds: [buildPanelEmbed(state)], components: [buildPanelComponents()] })
}

// ─── Handlers boutons ─────────────────────────────────────────────────────────

async function handleRouteSetGift(interaction) {
  if (interaction.user.id !== CYBERALF_ID) {
    return interaction.reply({ content: '❌ Ce panel est réservé.', ephemeral: true })
  }

  const state = await getRouteState()

  const modal = new ModalBuilder()
    .setCustomId('modal_route_set_gift')
    .setTitle('Définir le cadeau secret')

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('route_gift_number')
        .setLabel('Nombre gagnant (secret)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ex: 1500')
        .setValue(state?.gift_number ? String(state.gift_number) : '')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('route_gift_desc')
        .setLabel('Description du cadeau')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ex: 500 gemmes CoC !')
        .setValue(state?.gift_desc ?? '')
        .setRequired(true)
    )
  )

  await interaction.showModal(modal)
}

async function handleRouteView(interaction) {
  if (interaction.user.id !== CYBERALF_ID) {
    return interaction.reply({ content: '❌ Ce panel est réservé.', ephemeral: true })
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const state = await getRouteState()
  await refreshPanelEmbed(interaction.client, state)
  await interaction.editReply('✅ Panel actualisé.')
}

async function handleRouteReset(interaction) {
  if (interaction.user.id !== CYBERALF_ID) {
    return interaction.reply({ content: '❌ Ce panel est réservé.', ephemeral: true })
  }

  const confirmRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('route_reset_confirm').setLabel('✅ Confirmer').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('route_reset_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
  )

  const reply = await interaction.reply({
    content: '⚠️ Remettre le compteur à 0 ? Le cadeau est conservé.',
    components: [confirmRow],
    ephemeral: true,
    fetchReply: true,
  })

  let collected
  try {
    collected = await reply.awaitMessageComponent({
      time: 30_000,
      filter: i => i.user.id === CYBERALF_ID,
    })
  } catch {
    return interaction.editReply({ content: 'Annulé (délai expiré).', components: [] })
  }

  await collected.deferUpdate()

  if (collected.customId === 'route_reset_cancel') {
    return interaction.editReply({ content: '❌ Annulé.', components: [] })
  }

  await supabase.from('route_infinie').update({
    current_number:  0,
    last_discord_id: null,
    last_time:       null,
    updated_at:      new Date().toISOString(),
  }).eq('active', true)

  const state = await getRouteState()
  await refreshPanelEmbed(interaction.client, state)
  await interaction.editReply({ content: '✅ Compteur remis à zéro.', components: [] })
}

// ─── Handler modal ────────────────────────────────────────────────────────────

async function handleModalRouteSetGift(interaction) {
  if (interaction.user.id !== CYBERALF_ID) {
    return interaction.reply({ content: '❌ Ce panel est réservé.', ephemeral: true })
  }

  const giftNumRaw = interaction.fields.getTextInputValue('route_gift_number').trim()
  const giftDesc   = interaction.fields.getTextInputValue('route_gift_desc').trim()
  const giftNum    = parseInt(giftNumRaw, 10)

  if (isNaN(giftNum) || giftNum <= 0) {
    return interaction.reply({ content: '❌ Nombre invalide. Saisis un entier positif.', ephemeral: true })
  }

  await supabase.from('route_infinie').update({
    gift_number: giftNum,
    gift_desc:   giftDesc,
    updated_at:  new Date().toISOString(),
  }).eq('active', true)

  const state = await getRouteState()
  await refreshPanelEmbed(interaction.client, state)

  await interaction.reply({
    content: `✅ Cadeau défini sur le nombre **${giftNum.toLocaleString('fr-FR')}** : ${giftDesc}`,
    ephemeral: true,
  })
}

module.exports = {
  ROUTE_CHANNEL_ID,
  PANEL_CHANNEL_ID,
  handleRouteMessage,
  buildPanelEmbed,
  buildPanelComponents,
  handleRouteSetGift,
  handleRouteView,
  handleRouteReset,
  handleModalRouteSetGift,
}
