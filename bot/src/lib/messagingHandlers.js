const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js')
const supabase = require('../supabase.js')
const { AUTHORIZED_USERS } = require('../config/messaging.js')
const { getCurrentWar, getLdcCurrent, getLdcCurrentDR2, getRaidSeasons } = require('../cocApi.js')

const BASE    = process.env.BACKEND_URL
const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'
const CHEF_ROLE_ID = '611123759864348672'

// Sessions en attente de confirmation
const pendingRappels = new Map()
const pendingCustom  = new Map()

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

  // DR1
  try {
    let war = await getCurrentWar()
    if (!war || war.state !== 'inWar') {
      const ldc = await getLdcCurrent()
      const round = ldc?.rounds?.find(r => r.war != null)
      if (round?.war) war = normalizeWar(round.war, DR1_TAG)
    }
    if (war?.state === 'inWar') addMembers(war)
  } catch {}

  // DR2
  try {
    const res = await fetch(`${BASE}/api/coc/clan/dr2/war`)
    let war = res.ok ? await res.json() : null
    if (!war || war.state !== 'inWar') {
      const ldc2 = await getLdcCurrentDR2()
      const round2 = ldc2?.rounds?.find(r => r.war != null)
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
    return (latest.members || [])
      .filter(m => (m.attacks ?? 0) === 0)
      .map(m => ({ name: m.name, tag: m.tag }))
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

async function sendDMs(client, discordIds, embed) {
  let sent = 0, failed = 0
  for (const id of discordIds) {
    try {
      const user = await client.users.fetch(id)
      await user.send({ embeds: [embed] })
      sent++
    } catch {
      failed++
    }
  }
  return { sent, failed }
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
  const unlinked = targets.length - linked.length

  pendingRappels.set(interaction.user.id, { type: 'guerre', tagMap, linked, unlinked })

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
    return interaction.editReply({ content: '❌ Session expirée.', embeds: [], components: [] })
  }
  pendingRappels.delete(interaction.user.id)

  const dmEmbed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('⚔️ Rappel — Tu n\'as pas encore attaqué !')
    .setDescription('La guerre se termine bientôt, n\'oublie pas tes attaques !')
    .setFooter({ text: 'Message envoyé par le staff Donjon Rouge' })
    .setTimestamp()

  const discordIds = pending.linked.map(t => pending.tagMap[t.tag])
  const { sent, failed } = await sendDMs(interaction.client, discordIds, dmEmbed)
  await interaction.editReply({
    content: `✅ **${sent}** DM envoyés, **${failed}** échecs, **${pending.unlinked}** non liés ignorés.`,
    embeds: [], components: [],
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
  const unlinked = targets.length - linked.length

  pendingRappels.set(interaction.user.id, { type: 'raid', tagMap, linked, unlinked })

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
    return interaction.editReply({ content: '❌ Session expirée.', embeds: [], components: [] })
  }
  pendingRappels.delete(interaction.user.id)

  const dmEmbed = new EmbedBuilder()
    .setColor(0x7B2FBE)
    .setTitle('💎 Rappel — Tu n\'as pas encore raidé !')
    .setDescription('Le Raid du Capital se termine bientôt, n\'oublie pas tes attaques !')
    .setFooter({ text: 'Message envoyé par le staff Donjon Rouge' })
    .setTimestamp()

  const discordIds = pending.linked.map(t => pending.tagMap[t.tag])
  const { sent, failed } = await sendDMs(interaction.client, discordIds, dmEmbed)
  await interaction.editReply({
    content: `✅ **${sent}** DM envoyés, **${failed}** échecs, **${pending.unlinked}** non liés ignorés.`,
    embeds: [], components: [],
  })
}

async function handleMsgRappelCancel(interaction) {
  await interaction.deferUpdate()
  pendingRappels.delete(interaction.user.id)
  await interaction.editReply({ content: '❌ Envoi annulé.', embeds: [], components: [] })
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

  const { sent, failed } = await sendDMs(interaction.client, pending.discordIds, dmEmbed)
  await interaction.editReply({
    content: `✅ **${sent}** DM envoyés, **${failed}** échecs.`,
    embeds: [], components: [],
  })
}

async function handleMsgCustomCancel(interaction) {
  await interaction.deferUpdate()
  pendingCustom.delete(interaction.user.id)
  await interaction.editReply({ content: '❌ Message annulé.', embeds: [], components: [] })
}

module.exports = {
  isAuthorized,
  handleMsgRappelGuerre,
  handleMsgRappelGuerreConfirm,
  handleMsgRappelRaid,
  handleMsgRappelRaidConfirm,
  handleMsgRappelCancel,
  handleMsgCustom,
  handleModalMsgCustom,
  handleMsgCustomConfirm,
  handleMsgCustomCancel,
}
