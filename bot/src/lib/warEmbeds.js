const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { apiGet, parseWarTime, normalizeWar } = require('../cocApi.js')
const { isJdcActive, fetchJdcMembersUnder5000 } = require('./jdcTracker.js')
const supabase = require('../supabase.js')
const { replaceEmbed } = require('./eventChannels.js')

const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

const DR1_WAR_CHANNEL   = '1511988469918994545'
const DR2_WAR_CHANNEL   = '1511988535094153286'
const JDC_RAIDS_CHANNEL = '1511988581135159376'

const CHEF_ROLE_ID    = '611123759864348672'
const ADJOINT_ROLE_ID = '1297318759396278425'

function isChefOrAdjoint(member) {
  return member.roles.cache.has(CHEF_ROLE_ID) || member.roles.cache.has(ADJOINT_ROLE_ID)
}

function makeRefreshRow(customId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('🔄 Actualiser').setStyle(ButtonStyle.Secondary)
  )]
}

// ─── Guerre embed (GDC ou LDC, auto-détecté) ─────────────────────────────────

async function buildWarEmbed(clanKey) {
  const tag   = clanKey === 'dr1' ? DR1_TAG : DR2_TAG
  const label = clanKey === 'dr1' ? 'DR1' : 'DR2'

  let war   = null
  let isLdc = false

  try { war = await apiGet(`/clan/${clanKey}/war`) } catch { war = null }

  const gdcInactive = !war || war.state === 'notInWar' || war.state === 'warEnded'

  if (gdcInactive) {
    const ldcPath = clanKey === 'dr1' ? '/ldc/current' : '/ldc/dr2/current'
    try {
      const ldc = await apiGet(ldcPath)
      if (ldc?.rounds) {
        const activeIdx = ldc.rounds.findIndex(r => r.war?.state === 'inWar' || r.war?.state === 'preparation')
        if (activeIdx !== -1) {
          const round = ldc.rounds[activeIdx]
          war           = normalizeWar(round.war, tag)
          war._ldcDay   = activeIdx + 1
          war._ldcSeason = ldc.season
          isLdc = true
        }
      }
    } catch {}
  }

  if (!war || war.state === 'notInWar' || war.state === 'warEnded') {
    return new EmbedBuilder()
      .setColor(0x555555)
      .setTitle(`⚔️ Guerre — ${label}`)
      .setDescription('😴 Aucune guerre en cours')
      .setFooter({ text: `Donjon Rouge • Guerre ${label}` })
      .setTimestamp()
  }

  const attacksPerMember = isLdc ? 1 : 2
  const title            = isLdc ? `🏆 LDC — ${label}` : `⚔️ GDC — ${label}`
  const members          = war.clan?.members || []
  const clanStars        = war.clan?.stars ?? 0
  const oppStars         = war.opponent?.stars ?? 0
  const atksUsed         = members.reduce((acc, m) => acc + (m.attacks?.length ?? 0), 0)
  const totalAtks        = members.length * attacksPerMember
  const oppName          = war.opponent?.name || '?'

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
    const icon = atks === 0 ? '❌' : atks < attacksPerMember ? '⚡' : '✅'
    return `${icon} ${m.name} — ${atks}/${attacksPerMember}`
  })

  const ldcExtra   = isLdc && war._ldcDay ? ` • Jour ${war._ldcDay}` : ''
  const footerText = isLdc
    ? `Donjon Rouge • LDC ${label}${war._ldcSeason ? ` • Saison ${war._ldcSeason}` : ''}`
    : `Donjon Rouge • GDC ${label}`

  const embed = new EmbedBuilder()
    .setColor(isLdc ? 0xFFD700 : (war.state === 'inWar' ? 0xFF6600 : 0x1565C0))
    .setTitle(title)
    .setFooter({ text: footerText })
    .setTimestamp()

  if (war.state === 'preparation') {
    const ourSorted   = [...members].sort((a, b) => b.townhallLevel - a.townhallLevel)
    const theirSorted = [...(war.opponent?.members || [])].sort((a, b) => b.townhallLevel - a.townhallLevel)
    const ourLines    = ourSorted.map(m => `TH${m.townhallLevel} ${m.name}`)
    const theirLines  = theirSorted.map(m => `TH${m.townhallLevel} ${m.name}`)
    embed.addFields(
      { name: '🛡️ Préparation', value: `vs **${oppName}**\n👥 ${members.length} vs ${theirSorted.length}${timeStr ? `\n${timeStr}` : ''}`, inline: false },
      { name: `🏰 Nos guerriers (${members.length})`, value: ourLines.join('\n').slice(0, 1024) || '—', inline: true },
      { name: `⚔️ Leurs guerriers (${theirSorted.length})`, value: theirLines.join('\n').slice(0, 1024) || '—', inline: true },
    )
  } else {
    embed.addFields(
      { name: `📊 En cours${ldcExtra}`, value: `vs **${oppName}**\n⭐ ${clanStars} vs ${oppStars} | ⚔️ ${atksUsed}/${totalAtks}${timeStr ? `\n${timeStr}` : ''}`, inline: false },
      { name: '🏹 Membres', value: lines.join('\n').slice(0, 1024) || '—', inline: false },
    )
  }

  return embed
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

  let discordMap = {}
  try { discordMap = await getDiscordIds(allMembers.map(m => m.tag)) } catch {}

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
    .setDescription(lines.join('\n').slice(0, 4096) || '—')
    .addFields(
      { name: '📊 Attaques', value: `⚔️ ${atksUsed} attaques utilisées`, inline: false },
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

  const allUnder   = await fetchJdcMembersUnder5000()
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

// ─── Mise à jour des 4 embeds guerre ─────────────────────────────────────────

async function updateWarEmbeds(client) {
  try {
    await Promise.all([
      replaceEmbed(client, DR1_WAR_CHANNEL,   'war_dr1_msg_id',   await buildWarEmbed('dr1').catch(() => errEmbed('⚔️ Guerre — DR1')), makeRefreshRow('refresh_war_dr1')),
      replaceEmbed(client, DR2_WAR_CHANNEL,   'war_dr2_msg_id',   await buildWarEmbed('dr2').catch(() => errEmbed('⚔️ Guerre — DR2')), makeRefreshRow('refresh_war_dr2')),
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
  buildWarEmbed,
  buildRaidsEmbed,
  buildJdcEmbed,
  updateWarEmbeds,
  isChefOrAdjoint,
  makeRefreshRow,
  getDiscordIds,
  errEmbed,
}
