const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { apiGet, parseWarTime, normalizeWar } = require('../cocApi.js')
const { isJdcActive, fetchJdcMembersUnder5000 } = require('./jdcTracker.js')
const { replaceEmbed } = require('./eventChannels.js')
const { getDiscordIds } = require('./warEmbeds.js')

const RAPPEL_CHANNEL_ID = '1510972919407317142'

function parisTime() {
  const now = new Date(Date.now() + 2 * 3600000)
  const hh  = String(now.getUTCHours()).padStart(2, '0')
  const mm  = String(now.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function makeBtn(customId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('🔄 Actualiser').setStyle(ButtonStyle.Secondary)
  )]
}

function inactiveEmbed(title, footer) {
  return new EmbedBuilder()
    .setColor(0x555555)
    .setTitle(title)
    .setDescription('😴 Aucun événement en cours')
    .setFooter({ text: `${footer} • Aujourd'hui à ${parisTime()}` })
    .setTimestamp()
}

// ─── Guerre rappel (GDC ou LDC, auto-détecté) ────────────────────────────────

async function buildRappelWarEmbed(clanKey) {
  const ourTag = clanKey === 'dr1' ? '#29292QPRC' : '#2RCGG9YR9'
  const label  = clanKey === 'dr1' ? 'DR1' : 'DR2'

  let war   = null
  let isLdc = false

  // GDC : accepte inWar ET preparation
  try {
    const gdcWar = await apiGet(`/clan/${clanKey}/war`)
    if (gdcWar?.state === 'inWar' || gdcWar?.state === 'preparation') war = gdcWar
  } catch {}

  if (!war) {
    // LDC : accepte inWar ET preparation
    const ldcPath = clanKey === 'dr1' ? '/ldc/current' : '/ldc/dr2/current'
    try {
      const ldc         = await apiGet(ldcPath)
      const activeRound = ldc?.rounds?.find(r => r.war?.state === 'inWar' || r.war?.state === 'preparation')
      if (activeRound) {
        war   = normalizeWar(activeRound.war, ourTag)
        isLdc = true
      }
    } catch {}
  }

  if (!war) {
    return inactiveEmbed(`⚔️ Rappel Guerre — ${label}`, `Donjon Rouge • Guerre ${label}`)
  }

  const typeLabel = isLdc ? 'LDC' : 'GDC'
  const title     = isLdc ? `🏆 Rappel LDC — ${label}` : `⚔️ Rappel GDC — ${label}`
  const oppName   = war.opponent?.name || '?'

  // État : préparation — aucune attaque possible encore
  if (war.state === 'preparation') {
    const startTime   = war.startTime ? parseWarTime(war.startTime) : null
    const hoursToStart = startTime ? Math.max(0, Math.ceil((startTime - Date.now()) / 3600000)) : '?'
    return new EmbedBuilder()
      .setColor(0x1565C0)
      .setTitle(title)
      .setDescription(`vs **${oppName}**\n\n⏳ **En préparation** — début dans **${hoursToStart}h**\n_Aucune attaque pour le moment._`)
      .setFooter({ text: `Donjon Rouge • ${typeLabel} ${label} • Aujourd'hui à ${parisTime()}` })
      .setTimestamp()
  }

  // État : inWar — affichage des attaques
  const attacksPerMember = isLdc ? 1 : 2
  const members          = war.clan?.members || []

  const late    = members.filter(m => (m.attacks?.length ?? 0) === 0)
  const partial = members.filter(m => { const a = m.attacks?.length ?? 0; return a > 0 && a < attacksPerMember })
  const done    = members.filter(m => (m.attacks?.length ?? 0) >= attacksPerMember)

  const allTags    = [...late, ...partial].map(m => m.tag)
  let discordMap = {}
  try { discordMap = allTags.length > 0 ? await getDiscordIds(allTags) : {} } catch {}

  const lines = [
    ...late.map(m    => `❌ ${discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name} — 0/${attacksPerMember}`),
    ...partial.map(m => `⚡ ${discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name} — ${m.attacks?.length ?? 0}/${attacksPerMember}`),
    ...done.map(m    => `✅ ${m.name} — ${attacksPerMember}/${attacksPerMember}`),
  ]

  const endTime   = war.endTime ? parseWarTime(war.endTime) : null
  const hoursLeft = endTime ? Math.max(0, Math.ceil((endTime - Date.now()) / 3600000)) : '?'

  return new EmbedBuilder()
    .setColor(late.length === 0 ? 0x2E7D32 : (isLdc ? 0xFFD700 : 0xFF6600))
    .setTitle(title)
    .setDescription(`vs **${oppName}** | ⏳ ${hoursLeft}h restantes\n\n${lines.join('\n')}`.slice(0, 4096))
    .setFooter({ text: `Donjon Rouge • ${typeLabel} ${label} • Aujourd'hui à ${parisTime()}` })
    .setTimestamp()
}

// ─── Raids rappel ─────────────────────────────────────────────────────────────

