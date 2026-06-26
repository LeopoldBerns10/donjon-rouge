const { EmbedBuilder } = require('discord.js')
const supabase = require('../supabase.js')
const { isJdcActive, fetchJdcMembersUnder5000 } = require('./jdcTracker.js')

const BASE              = process.env.BACKEND_URL
const RAPPEL_CHANNEL_ID = '1510972919407317142'
const DR1_TAG           = '#29292QPRC'
const DR2_TAG           = '#2RCGG9YR9'

// ─── Helpers API ──────────────────────────────────────────────────────────────

async function apiGet(path) {
  const res = await fetch(`${BASE}/api/coc${path}`)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
}

function parseWarTime(str) {
  if (!str) return null
  const s = str.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
  return new Date(s)
}

function normalizeWar(war, ourTag) {
  if (!war) return war
  if (war.clan?.tag === ourTag) return war
  if (war.opponent?.tag === ourTag) return { ...war, clan: war.opponent, opponent: war.clan }
  return war
}

async function fetchWar(clanKey) {
  const ourTag  = clanKey === 'dr1' ? DR1_TAG : DR2_TAG
  const ldcPath = clanKey === 'dr1' ? '/ldc/current' : '/ldc/dr2/current'
  try {
    const war      = await apiGet(`/clan/${clanKey}/war`)
    const inactive = !war || war.state === 'notInWar' || war.state === 'warEnded'
    if (!inactive) return { war, isLdc: false }
    try {
      const ldc = await apiGet(ldcPath)
      if (ldc?.rounds) {
        const round = ldc.rounds.find(r => r.war?.state === 'inWar')
                   || ldc.rounds.find(r => r.war?.state === 'preparation')
        if (round?.war) return { war: normalizeWar(round.war, ourTag), isLdc: true }
      }
    } catch {}
    return { war, isLdc: false }
  } catch {
    return { war: null, isLdc: false }
  }
}

async function fetchRaid() {
  try {
    const data   = await apiGet('/clan/raids')
    const latest = data?.items?.[0] ?? null
    if (!latest?.startTime) return null
    const start = parseWarTime(latest.startTime) ?? new Date(latest.startTime)
    const end   = latest.endTime ? (parseWarTime(latest.endTime) ?? new Date(latest.endTime)) : null
    if (isNaN(start)) return null
    if (start.getTime() < Date.now() - 7 * 24 * 3600000) return null
    if (end && end.getTime() < Date.now()) return null
    return latest
  } catch {
    return null
  }
}

async function getDiscordIds(tags) {
  if (!tags.length) return {}
  const { data } = await supabase.from('discord_links').select('discord_id, coc_tag').in('coc_tag', tags)
  const map = {}
  for (const row of data || []) map[row.coc_tag] = row.discord_id
  return map
}

async function fetchAllClanMembers() {
  try {
    const [dr1, dr2] = await Promise.all([apiGet('/clan/dr1/members'), apiGet('/clan/dr2/members')])
    return [...(dr1?.items ?? []), ...(dr2?.items ?? [])]
  } catch {
    return []
  }
}

// ─── Embed builders (aucune mention) ─────────────────────────────────────────

