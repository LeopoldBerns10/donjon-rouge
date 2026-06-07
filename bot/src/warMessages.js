const { EmbedBuilder } = require('discord.js')
const supabase = require('./supabase.js')
const { DR1_WAR_CHANNEL, DR2_WAR_CHANNEL, RAID_CHANNEL } = require('./config/warChannels.js')

const BASE = process.env.BACKEND_URL
const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

const msgIds = {
  dr1_war_msg1: null,
  dr1_war_msg2: null,
  dr1_war_msg3: null,
  dr2_war_msg1: null,
  dr2_war_msg2: null,
  dr2_war_msg3: null,
  raid_msg:     null,
}

let isUpdating = false
let warChannelsInitialized = false

function activateWarChannels() {
  warChannelsInitialized = true
}

async function apiGet(path) {
  const res = await fetch(`${BASE}/api/coc${path}`)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
}

function parseWarTime(cocTimeStr) {
  if (!cocTimeStr) return null
  const s = cocTimeStr.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  )
  return new Date(s)
}

function normalizeWar(war, ourTag) {
  if (!war) return war
  if (war.clan?.tag === ourTag) return war
  if (war.opponent?.tag === ourTag) return { ...war, clan: war.opponent, opponent: war.clan }
  return war
}

// ─── Embed builders ────────────────────────────────────────────────────────────

function buildWarActiveEmbed(war, context = {}) {
  const { isLdc = false, day = null } = context
  const attacksPerMember = war.attacksPerMember || (isLdc ? 1 : 2)
  const clanName = war.clan?.name || '?'
  const oppName  = war.opponent?.name || '?'

  const title = isLdc
    ? `⚔️ ${clanName} vs ${oppName} — LDC${day ? ` Jour ${day}` : ''}`
    : `⚔️ GDC — ${clanName} vs ${oppName}`

  const members      = war.clan?.members || []
  const clanStars    = war.clan?.stars ?? 0
  const oppStars     = war.opponent?.stars ?? 0
  const attacksUsed  = members.reduce((acc, m) => acc + (m.attacks?.length ?? 0), 0)
  const totalAttacks = members.length * attacksPerMember

  const sorted = [...members].sort((a, b) => {
    const aA = a.attacks?.length ?? 0
    const bA = b.attacks?.length ?? 0
    if (aA === 0 && bA !== 0) return -1
    if (aA !== 0 && bA === 0) return 1
    if (aA < attacksPerMember && bA === attacksPerMember) return -1
    if (aA === attacksPerMember && bA < attacksPerMember) return 1
    return b.townhallLevel - a.townhallLevel
  })

  const lines = sorted.map(m => {
    const atks       = m.attacks?.length ?? 0
    const icon       = atks === 0 ? '❌' : atks < attacksPerMember ? '⚡' : '✅'
    const totalStars = (m.attacks || []).reduce((acc, a) => acc + (a.stars ?? 0), 0)
    const starsStr   = atks > 0 ? ` ${'⭐'.repeat(totalStars)}` : ''
    return `${icon} HDV${m.townhallLevel} ${m.name} — ${atks}/${attacksPerMember} att.${starsStr}`
  })

  return new EmbedBuilder()
    .setColor(0xFF6600)
    .setTitle(title)
    .addFields(
      { name: '📊 Score', value: `⭐ ${clanStars} vs ⭐ ${oppStars} | ⚔️ ${attacksUsed}/${totalAttacks} attaques`, inline: false },
      { name: '🏹 Statut des guerriers', value: lines.join('\n').slice(0, 1024) || '—', inline: false }
    )
    .setFooter({ text: 'Mis à jour' })
    .setTimestamp()
}

function buildWarPrepEmbed(war) {
  const startTime = parseWarTime(war.startTime)
  const hoursLeft = startTime
    ? Math.max(0, Math.ceil((startTime.getTime() - Date.now()) / 3600000))
    : null

  const ours   = [...(war.clan?.members   || [])].sort((a, b) => b.townhallLevel - a.townhallLevel)
  const theirs = [...(war.opponent?.members || [])].sort((a, b) => b.townhallLevel - a.townhallLevel)

  const oursValue   = ours.length   ? ours.map(m   => `\`HDV${m.townhallLevel}\` ${m.name}`).join('\n').slice(0, 1024)   : '—'
  const theirsValue = theirs.length ? theirs.map(m => `\`HDV${m.townhallLevel}\` ${m.name}`).join('\n').slice(0, 1024) : '—'

  return new EmbedBuilder()
    .setColor(0x1565C0)
    .setTitle('🛡️ Prochaine guerre — Préparation')
    .addFields(
      { name: '🏰 Nos guerriers',    value: oursValue,   inline: true },
      { name: '⚔️ Leurs guerriers', value: theirsValue, inline: true }
    )
    .setFooter({ text: hoursLeft !== null ? `Guerre commence dans ${hoursLeft}h` : 'Guerre commence bientôt' })
    .setTimestamp()
}

