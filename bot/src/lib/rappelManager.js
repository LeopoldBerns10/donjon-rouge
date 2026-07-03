const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { apiGet, parseWarTime, normalizeWar } = require('../cocApi.js')
const supabase = require('../supabase.js')
const { isJdcActive, fetchJdcMembersUnder5000 } = require('./jdcTracker.js')

const RAPPEL_CHANNEL_ID = '1510972919407317142'
const DR1_TAG           = '#29292QPRC'
const DR2_TAG           = '#2RCGG9YR9'

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
    return latest?.state === 'ongoing' ? latest : null
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

// ─── Embed builder ────────────────────────────────────────────────────────────

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

  const allUnder   = await fetchJdcMembersUnder5000()
  const zero       = allUnder.filter(m => m.points === 0)
  const partial    = allUnder.filter(m => m.points > 0)
  const fmtPts     = n => n.toLocaleString('fr-FR')

  const allTags    = allUnder.map(m => m.tag)
  const discordMap = allTags.length > 0 ? await getDiscordIds(allTags) : {}

  const fmt = (m, icon, suffix) => {
    const id = discordMap[m.tag]
    return id ? `${icon} <@${id}> — ${m.name} — ${suffix}` : `${icon} ${m.name} — ${suffix}`
  }

  const lines = [
    ...zero.map(m    => fmt(m, '❌', '0 pts')),
    ...partial.map(m => fmt(m, '⚠️', `${fmtPts(m.points)} pts`)),
  ]

  const description = lines.length === 0
    ? '✅ Tous les membres ont atteint 5 000 pts !'
    : `🎯 Objectif DR : 5 000 pts minimum\n\n${lines.join('\n')}`

  return new EmbedBuilder()
    .setColor(lines.length === 0 ? 0x2E7D32 : 0xFF6600)
    .setTitle('🎮 Jeux de Clan — Actif')
    .setDescription(description.slice(0, 4096))
    .setFooter({ text: 'Donjon Rouge • Jeux de Clan' })
    .setTimestamp()
}

// ─── Gestion messages persistants ────────────────────────────────────────────

const embedCache = {}

async function ensureRappelEmbed(channel, key, embed, components = []) {
  const cached = embedCache[key]
  if (cached) {
    try {
      const msg = await channel.messages.fetch(cached)
      await msg.edit({ embeds: [embed], components })
      console.log(`[RappelManager] ensureRappelEmbed key=${key} action=edited_from_cache`)
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        console.log(`[RappelManager] ensureRappelEmbed key=${key} action=cache_miss_404`)
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
      await msg.edit({ embeds: [embed], components })
      console.log(`[RappelManager] ensureRappelEmbed key=${key} action=edited_from_db`)
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        console.log(`[RappelManager] ensureRappelEmbed key=${key} action=db_miss_404`)
        await supabase.from('bot_config').delete().eq('key', key)
      } else return null
    }
  }

  const msg = await channel.send({ embeds: [embed], components })
  await supabase.from('bot_config').upsert({ key, value: msg.id, updated_at: new Date().toISOString() })
  embedCache[key] = msg.id
  console.log(`[RappelManager] ensureRappelEmbed key=${key} action=created msg=${msg.id}`)
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

const JDC_REFRESH_ROW = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('refresh_rappel_jdc')
    .setLabel('🔄 Actualiser')
    .setStyle(ButtonStyle.Secondary)
)

async function updateRappelEmbeds(client) {
  const channel = await client.channels.fetch(RAPPEL_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const embedJdc = await buildJdcRappelEmbed()
  await ensureRappelEmbed(channel, 'rappel_embed_jdc_id', embedJdc, [JDC_REFRESH_ROW])
}

async function sendRappelPings(client) {
  const channel = await client.channels.fetch(RAPPEL_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const [{ war: warDR1, isLdc: dr1Ldc }, { war: warDR2, isLdc: dr2Ldc }] = await Promise.all([
    fetchWar('dr1'),
    fetchWar('dr2'),
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

}

module.exports = { updateRappelEmbeds, sendRappelPings }