async function buildJdcRappelEmbed() {
  const active = await isJdcActive()

  if (!active) {
    return new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('😴 Jeux de Clan — Inactif')
      .setDescription('😴 Aucun Jeux de Clan en cours')
      .setFooter({ text: 'Donjon Rouge • Jeux de Clan' })
      .setTimestamp()
  }

  const allUnder = await fetchJdcMembersUnder5000()
  const zero     = allUnder.filter(m => m.points === 0)
  const partial  = allUnder.filter(m => m.points > 0)
  const fmtPts   = n => n.toLocaleString('fr-FR')

  if (allUnder.length === 0) {
    return new EmbedBuilder()
      .setColor(0x2E7D32)
      .setTitle('🎮 Jeux de Clan — Actif')
      .addFields({
        name:  '📊 Objectif DR',
        value: '✅ Tous les membres ont atteint 5 000 pts !',
      })
      .setFooter({ text: 'Donjon Rouge • Jeux de Clan' })
      .setTimestamp()
  }

  const fields = [
    {
      name:  '📊 Retardataires',
      value: `**${allUnder.length} membre${allUnder.length > 1 ? 's' : ''}** sous 5 000 pts` +
             (zero.length > 0 ? ` | **${zero.length}** à 0 pt` : ''),
    },
  ]

  if (zero.length > 0) {
    fields.push({
      name:  '❌ Membres à 0 pt',
      value: zero.map(m => `• ${m.name}`).join('\n').slice(0, 1024),
    })
  }

  if (partial.length > 0) {
    fields.push({
      name:  '⚠️ En cours (< 5 000 pts)',
      value: partial.map(m => `• ${m.name} — ${fmtPts(m.points)} pts`).join('\n').slice(0, 1024),
    })
  }

  fields.push({
    name:  '⏱️ Rappels',
    value: '⏰ Mentions automatiques à 10h et 20h (heure Paris)',
  })

  return new EmbedBuilder()
    .setColor(0xFF6600)
    .setTitle('🎮 Jeux de Clan — Actif')
    .addFields(...fields)
    .setFooter({ text: 'Donjon Rouge • Jeux de Clan' })
    .setTimestamp()
}

// ─── Gestion messages persistants ────────────────────────────────────────────

const embedCache = {}

async function ensureRappelEmbed(channel, key, embed) {
  const cached = embedCache[key]
  if (cached) {
    try {
      const msg = await channel.messages.fetch(cached)
      await msg.edit({ embeds: [embed], components: [] })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        embedCache[key] = null
        await supabase.from('bot_config').delete().eq('key', key)
      } else return null
    }
  }

  const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
  if (data?.value) {
    try {
      const msg = await channel.messages.fetch(data.value)
      embedCache[key] = msg.id
      await msg.edit({ embeds: [embed], components: [] })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        await supabase.from('bot_config').delete().eq('key', key)
      } else return null
    }
  }

  const msg = await channel.send({ embeds: [embed], components: [] })
  await supabase.from('bot_config').upsert({ key, value: msg.id, updated_at: new Date().toISOString() })
  embedCache[key] = msg.id
  console.log(`[RappelManager] Embed ${key} créé : ${msg.id}`)
  return msg
}

async function replacePingMessage(channel, key, content) {
  const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
  if (data?.value) {
    try { await (await channel.messages.fetch(data.value)).delete() } catch {}
    await supabase.from('bot_config').delete().eq('key', key)
  }
  const msg = await channel.send(content.slice(0, 2000))
  await supabase.from('bot_config').upsert({ key, value: msg.id, updated_at: new Date().toISOString() })
  console.log(`[RappelManager] Ping ${key} envoyé : ${msg.id}`)
}

// ─── Fonctions principales ────────────────────────────────────────────────────