async function buildRappelRaidsEmbed() {
  let raid
  try {
    const data = await apiGet('/clan/raids')
    const latest = data?.items?.[0] ?? null
    raid = latest?.state === 'ongoing' ? latest : null
  } catch { raid = null }

  if (!raid) return inactiveEmbed('💎 Rappel Raid Capital', 'Donjon Rouge • Raid Capital')

  let allMembers = []
  try {
    const [r1, r2] = await Promise.all([apiGet('/clan/dr1/members'), apiGet('/clan/dr2/members')])
    allMembers = [...(r1?.items ?? []), ...(r2?.items ?? [])]
  } catch {}

  const raidMap = new Map((raid.members || []).map(m => [m.tag, m]))

  const noAtk   = allMembers.filter(m => !raidMap.has(m.tag))
  const partial  = allMembers.filter(m => { const rm = raidMap.get(m.tag); return rm && (rm.attacks ?? 0) > 0 && (rm.attacks ?? 0) < (rm.attackLimit ?? 5) })
  const done     = allMembers.filter(m => { const rm = raidMap.get(m.tag); return rm && (rm.attacks ?? 0) >= (rm.attackLimit ?? 5) })

  const mentionTags = [...noAtk, ...partial].map(m => m.tag)
  const discordMap  = mentionTags.length > 0 ? await getDiscordIds(mentionTags) : {}

  const lines = [
    ...noAtk.map(m   => `❌ ${discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name} — 0/5`),
    ...partial.map(m => { const rm = raidMap.get(m.tag); return `⚡ ${discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name} — ${rm.attacks}/${rm.attackLimit ?? 5}` }),
    ...done.map(m    => `✅ ${m.name} — ${raidMap.get(m.tag)?.attackLimit ?? 5}/${raidMap.get(m.tag)?.attackLimit ?? 5}`),
  ]

  return new EmbedBuilder()
    .setColor((noAtk.length + partial.length) === 0 ? 0x2E7D32 : 0xFF6600)
    .setTitle('💎 Rappel Raid Capital')
    .setDescription(lines.join('\n').slice(0, 4096) || '✅ Tout le monde a attaqué !')
    .setFooter({ text: `Donjon Rouge • Raid Capital • Aujourd'hui à ${parisTime()}` })
    .setTimestamp()
}

// ─── JDC rappel ───────────────────────────────────────────────────────────────

async function buildRappelJdcEmbed() {
  const active = await isJdcActive()
  if (!active) return inactiveEmbed('🎖️ Rappel JDC', 'Donjon Rouge • Jeux des Clans')

  const allUnder   = await fetchJdcMembersUnder5000()
  const discordMap = allUnder.length > 0 ? await getDiscordIds(allUnder.map(m => m.tag)) : {}

  const zero    = allUnder.filter(m => m.points === 0)
  const partial = allUnder.filter(m => m.points > 0)

  const lines = [
    ...zero.map(m    => `❌ ${discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name} — 0 pts`),
    ...partial.map(m => `⚡ ${discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name} — ${m.points.toLocaleString('fr-FR')} pts`),
  ]

  return new EmbedBuilder()
    .setColor(lines.length === 0 ? 0x2E7D32 : 0xFF6600)
    .setTitle('🎖️ Rappel JDC')
    .setDescription(lines.length === 0
      ? '✅ Tous les membres ont atteint 5 000 pts !'
      : `🎯 Objectif : 5 000 pts minimum\n\n${lines.join('\n')}`.slice(0, 4096))
    .setFooter({ text: `Donjon Rouge • Jeux des Clans • Aujourd'hui à ${parisTime()}` })
    .setTimestamp()
}

// ─── Mise à jour des 4 embeds de rappel ──────────────────────────────────────

async function updateRappelEmbeds(client) {
  const builds = await Promise.allSettled([
    buildRappelWarEmbed('dr1'),
    buildRappelWarEmbed('dr2'),
    buildRappelRaidsEmbed(),
    buildRappelJdcEmbed(),
  ])

  const titles = ['⚔️ Rappel Guerre DR1', '⚔️ Rappel Guerre DR2', '💎 Rappel Raid Capital', '🎖️ Rappel JDC']
  const embeds = builds.map((r, i) =>
    r.status === 'fulfilled' ? r.value : inactiveEmbed(titles[i], `Donjon Rouge • ${titles[i]}`)
  )

  const keys   = ['rappel_dr1_id', 'rappel_dr2_id', 'rappel_raids_id', 'rappel_jdc_id']
  const btnIds = ['rappel_refresh_dr1', 'rappel_refresh_dr2', 'rappel_refresh_raids', 'rappel_refresh_jdc']

  await Promise.allSettled(
    embeds.map((embed, i) => replaceEmbed(client, RAPPEL_CHANNEL_ID, keys[i], embed, makeBtn(btnIds[i])))
  )
}

module.exports = {
  buildRappelWarEmbed,
  buildRappelRaidsEmbed,
  buildRappelJdcEmbed,
  updateRappelEmbeds,
}
