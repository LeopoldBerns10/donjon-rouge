const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js')
const supabase = require('../supabase.js')
const { AUTHORIZED_USERS, MESSAGING_CHANNEL_ID } = require('../config/messaging.js')
const { getCurrentWar, getLdcCurrent, getLdcCurrentDR2, getRaidSeasons, getClanMembers, getClanMembersDR2, apiGet } = require('../cocApi.js')
const { fetchJdcMembersUnder5000 } = require('./jdcTracker.js')

const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'
const CHEF_ROLE_ID = '611123759864348672'

// Sessions en attente de confirmation
const pendingRappels = new Map()
const pendingCustom  = new Map()
const pendingJdc     = new Map()

// ─── Autorisation ─────────────────────────────────────────────────────────────

function isAuthorized(userId, member) {
  if (AUTHORIZED_USERS.includes(userId)) return true
  if (member?.roles?.cache?.has(CHEF_ROLE_ID)) return true
  return false
}

// ─── Fetch données ─────────────────────────────────────────────────────────────

function normalizeWar(war, ourTag) {
  if (!war || war.clan?.tag === ourTag) return war
  if (war.opponent?.tag === ourTag) return { ...war, clan: war.opponent, opponent: war.clan }
  return war
}

async function fetchWarMembersNoAttack() {
  const targets = []
  const seen    = new Set()

  const addMembers = (war) => {
    for (const m of (war?.clan?.members || [])) {
      if ((m.attacks?.length ?? 0) === 0 && !seen.has(m.tag)) {
        seen.add(m.tag)
        targets.push({ name: m.name, tag: m.tag })
      }
    }
  }

  // Même priorité que checkWarReminders()/fetchWarData() : un round LDC "inWar"
  // prime sur un round "preparation", et une GDC classique remplace la LDC
  // si elle est elle-même inWar.
  const findActiveRound = (ldc) =>
    ldc?.rounds?.find(r => r.war?.state === 'inWar') ||
    ldc?.rounds?.find(r => r.war?.state === 'preparation')

  // DR1
  try {
    let war = await getCurrentWar()
    if (!war || war.state === 'notInWar' || war.state === 'warEnded') {
      const ldc = await getLdcCurrent()
      const round = findActiveRound(ldc)
      if (round?.war) war = normalizeWar(round.war, DR1_TAG)
    }
    if (war?.state === 'inWar') addMembers(war)
  } catch {}

  // DR2
  try {
    let war = await apiGet('/clan/dr2/war').catch(() => null)
    if (!war || war.state === 'notInWar' || war.state === 'warEnded') {
      const ldc2 = await getLdcCurrentDR2()
      const round2 = findActiveRound(ldc2)
      if (round2?.war) war = normalizeWar(round2.war, DR2_TAG)
    }
    if (war?.state === 'inWar') addMembers(war)
  } catch {}

  return targets
}

async function fetchRaidMembersNoAttack() {
  try {
    const data   = await getRaidSeasons()
    const latest = data?.items?.[0]
    if (!latest?.startTime) return []
    const start = new Date(latest.startTime)
    const end   = latest.endTime ? new Date(latest.endTime) : null
    if (start.getTime() < Date.now() - 7 * 24 * 3600000) return []
    if (end && end.getTime() <= Date.now()) return []

    const [membersDR1, membersDR2] = await Promise.all([
      getClanMembers().catch(() => null),
      getClanMembersDR2().catch(() => null),
    ])
    const allMembers = [
      ...(membersDR1?.items ?? membersDR1 ?? []),
      ...(membersDR2?.items ?? membersDR2 ?? []),
    ]

    const raidMap = new Map((latest.members || []).map(m => [m.tag, m]))

    const targets = []
    const seen = new Set()
    for (const m of allMembers) {
      if (seen.has(m.tag)) continue
      const raidMember = raidMap.get(m.tag)
      const noAttack = !raidMember || (raidMember.attacks ?? 0) === 0
      if (noAttack) {
        seen.add(m.tag)
        targets.push({ name: m.name, tag: m.tag })
      }
    }
    return targets
  } catch {
    return []
  }
}