async function updateRappelEmbeds(client) {
  const channel = await client.channels.fetch(RAPPEL_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const embedJdc = await buildJdcRappelEmbed()
  await ensureRappelEmbed(channel, 'rappel_embed_jdc_id', embedJdc)
}

async function sendRappelPings(client) {
  const channel = await client.channels.fetch(RAPPEL_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const [{ war: warDR1, isLdc: dr1Ldc }, { war: warDR2, isLdc: dr2Ldc }, raid, jdcActive] = await Promise.all([
    fetchWar('dr1'),
    fetchWar('dr2'),
    fetchRaid(),
    isJdcActive(),
  ])

  // ── Guerre DR1 ────────────────────────────────────────────────────────────
  if (warDR1?.state === 'inWar') {
    const late = (warDR1.clan?.members ?? []).filter(m => (m.attacks?.length ?? 0) === 0)
    if (late.length > 0) {
      const discordMap = await getDiscordIds(late.map(m => m.tag))
      const mentions   = late.map(m => discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name)
      const endTime    = warDR1.endTime ? parseWarTime(warDR1.endTime) : null
      const hoursLeft  = endTime ? Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / 3600000)) : '?'
      const content = [
        `⚔️ ${mentions.join(' ')}`,
        `Vous n'avez pas encore attaqué en guerre DR1 !`,
        `Il reste ${hoursLeft}h — chaque attaque compte ! ⚔️`,
      ].join('\n')
      await replacePingMessage(channel, 'rappel_ping_dr1_id', content).catch(e => console.error('[RappelManager] Ping DR1:', e))
    }
  }

  // ── Guerre DR2 ────────────────────────────────────────────────────────────
  if (warDR2?.state === 'inWar') {
    const late = (warDR2.clan?.members ?? []).filter(m => (m.attacks?.length ?? 0) === 0)
    if (late.length > 0) {
      const discordMap = await getDiscordIds(late.map(m => m.tag))
      const mentions   = late.map(m => discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name)
      const endTime    = warDR2.endTime ? parseWarTime(warDR2.endTime) : null
      const hoursLeft  = endTime ? Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / 3600000)) : '?'
      const content = [
        `⚔️ ${mentions.join(' ')}`,
        `Vous n'avez pas encore attaqué en guerre DR2 !`,
        `Il reste ${hoursLeft}h — chaque attaque compte ! ⚔️`,
      ].join('\n')
      await replacePingMessage(channel, 'rappel_ping_dr2_id', content).catch(e => console.error('[RappelManager] Ping DR2:', e))
    }
  }

  // ── Raid ──────────────────────────────────────────────────────────────────
  if (raid) {
    const allMembers = await fetchAllClanMembers()
    const raidMap    = new Map((raid.members ?? []).map(m => [m.tag, m]))
    const noRaid     = allMembers.filter(m => !raidMap.has(m.tag))
    if (noRaid.length > 0) {
      const discordMap = await getDiscordIds(noRaid.map(m => m.tag))
      const mentions   = noRaid.map(m => discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name)
      const content = [
        `💎 ${mentions.join(' ')}`,
        `Vous n'avez pas encore participé au Raid Capital !`,
        `Le raid se termine lundi à 9h ⏰`,
      ].join('\n')
      await replacePingMessage(channel, 'rappel_ping_raid_id', content).catch(e => console.error('[RappelManager] Ping Raid:', e))
    }
  }

  // ── JDC ───────────────────────────────────────────────────────────────────
  if (jdcActive) {
    const allUnder = await fetchJdcMembersUnder5000()
    const zero     = allUnder.filter(m => m.points === 0)
    const partial  = allUnder.filter(m => m.points > 0)
    if (allUnder.length === 0) return

    const discordMap = await getDiscordIds(allUnder.map(m => m.tag))
    const fmtPts     = n => n.toLocaleString('fr-FR')
    const lines      = []

    if (zero.length > 0) {
      const mentions = zero.map(m => discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name)
      lines.push(`🎮 ${mentions.join(' ')}`)
      lines.push(`Jeux de Clan en cours ! Vous n'avez pas encore participé.`)
    }
    if (partial.length > 0) {
      const mentions = partial.map(m => {
        const ref = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
        return `${ref} (${fmtPts(m.points)} pts)`
      })
      if (lines.length > 0) lines.push('')
      lines.push(`🔥 ${mentions.join(' ')}`)
      lines.push(`Tu es en bonne voie mais l'objectif DR est 5 000 pts !`)
    }
    lines.push(`Objectif DR : 5 000 pts minimum 🎯`)

    await replacePingMessage(channel, 'rappel_ping_jdc_id', lines.join('\n')).catch(e => console.error('[RappelManager] Ping JDC:', e))
  }
}

module.exports = { updateRappelEmbeds, sendRappelPings }
