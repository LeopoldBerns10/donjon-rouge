const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { apiGet, parseWarTime, normalizeWar } = require('../cocApi.js')
const { isJdcActive, fetchJdcMembersUnder5000 } = require('./jdcTracker.js')
const supabase = require('../supabase.js')
const { ensureEmbed, replaceEmbed } = require('./eventChannels.js')

const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

const DR1_WAR_CHANNEL   = '1511988469918994545'
const DR2_WAR_CHANNEL   = '1511988535094153286'
const JDC_RAIDS_CHANNEL = '1511988581135159376'

const CHEF_ROLE_ID   = '611123759864348672'
const ADJOINT_ROLE_ID = '1297318759396278425'

function isChefOrAdjoint(member) {
  return member.roles.cache.has(CHEF_ROLE_ID) || member.roles.cache.has(ADJOINT_ROLE_ID)
}

function makeRefreshRow(customId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('🔄 Actualiser').setStyle(ButtonStyle.Secondary)
  )]
}

// ─── GDC embed ────────────────────────────────────────────────────────────────

async function buildGdcEmbed(clanKey) {
  const tag    = clanKey === 'dr1' ? DR1_TAG : DR2_TAG
  const label  = clanKey === 'dr1' ? 'DR1' : 'DR2'

  let war
  try { war = await apiGet(`/clan/${clanKey}/war`) } catch { war = null }

  if (!war || war.state === 'notInWar' || war.state === 'warEnded') {
    return new EmbedBuilder()
      .setColor(0x555555)
      .setTitle(`⚔️ Guerre de Clan — ${label}`)
      .setDescription('😴 Aucune guerre en cours')
      .setFooter({ text: `Donjon Rouge • GDC ${label}` })
      .setTimestamp()
  }

  const members    = war.clan?.members || []
  const clanStars  = war.clan?.stars ?? 0
  const oppStars   = war.opponent?.stars ?? 0
  const atksUsed   = members.reduce((acc, m) => acc + (m.attacks?.length ?? 0), 0)
  const totalAtks  = members.length * 2
  const oppName    = war.opponent?.name || '?'

  let timeStr = ''
  if (war.state === 'preparation' && war.startTime) {
    const t = parseWarTime(war.startTime)
    if (t) timeStr = `⏳ Début dans ${Math.max(0, Math.ceil((t - Date.now()) / 3600000))}h`
  } else if (war.state === 'inWar' && war.endTime) {
    const t = parseWarTime(war.endTime)
    if (t) timeStr = `⏳ Fin dans ${Math.max(0, Math.ceil((t - Date.now()) / 3600000))}h`
  }

  const sorted = [...members].sort((a, b) => {
    const aA = a.attacks?.length ?? 0
    const bA = b.attacks?.length ?? 0
    if (aA === 0 && bA !== 0) return -1
    if (aA !== 0 && bA === 0) return 1
    return b.townhallLevel - a.townhallLevel
  })

  const lines = sorted.map(m => {
    const atks = m.attacks?.length ?? 0
    const icon = atks === 0 ? '❌' : atks < 2 ? '⚡' : '✅'
    return `${icon} ${m.name} — ${atks}/2`
  })

  const stateLabel = war.state === 'preparation' ? '🛡️ Préparation' : '⚔️ En cours'

  return new EmbedBuilder()
    .setColor(war.state === 'inWar' ? 0xFF6600 : 0x1565C0)
    .setTitle(`⚔️ Guerre de Clan — ${label}`)
    .addFields(
      { name: '📊 État', value: `${stateLabel} vs **${oppName}**\n⭐ ${clanStars} vs ${oppStars} | ⚔️ ${atksUsed}/${totalAtks}${timeStr ? `\n${timeStr}` : ''}`, inline: false },
      { name: '🏹 Membres', value: lines.join('\n').slice(0, 1024) || '—', inline: false },
    )
    .setFooter({ text: `Donjon Rouge • GDC ${label}` })
    .setTimestamp()
}

// ─── LDC embed ────────────────────────────────────────────────────────────────