async function getDiscordIdsMap(tags) {
  if (!tags.length) return {}
  const { data } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag')
    .in('coc_tag', tags)
  const map = {}
  for (const row of data || []) map[row.coc_tag] = row.discord_id
  return map
}

// ─── Envoi DM ─────────────────────────────────────────────────────────────────

function buildDmAckRow(discordId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`dm_ack:${discordId}:${MESSAGING_CHANNEL_ID}`).setLabel('✅ Message reçu').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`dm_reply:${discordId}:${MESSAGING_CHANNEL_ID}`).setLabel('💬 Répondre').setStyle(ButtonStyle.Primary),
  )
}

// targets: [{ discordId, name }]
async function sendDMs(client, targets, embed) {
  let sent = 0
  const closedDm = []
  for (const t of targets) {
    let user
    try {
      user = await client.users.fetch(t.discordId)
    } catch {
      closedDm.push(t.name || t.discordId)
      continue
    }
    try {
      await user.send({ embeds: [embed], components: [buildDmAckRow(t.discordId)] })
      sent++
    } catch {
      closedDm.push(t.name || user.username)
    }
  }
  return { sent, closedDm }
}

// ─── Résumé d'envoi ───────────────────────────────────────────────────────────

function buildSendSummary(sent, unlinkedTargets, closedDm = []) {
  const lines = [`✅ **${sent}** DM envoyés avec succès`]
  lines.push(`❌ **${unlinkedTargets.length}** membres non liés ignorés (pas de compte Discord lié)`)
  if (unlinkedTargets.length) {
    const names = unlinkedTargets.map(t => t.name).join(', ')
    lines.push(`*Non liés :* ${names}`.slice(0, 1000))
  }
  if (closedDm.length) {
    lines.push(`🔒 **${closedDm.length}** membres avec DMs fermés : ${closedDm.join(', ')} — Contacter <@610765755553939456> si problème`.slice(0, 1000))
  }
  return lines.join('\n').slice(0, 1900)
}

// ─── Preview embed ────────────────────────────────────────────────────────────

function buildPreviewEmbed(title, targets, tagMap) {
  const lines = targets.map(t =>
    tagMap[t.tag] ? `<@${tagMap[t.tag]}> (${t.name})` : `${t.name} *(non lié)*`
  )
  const linked   = targets.filter(t => tagMap[t.tag]).length
  const unlinked = targets.length - linked
  return new EmbedBuilder()
    .setColor(0xFF6600)
    .setTitle(`📨 Aperçu — ${title}`)
    .setDescription(lines.join('\n').slice(0, 2000) || '—')
    .setFooter({ text: `${linked} DM seront envoyés · ${unlinked} non liés ignorés` })
}

// ─── Rappel Guerre ────────────────────────────────────────────────────────────

async function handleMsgRappelGuerre(interaction) {
  if (!isAuthorized(interaction.user.id, interaction.member)) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  await interaction.deferReply({ ephemeral: true })

  const targets = await fetchWarMembersNoAttack()
  if (!targets.length) return interaction.editReply('✅ Aucun guerrier sans attaque actuellement.')

  const tagMap   = await getDiscordIdsMap(targets.map(t => t.tag))
  const linked   = targets.filter(t => tagMap[t.tag])
  const unlinkedTargets = targets.filter(t => !tagMap[t.tag])

  pendingRappels.set(interaction.user.id, { type: 'guerre', tagMap, linked, unlinkedTargets })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('msg_rappel_guerre_confirm').setLabel('✅ Confirmer l\'envoi').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('msg_rappel_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
  )
  await interaction.editReply({ embeds: [buildPreviewEmbed('Rappel de guerre', targets, tagMap)], components: [row] })
}