function buildNoWarEmbed(message = null) {
  return new EmbedBuilder()
    .setColor(0x555555)
    .setTitle('😴 Aucune guerre en cours')
    .setDescription(message || 'Prochain lancement sur inscription — commande /proposer-guerre à venir !')
    .setTimestamp()
}

function buildRaidEmbed(raid) {
  if (!raid) {
    return new EmbedBuilder()
      .setColor(0x7B2FBE)
      .setTitle('💎 Raid Capital — Donjon Rouge')
      .setDescription('😴 Prochain raid vendredi — DR1 uniquement')
      .setTimestamp()
  }

  const fmt    = n => String(Math.round(n ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const medals = ['🥇', '🥈', '🥉']

  const sorted = [...(raid.members || [])].sort((a, b) =>
    (b.capitalResourcesLooted ?? 0) - (a.capitalResourcesLooted ?? 0)
  )

  const lines = sorted.map((m, i) => {
    const medal = medals[i] || '▫️'
    const loot  = fmt(m.capitalResourcesLooted ?? 0)
    const atks  = m.attacks ?? 0
    const limit = m.attackLimit ?? 5
    return `${medal} ${m.name} — ${loot} or | ${atks}/${limit} att.`
  })

  const totalAttacks   = raid.totalAttacks   ?? sorted.reduce((acc, m) => acc + (m.attacks ?? 0), 0)
  const totalLoot      = raid.capitalTotalLoot ?? sorted.reduce((acc, m) => acc + (m.capitalResourcesLooted ?? 0), 0)
  const raidsCompleted = raid.raidsCompleted ?? 0

  const statsValue = `⚔️ ${totalAttacks} attaques | 💰 ${fmt(totalLoot)} or | 🏰 ${raidsCompleted} raids complétés`

  return new EmbedBuilder()
    .setColor(0x7B2FBE)
    .setTitle('💎 Raid Capital — Donjon Rouge')
    .addFields(
      { name: `💎 Participants (${sorted.length})`, value: lines.join('\n').slice(0, 1024) || '—', inline: false },
      { name: '📊 Stats globales',                  value: statsValue,                             inline: false },
    )
    .setTimestamp()
}

function buildLdcRecapEmbed(cwlData, ourTag) {
  const season  = cwlData.season || '?'
  const ourClan = (cwlData.clans || []).find(c => c.tag === ourTag)
  const ourName = ourClan?.name || ourTag

  // Calcul des étoiles totales par clan depuis les rounds (seules nos guerres sont dispo)
  const clanStarsMap = {}
  for (const clan of (cwlData.clans || [])) {
    clanStarsMap[clan.tag] = clan.stars ?? 0
  }
  const hasPrecomputed = (cwlData.clans || []).some(c => (c.stars ?? 0) > 0)
  if (!hasPrecomputed) {
    for (const round of (cwlData.rounds || [])) {
      const w = round.war
      if (!w || (w.state !== 'inWar' && w.state !== 'warEnded')) continue
      const n = normalizeWar(w, ourTag)
      clanStarsMap[n.clan?.tag]     = (clanStarsMap[n.clan?.tag]     || 0) + (n.clan?.stars     || 0)
      clanStarsMap[n.opponent?.tag] = (clanStarsMap[n.opponent?.tag] || 0) + (n.opponent?.stars || 0)
    }
  }

  const sortedClans = [...(cwlData.clans || [])].sort((a, b) =>
    (clanStarsMap[b.tag] || 0) - (clanStarsMap[a.tag] || 0)
  )
  const ourRank       = sortedClans.findIndex(c => c.tag === ourTag) + 1
  const ourTotalStars = clanStarsMap[ourTag] || 0
  const medalIcon     = ['🥇', '🥈', '🥉'][ourRank - 1] || '🏅'
  const ordinal       = ourRank === 1 ? '1er' : `${ourRank}ème`
  const rankValue     = `${medalIcon} ${ordinal} / ${sortedClans.length} clans — ⭐ ${ourTotalStars} étoiles totales`

  // Résultats des 7 rounds
  const rounds = cwlData.rounds || []
  const resultLines = rounds.map((round, i) => {
    const day = i + 1
    const w   = round.war
    if (!w) return `🔒 Jour ${day} — À venir`
    const n       = normalizeWar(w, ourTag)
    const oppName = n.opponent?.name || '?'
    if (n.state === 'preparation') return `🛡️ Jour ${day} vs ${oppName} — Préparation`
    if (n.state === 'inWar')       return `⚔️ Jour ${day} vs ${oppName} — En cours`
    if (n.state === 'warEnded') {
      const cS = n.clan?.stars ?? 0
      const oS = n.opponent?.stars ?? 0
      const cD = n.clan?.destructionPercentage ?? 0
      const oD = n.opponent?.destructionPercentage ?? 0
      const won = cS > oS || (cS === oS && cD > oD)
      return `${won ? '✅' : '❌'} Jour ${day} vs ${oppName} — ⭐ ${cS} vs ${oS} — ${won ? 'Victoire' : 'Défaite'}`
    }
    return `🔒 Jour ${day} — À venir`
  })
  while (resultLines.length < 7) resultLines.push(`🔒 Jour ${resultLines.length + 1} — À venir`)

  // Performances des guerriers sur la saison
  const playerStats = {}
  for (const round of rounds) {
    const w = round.war
    if (!w) continue
    const n = normalizeWar(w, ourTag)
    for (const m of (n.clan?.members || [])) {
      if (!playerStats[m.tag]) playerStats[m.tag] = { name: m.name, stars: 0, attacks: 0 }
      playerStats[m.tag].attacks += (m.attacks?.length ?? 0)
      playerStats[m.tag].stars   += (m.attacks || []).reduce((acc, a) => acc + (a.stars ?? 0), 0)
    }
  }
  const perfLines = Object.values(playerStats)
    .sort((a, b) => b.stars - a.stars)
    .map(p => `⭐ ${p.stars} | ${p.name} — ${p.attacks} att.`)

  return new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`🏆 LDC Saison ${season} — ${ourName}`)
    .addFields(
      { name: '📊 Classement',            value: rankValue,                              inline: false },
      { name: '📅 Résultats',             value: resultLines.join('\n').slice(0, 1024),  inline: false },
      { name: '🏹 Performances guerriers', value: perfLines.join('\n').slice(0, 1024) || '—', inline: false }
    )
    .setFooter({ text: 'LDC • Mis à jour' })
    .setTimestamp()
}

// ─── getOrCreate war message ───────────────────────────────────────────────────

async function getOrCreateWarMessage(channel, key, payload) {
  if (msgIds[key]) {
    try {
      const msg = await channel.messages.fetch(msgIds[key])
      await msg.edit(payload)
      return msg
    } catch {
      msgIds[key] = null
    }
  }

  const { data } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (data?.value) {
    try {
      const msg = await channel.messages.fetch(data.value)
      msgIds[key] = msg.id
      await msg.edit(payload)
      return msg
    } catch {
      await supabase.from('bot_config').delete().eq('key', key)
    }
  }

  const msg = await channel.send(payload)
  await supabase
    .from('bot_config')
    .upsert({ key, value: msg.id, updated_at: new Date().toISOString() })
  msgIds[key] = msg.id
  console.log(`[WarChannels] Nouveau message créé pour ${key} : ${msg.id}`)
  return msg
}

// ─── Récupération de la guerre pour un clan ───────────────────────────────────

async function fetchWarForClan(clanKey) {
  const ourTag  = clanKey === 'dr1' ? DR1_TAG : DR2_TAG
  const ldcPath = clanKey === 'dr1' ? '/ldc/current' : '/ldc/dr2/current'
  const context = { isLdc: false, day: null, nextPrepWar: null, cwlData: null }

  let war = null
  try { war = await apiGet(`/clan/${clanKey}/war`) } catch { war = null }

  const inactive = !war || war.state === 'notInWar' || war.state === 'warEnded'
  if (inactive) {
    try {
      const ldc = await apiGet(ldcPath)
      if (ldc?.rounds) {
        // Vérifie que la saison LDC a au moins un round avec une guerre
        const hasAnyWar = ldc.rounds.some(r => r.war != null)
        if (hasAnyWar) context.cwlData = ldc

        const idx = ldc.rounds.findIndex(r =>
          r.war?.state === 'inWar' || r.war?.state === 'preparation'
        )
        if (idx !== -1) {
          war = normalizeWar(ldc.rounds[idx].war, ourTag)
          context.isLdc = true
          context.day   = idx + 1
          const next = ldc.rounds[idx + 1]
          if (next?.war?.state === 'preparation') {
            context.nextPrepWar = normalizeWar(next.war, ourTag)
          }
        }
      }
    } catch {}
  }

  return { war, context }
}

// ─── Mise à jour des salons de guerre ─────────────────────────────────────────

async function updateWarChannels(client) {
  if (!warChannelsInitialized) return
  if (isUpdating) return
  isUpdating = true
  try {
  const configs = [
    { clanKey: 'dr1', channelId: DR1_WAR_CHANNEL, msg1Key: 'dr1_war_msg1', msg2Key: 'dr1_war_msg2', msg3Key: 'dr1_war_msg3' },
    { clanKey: 'dr2', channelId: DR2_WAR_CHANNEL, msg1Key: 'dr2_war_msg1', msg2Key: 'dr2_war_msg2', msg3Key: 'dr2_war_msg3' },
  ]

  for (const { clanKey, channelId, msg1Key, msg2Key, msg3Key } of configs) {
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null)
      if (!channel) continue

      const { war, context } = await fetchWarForClan(clanKey)
      const ourTag = clanKey === 'dr1' ? DR1_TAG : DR2_TAG

      if (context.cwlData) {
        // ── Mode LDC : 3 messages ──
        const recapEmbed = buildLdcRecapEmbed(context.cwlData, ourTag)

        let activeEmbed, prepEmbed
        if (war?.state === 'inWar') {
          activeEmbed = buildWarActiveEmbed(war, context)
          prepEmbed   = context.nextPrepWar ? buildWarPrepEmbed(context.nextPrepWar) : buildNoWarEmbed()
        } else if (war?.state === 'preparation') {
          activeEmbed = buildNoWarEmbed('⏳ Première guerre à venir')
          prepEmbed   = buildWarPrepEmbed(war)
        } else {
          activeEmbed = buildNoWarEmbed()
          prepEmbed   = buildNoWarEmbed()
        }

        await getOrCreateWarMessage(channel, msg1Key, { embeds: [recapEmbed] })
        await getOrCreateWarMessage(channel, msg2Key, { embeds: [activeEmbed] })
        await getOrCreateWarMessage(channel, msg3Key, { embeds: [prepEmbed] })
      } else {
        // ── Mode GDC : 2 messages ──
        if (war?.state === 'inWar') {
          await getOrCreateWarMessage(channel, msg1Key, { embeds: [buildWarActiveEmbed(war, context)] })
          await getOrCreateWarMessage(channel, msg2Key, { embeds: [buildNoWarEmbed()] })
        } else if (war?.state === 'preparation') {
          await getOrCreateWarMessage(channel, msg1Key, { embeds: [buildNoWarEmbed('⏳ Première guerre demain')] })
          await getOrCreateWarMessage(channel, msg2Key, { embeds: [buildWarPrepEmbed(war)] })
        } else {
          await getOrCreateWarMessage(channel, msg1Key, { embeds: [buildNoWarEmbed()] })
          await getOrCreateWarMessage(channel, msg2Key, { embeds: [buildNoWarEmbed()] })
        }
      }
    } catch (e) {
      console.error(`[WarChannels] Erreur pour ${clanKey}:`, e)
    }
  }

  // Raid
  try {
    const raidChannel = await client.channels.fetch(RAID_CHANNEL).catch(() => null)
    if (!raidChannel) return

    let currentRaid = null
    try {
      const raidData = await apiGet('/clan/raids')
      const latest   = raidData?.items?.[0] || null
      if (latest?.startTime) {
        const start        = parseWarTime(latest.startTime) || new Date(latest.startTime)
        const end          = latest.endTime ? (parseWarTime(latest.endTime) || new Date(latest.endTime)) : null
        const sevenDaysAgo = Date.now() - 7 * 24 * 3600000
        const notTooOld    = !isNaN(start) && start.getTime() > sevenDaysAgo
        const notEnded     = !end || end.getTime() > Date.now()
        if (notTooOld && notEnded) currentRaid = latest
      }
    } catch {}

    await getOrCreateWarMessage(raidChannel, 'raid_msg', { embeds: [buildRaidEmbed(currentRaid)] })
  } catch (e) {
    console.error('[WarChannels] Erreur raid:', e)
  }
  } finally {
    isUpdating = false
  }
}

async function resetWarMessages() {
  const keys = ['dr1_war_msg1', 'dr1_war_msg2', 'dr1_war_msg3', 'dr2_war_msg1', 'dr2_war_msg2', 'dr2_war_msg3']
  for (const key of keys) {
    msgIds[key] = null
    await supabase.from('bot_config').delete().eq('key', key)
  }
}

async function resetWarKeys(keys) {
  for (const key of keys) {
    msgIds[key] = null
    await supabase.from('bot_config').delete().eq('key', key)
  }
}

module.exports = { updateWarChannels, resetWarMessages, resetWarKeys, activateWarChannels, buildWarActiveEmbed, buildWarPrepEmbed, buildNoWarEmbed, buildRaidEmbed, buildLdcRecapEmbed }