async function buildLdcEmbed(clanKey) {
  const ourTag = clanKey === 'dr1' ? DR1_TAG : DR2_TAG
  const label  = clanKey === 'dr1' ? 'DR1' : 'DR2'
  const path   = clanKey === 'dr1' ? '/ldc/current' : '/ldc/dr2/current'

  let ldc
  try { ldc = await apiGet(path) } catch { ldc = null }

  if (!ldc?.rounds) {
    return new EmbedBuilder()
      .setColor(0x555555)
      .setTitle(`🏆 Ligue des Clans — ${label}`)
      .setDescription('😴 Aucune LDC en cours')
      .setFooter({ text: `Donjon Rouge • LDC ${label}` })
      .setTimestamp()
  }

  const activeIdx = ldc.rounds.findIndex(r => r.war?.state === 'inWar' || r.war?.state === 'preparation')
  if (activeIdx === -1) {
    return new EmbedBuilder()
      .setColor(0x555555)
      .setTitle(`🏆 Ligue des Clans — ${label}`)
      .setDescription(`😴 Saison ${ldc.season || '?'} — entre deux rounds`)
      .setFooter({ text: `Donjon Rouge • LDC ${label}` })
      .setTimestamp()
  }

  const round   = ldc.rounds[activeIdx]
  const war     = normalizeWar(round.war, ourTag)
  const members = war.clan?.members || []
  const oppName = war.opponent?.name || '?'
  const clanStars = war.clan?.stars ?? 0
  const oppStars  = war.opponent?.stars ?? 0
  const atksUsed  = members.reduce((acc, m) => acc + (m.attacks?.length ?? 0), 0)

  let timeStr = ''
  if (war.state === 'inWar' && war.endTime) {
    const t = parseWarTime(war.endTime)
    if (t) timeStr = `⏳ Fin dans ${Math.max(0, Math.ceil((t - Date.now()) / 3600000))}h`
  }

  const sorted = [...members].sort((a, b) => {
    const aA = a.attacks?.length ?? 0
    const bA = b.attacks?.length ?? 0
    if (aA === 0 && bA !== 0) return -1
    if (aA !== 0 && bA === 0) return 1
    return b.townhallLevel - a.townhallLevel
  })

  const lines = sorted.map(m => {
    const atks = m.attacks?.length ?? 0
    return `${atks === 0 ? '❌' : '✅'} ${m.name} — ${atks}/1`
  })

  return new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`🏆 Ligue des Clans — ${label}`)
    .addFields(
      { name: `📊 Jour ${activeIdx + 1} vs ${oppName}`, value: `⭐ ${clanStars} vs ${oppStars} | ⚔️ ${atksUsed}/${members.length}${timeStr ? `\n${timeStr}` : ''}`, inline: false },
      { name: '🏹 Membres', value: lines.join('\n').slice(0, 1024) || '—', inline: false },
    )
    .setFooter({ text: `Donjon Rouge • LDC ${label} • Saison ${ldc.season || '?'}` })
    .setTimestamp()
}

// ─── Raids embed ──────────────────────────────────────────────────────────────