async function handleMsgRappelGuerreConfirm(interaction) {
  await interaction.deferUpdate()
  const pending = pendingRappels.get(interaction.user.id)
  if (!pending || pending.type !== 'guerre') {
    return interaction.followUp({ content: '❌ Session expirée, relance la commande.', ephemeral: true })
  }
  pendingRappels.delete(interaction.user.id)

  await interaction.editReply({ components: [] })

  const dmEmbed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('⚔️ Rappel — Tu n\'as pas encore attaqué !')
    .setDescription('La guerre se termine bientôt, n\'oublie pas tes attaques !')
    .setFooter({ text: 'Message envoyé par le staff Donjon Rouge' })
    .setTimestamp()

  const targets = pending.linked.map(t => ({ discordId: pending.tagMap[t.tag], name: t.name }))
  const { sent, closedDm } = await sendDMs(interaction.client, targets, dmEmbed)
  await interaction.followUp({
    content: buildSendSummary(sent, pending.unlinkedTargets, closedDm),
    ephemeral: true,
  })
}

// ─── Rappel Raid ──────────────────────────────────────────────────────────────

async function handleMsgRappelRaid(interaction) {
  if (!isAuthorized(interaction.user.id, interaction.member)) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  await interaction.deferReply({ ephemeral: true })

  const targets = await fetchRaidMembersNoAttack()
  if (!targets.length) return interaction.editReply('✅ Aucun membre sans attaque de raid actuellement.')

  const tagMap   = await getDiscordIdsMap(targets.map(t => t.tag))
  const linked   = targets.filter(t => tagMap[t.tag])
  const unlinkedTargets = targets.filter(t => !tagMap[t.tag])

  pendingRappels.set(interaction.user.id, { type: 'raid', tagMap, linked, unlinkedTargets })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('msg_rappel_raid_confirm').setLabel('✅ Confirmer l\'envoi').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('msg_rappel_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
  )
  await interaction.editReply({ embeds: [buildPreviewEmbed('Rappel de raid', targets, tagMap)], components: [row] })
}

async function handleMsgRappelRaidConfirm(interaction) {
  await interaction.deferUpdate()
  const pending = pendingRappels.get(interaction.user.id)
  if (!pending || pending.type !== 'raid') {
    return interaction.followUp({ content: '❌ Session expirée, relance la commande.', ephemeral: true })
  }
  pendingRappels.delete(interaction.user.id)

  await interaction.editReply({ components: [] })

  const dmEmbed = new EmbedBuilder()
    .setColor(0x7B2FBE)
    .setTitle('💎 Rappel — Tu n\'as pas encore raidé !')
    .setDescription('Le Raid du Capital se termine bientôt, n\'oublie pas tes attaques !')
    .setFooter({ text: 'Message envoyé par le staff Donjon Rouge' })
    .setTimestamp()

  const targets = pending.linked.map(t => ({ discordId: pending.tagMap[t.tag], name: t.name }))
  const { sent, closedDm } = await sendDMs(interaction.client, targets, dmEmbed)
  await interaction.followUp({
    content: buildSendSummary(sent, pending.unlinkedTargets, closedDm),
    ephemeral: true,
  })
}

async function handleMsgRappelCancel(interaction) {
  await interaction.deferUpdate()
  pendingRappels.delete(interaction.user.id)
  pendingJdc.delete(interaction.user.id)
  await interaction.editReply({ embeds: [], components: [] })
  await interaction.followUp({ content: '❌ Envoi annulé.', ephemeral: true })
}

// ─── Rappel JDC ──────────────────────────────────────────────────────────────

async function handleMsgJdcReminder(interaction) {
  if (!isAuthorized(interaction.user.id, interaction.member)) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  await interaction.deferReply({ ephemeral: true })

  const { data: configData } = await supabase.from('bot_config').select('value').eq('key', 'jdc_active').maybeSingle()
  if (configData?.value !== 'true') {
    return interaction.editReply('ℹ️ Aucun Jeux de Clan en cours actuellement.')
  }

  const { data: endData } = await supabase.from('bot_config').select('value').eq('key', 'jdc_end').maybeSingle()
  const daysLeft = endData?.value
    ? Math.max(1, Math.ceil((new Date(endData.value).getTime() - Date.now()) / 86400000))
    : '?'

  await interaction.editReply('⏳ Récupération des points JDC en cours...')

  const allUnder = await fetchJdcMembersUnder5000()

  if (!allUnder.length) {
    return interaction.editReply('✅ Tous les membres ont atteint l\'objectif DR (5 000 pts) !')
  }

  const zero    = allUnder.filter(m => m.points === 0)
  const partial = allUnder.filter(m => m.points > 0)
  const tagMap  = await getDiscordIdsMap(allUnder.map(m => m.tag))

  pendingJdc.set(interaction.user.id, { zero, partial, tagMap, daysLeft })

  const preview = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🎮 Rappel Jeux de Clan')
    .setDescription([
      `Membres à contacter : **${allUnder.length}** (DR1 + DR2)`,
      `→ Membres à 0 pts : **${zero.length}**`,
      `→ Membres entre 1 et 4 999 pts : **${partial.length}**`,
    ].join('\n'))

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('msg_jdc_reminder_confirm').setLabel('✅ Confirmer l\'envoi').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('msg_rappel_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
  )
  await interaction.editReply({ embeds: [preview], components: [row] })
}

async function handleMsgJdcReminderConfirm(interaction) {
  await interaction.deferUpdate()
  const pending = pendingJdc.get(interaction.user.id)
  if (!pending) {
    return interaction.followUp({ content: '❌ Session expirée, relance la commande.', ephemeral: true })
  }
  pendingJdc.delete(interaction.user.id)
  await interaction.editReply({ components: [] })

  const { zero, partial, tagMap, daysLeft } = pending
  let sent = 0
  const closedDm   = []
  const unlinked   = []

  const zeroEmbed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🎮 Jeux de Clan — Donjon Rouge')
    .setDescription(
      `Hey ! Les Jeux de Clan sont en cours et tu n'as pas encore participé.\n` +
      `Il reste **${daysLeft} jour(s)** — chaque point compte pour le clan ! 💪\n` +
      `Objectif minimum DR : **5 000 pts** 🎯`
    )
    .setFooter({ text: 'Message envoyé par le staff Donjon Rouge' })
    .setTimestamp()

  for (const t of zero) {
    const discordId = tagMap[t.tag]
    if (!discordId) { unlinked.push({ name: t.name }); continue }
    try {
      const user = await interaction.client.users.fetch(discordId)
      await user.send({ embeds: [zeroEmbed], components: [buildDmAckRow(discordId)] })
      sent++
    } catch {
      closedDm.push(t.name)
    }
  }

  for (const t of partial) {
    const discordId = tagMap[t.tag]
    if (!discordId) { unlinked.push({ name: t.name }); continue }
    try {
      const user         = await interaction.client.users.fetch(discordId)
      const partialEmbed = new EmbedBuilder()
        .setColor(0xFF8C00)
        .setTitle('🎮 Jeux de Clan — Donjon Rouge')
        .setDescription(
          `Tu es en bonne voie avec **${t.points} pts**, mais l'objectif DR est de **5 000 pts** !\n` +
          `Il reste **${daysLeft} jour(s)**, tu peux y arriver 🔥`
        )
        .setFooter({ text: 'Message envoyé par le staff Donjon Rouge' })
        .setTimestamp()
      await user.send({ embeds: [partialEmbed], components: [buildDmAckRow(discordId)] })
      sent++
    } catch {
      closedDm.push(t.name)
    }
  }

  await interaction.followUp({
    content: buildSendSummary(sent, unlinked, closedDm),
    ephemeral: true,
  })
}