async function buildRaidsEmbed() {
  let raid
  try {
    const data = await apiGet('/clan/raids')
    const latest = data?.items?.[0] ?? null
    raid = latest?.state === 'ongoing' ? latest : null
  } catch {
    raid = null
  }

  if (!raid) {
    return new EmbedBuilder()
      .setColor(0x555555)
      .setTitle('💎 Raid Capital — DR1')
      .setDescription('😴 Aucun raid en cours')
      .setFooter({ text: 'Donjon Rouge • Raid Capital' })
      .setTimestamp()
  }

  let allMembers = []
  try {
    const [r1, r2] = await Promise.all([apiGet('/clan/dr1/members'), apiGet('/clan/dr2/members')])
    allMembers = [...(r1?.items ?? []), ...(r2?.items ?? [])]
  } catch {}

  const discordMap = await getDiscordIds(allMembers.map(m => m.tag))

  const raidMap  = new Map((raid.members || []).map(m => [m.tag, m]))
  const atksUsed = (raid.members || []).reduce((acc, m) => acc + (m.attacks ?? 0), 0)

  const lines = allMembers.map(m => {
    const rm   = raidMap.get(m.tag)
    const atks = rm?.attacks ?? 0
    const lim  = rm?.attackLimit ?? 5
    const icon = atks === 0 ? '❌' : atks < lim ? '⚡' : '✅'
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${icon} ${mention} — ${atks}/${lim}`
  })

  return new EmbedBuilder()
    .setColor(0x7B2FBE)
    .setTitle('💎 Raid Capital — DR1')
    .addFields(
      { name: '📊 Attaques', value: `⚔️ ${atksUsed} attaques utilisées`, inline: false },
      { name: '🏹 Membres', value: lines.join('\n').slice(0, 4096) || '—', inline: false },
    )
    .setFooter({ text: 'Donjon Rouge • Raid Capital' })
    .setTimestamp()
}

// ─── JDC embed ────────────────────────────────────────────────────────────────

async function buildJdcEmbed() {
  const active = await isJdcActive()
  if (!active) {
    return new EmbedBuilder()
      .setColor(0x555555)
      .setTitle('🎖️ Jeux des Clans')
      .setDescription('😴 Aucun JDC en cours')
      .setFooter({ text: 'Donjon Rouge • Jeux des Clans' })
      .setTimestamp()
  }

  const allUnder = await fetchJdcMembersUnder5000()
  const discordMap = allUnder.length > 0 ? await getDiscordIds(allUnder.map(m => m.tag)) : {}

  const lines = allUnder.map(m => {
    const icon    = m.points === 0 ? '❌' : '⚡'
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${icon} ${mention} — ${m.points.toLocaleString('fr-FR')} pts`
  })

  return new EmbedBuilder()
    .setColor(lines.length === 0 ? 0x2E7D32 : 0xFF6600)
    .setTitle('🎖️ Jeux des Clans')
    .setDescription(lines.length === 0
      ? '✅ Tous les membres ont atteint 5 000 pts !'
      : `🎯 Objectif : 5 000 pts minimum\n\n${lines.join('\n')}`.slice(0, 4096))
    .setFooter({ text: 'Donjon Rouge • Jeux des Clans' })
    .setTimestamp()
}

// ─── Helper Discord IDs ───────────────────────────────────────────────────────

async function getDiscordIds(tags) {
  if (!tags.length) return {}
  const { data } = await supabase.from('discord_links').select('discord_id, coc_tag').in('coc_tag', tags)
  const map = {}
  for (const row of data || []) map[row.coc_tag] = row.discord_id
  return map
}

// ─── Mise à jour des salons guerre ────────────────────────────────────────────

async function updateWarEmbeds(client) {
  try {
    await Promise.all([
      replaceEmbed(client, DR1_WAR_CHANNEL, 'war_gdc_dr1_msg_id', await buildGdcEmbed('dr1').catch(() => errEmbed('⚔️ Guerre de Clan — DR1')), makeRefreshRow('refresh_gdc_dr1')),
      replaceEmbed(client, DR1_WAR_CHANNEL, 'war_ldc_dr1_msg_id', await buildLdcEmbed('dr1').catch(() => errEmbed('🏆 Ligue des Clans — DR1')), makeRefreshRow('refresh_ldc_dr1')),
      replaceEmbed(client, DR2_WAR_CHANNEL, 'war_gdc_dr2_msg_id', await buildGdcEmbed('dr2').catch(() => errEmbed('⚔️ Guerre de Clan — DR2')), makeRefreshRow('refresh_gdc_dr2')),
      replaceEmbed(client, DR2_WAR_CHANNEL, 'war_ldc_dr2_msg_id', await buildLdcEmbed('dr2').catch(() => errEmbed('🏆 Ligue des Clans — DR2')), makeRefreshRow('refresh_ldc_dr2')),
      replaceEmbed(client, JDC_RAIDS_CHANNEL, 'war_raids_msg_id', await buildRaidsEmbed().catch(() => errEmbed('💎 Raid Capital')), makeRefreshRow('refresh_raids')),
      replaceEmbed(client, JDC_RAIDS_CHANNEL, 'war_jdc_msg_id',   await buildJdcEmbed().catch(() => errEmbed('🎖️ Jeux des Clans')), makeRefreshRow('refresh_jdc')),
    ])
  } catch (e) {
    console.error('[WarEmbeds] updateWarEmbeds:', e)
  }
}

function errEmbed(title) {
  return new EmbedBuilder()
    .setColor(0x555555)
    .setTitle(title)
    .setDescription('⚠️ Données indisponibles')
    .setTimestamp()
}

module.exports = {
  buildGdcEmbed,
  buildLdcEmbed,
  buildRaidsEmbed,
  buildJdcEmbed,
  updateWarEmbeds,
  isChefOrAdjoint,
  makeRefreshRow,
  getDiscordIds,
}