// ─── Message personnalisé — Étape 1 : modal directe ─────────────────────────

async function handleMsgCustom(interaction) {
  if (!isAuthorized(interaction.user.id, interaction.member)) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }

  const modal = new ModalBuilder().setCustomId('modal_msg_custom').setTitle('Message personnalisé')
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('msg_recipients')
        .setLabel('Destinataires')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(500)
        .setPlaceholder('@joueur1 @joueur2 ou "tous"')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('msg_subject')
        .setLabel('Sujet')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
        .setPlaceholder('ex: Rappel GDC')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('msg_body')
        .setLabel('Message')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1500)
        .setPlaceholder('Ton message ici...')
    )
  )
  await interaction.showModal(modal)
}

// ─── Message personnalisé — Étape 2 : preview ────────────────────────────────

async function handleModalMsgCustom(interaction) {
  const rawRecipients = interaction.fields.getTextInputValue('msg_recipients')
  const subject       = interaction.fields.getTextInputValue('msg_subject')
  const body          = interaction.fields.getTextInputValue('msg_body')

  await interaction.deferReply({ ephemeral: true })

  let discordIds
  if (rawRecipients.trim().toLowerCase() === 'tous') {
    const { data } = await supabase.from('discord_links').select('discord_id')
    discordIds = (data || []).map(r => r.discord_id)
  } else {
    const ids = new Set()
    for (const m of rawRecipients.matchAll(/<@!?(\d{17,20})>/g)) ids.add(m[1])
    for (const m of rawRecipients.matchAll(/@(\d{17,20})/g))     ids.add(m[1])
    for (const m of rawRecipients.matchAll(/\b(\d{17,20})\b/g))  ids.add(m[1])
    discordIds = [...ids]
  }

  if (!discordIds.length) {
    return interaction.editReply('❌ Aucun destinataire trouvé. Utilise des mentions @joueur ou le mot "tous".')
  }

  pendingCustom.set(interaction.user.id, { discordIds, subject, body })

  const shown    = discordIds.slice(0, 10).map(id => `<@${id}>`).join(', ')
  const moreText = discordIds.length > 10 ? ` + ${discordIds.length - 10} autres` : ''

  const preview = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`📨 Aperçu — ${subject}`)
    .setDescription(body)
    .addFields({ name: '👥 Destinataires', value: `${shown}${moreText}`, inline: false })
    .setFooter({ text: `${discordIds.length} DM seront envoyés` })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('msg_custom_confirm').setLabel('✅ Confirmer l\'envoi').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('msg_custom_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary),
  )
  await interaction.editReply({ embeds: [preview], components: [row] })
}

// ─── Message personnalisé — Étape 4 : envoi ───────────────────────────────────

async function handleMsgCustomConfirm(interaction) {
  await interaction.deferUpdate()
  const pending = pendingCustom.get(interaction.user.id)
  if (!pending?.discordIds) {
    return interaction.editReply({ content: '❌ Session expirée.', embeds: [], components: [] })
  }
  pendingCustom.delete(interaction.user.id)

  const dmEmbed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`📨 ${pending.subject}`)
    .setDescription(pending.body)
    .setFooter({ text: 'Message envoyé par le staff Donjon Rouge' })
    .setTimestamp()

  const targets = pending.discordIds.map(id => ({ discordId: id, name: null }))
  const { sent, closedDm } = await sendDMs(interaction.client, targets, dmEmbed)
  await interaction.editReply({
    content: buildSendSummary(sent, [], closedDm),
    embeds: [], components: [],
  })
}

async function handleMsgCustomCancel(interaction) {
  await interaction.deferUpdate()
  pendingCustom.delete(interaction.user.id)
  await interaction.editReply({ content: '❌ Message annulé.', embeds: [], components: [] })
}

// ─── Message global ───────────────────────────────────────────────────────────

async function handleMsgGlobal(interaction) {
  if (!isAuthorized(interaction.user.id, interaction.member)) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }

  const modal = new ModalBuilder().setCustomId('modal_msg_global').setTitle('Message global')
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('msg_global_subject')
        .setLabel('Sujet')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
        .setPlaceholder('ex: Maintenance du bot')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('msg_global_body')
        .setLabel('Message')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1500)
        .setPlaceholder('Votre message ici...')
    )
  )
  await interaction.showModal(modal)
}

async function handleModalMsgGlobal(interaction) {
  const subject = interaction.fields.getTextInputValue('msg_global_subject')
  const body    = interaction.fields.getTextInputValue('msg_global_body')

  await interaction.deferReply({ ephemeral: true })

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(subject)
    .setDescription(body)
    .setFooter({ text: `Message de ${interaction.user.username} • Donjon Rouge` })
    .setTimestamp()

  const { data } = await supabase.from('discord_links').select('discord_id, coc_name, is_primary')

  const byUser = new Map()
  for (const row of data || []) {
    if (!byUser.has(row.discord_id) || row.is_primary) byUser.set(row.discord_id, row)
  }

  const targets = [...byUser.values()].map(r => ({ discordId: r.discord_id, name: r.coc_name }))
  const { sent, closedDm } = await sendDMs(interaction.client, targets, embed)

  let summary = `✅ **${sent}** DM envoyés | ❌ **${closedDm.length}** DMs fermés`
  if (closedDm.length) {
    summary += ` : ${closedDm.join(', ')} — Contacter <@610765755553939456> si problème`
  }
  await interaction.editReply(summary.slice(0, 1900))
}

// ─── Accusé de réception / réponse aux DMs ───────────────────────────────────

async function handleDmAck(interaction, argTag) {
  const [userId, channelId] = argTag.split(':')
  await interaction.reply({ content: '✅ Accusé de réception enregistré !', ephemeral: true })

  const channel = await interaction.client.channels.fetch(channelId).catch(() => null)
  if (!channel) return

  const embed = new EmbedBuilder()
    .setColor(0x2E7D32)
    .setDescription(`✅ <@${userId}> a accusé réception du message • <t:${Math.floor(Date.now() / 1000)}:f>`)

  await channel.send({ embeds: [embed] })
}

async function handleDmReply(interaction, argTag) {
  const modal = new ModalBuilder().setCustomId(`modal_dm_reply:${argTag}`).setTitle('Répondre au staff')
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('dm_reply_text')
        .setLabel('Votre réponse')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1500)
        .setPlaceholder('Votre message au staff...')
    )
  )
  await interaction.showModal(modal)
}

async function handleModalDmReply(interaction, argTag) {
  const [userId, channelId] = argTag.split(':')
  const text = interaction.fields.getTextInputValue('dm_reply_text')

  await interaction.deferReply({ ephemeral: true })

  const channel = await interaction.client.channels.fetch(channelId).catch(() => null)
  if (channel) {
    const embed = new EmbedBuilder()
      .setColor(0x1E88E5)
      .setDescription(`💬 <@${userId}> a répondu : ${text}`)
      .setTimestamp()
    await channel.send({ embeds: [embed] })
  }

  await interaction.editReply('✅ Votre réponse a été transmise !')
}

module.exports = {
  isAuthorized,
  handleMsgRappelGuerre,
  handleMsgRappelGuerreConfirm,
  handleMsgRappelRaid,
  handleMsgRappelRaidConfirm,
  handleMsgRappelCancel,
  handleMsgJdcReminder,
  handleMsgJdcReminderConfirm,
  handleMsgCustom,
  handleModalMsgCustom,
  handleMsgCustomConfirm,
  handleMsgCustomCancel,
  handleMsgGlobal,
  handleModalMsgGlobal,
  handleDmAck,
  handleDmReply,
  handleModalDmReply,
}
