const { EmbedBuilder } = require('discord.js')
const supabase = require('../supabase.js')
const { getDiscordIds } = require('./warEmbeds.js')
const { normalizeWar } = require('./exploits.js')
const { apiGet } = require('../cocApi.js')

const RESULTATS_CHANNEL_ID = '1516046143887376505'

// ─── GDC résultats ────────────────────────────────────────────────────────────

async function buildResultatsGdc(war, clanLabel) {
  const members   = war.clan?.members || []
  const clanStars = war.clan?.stars ?? 0
  const oppStars  = war.opponent?.stars ?? 0
  const oppName   = war.opponent?.name || '?'
  const clanName  = war.clan?.name || clanLabel

  const won = clanStars > oppStars
  const resultText = clanStars > oppStars ? '🏆 Victoire' : clanStars < oppStars ? '💀 Défaite' : '🤝 Match nul'

  const discordMap = await getDiscordIds(members.map(m => m.tag))

  const attacked  = members.filter(m => (m.attacks?.length ?? 0) > 0)
  const noAttack  = members.filter(m => (m.attacks?.length ?? 0) === 0)

  const memberLines = attacked.map(m => {
    const atks   = m.attacks || []
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    const atk1   = atks[0] ? `⭐${atks[0].stars} (${Math.round(atks[0].destructionPercentage ?? 0)}%)` : '—'
    const atk2   = atks[1] ? `⭐${atks[1].stars} (${Math.round(atks[1].destructionPercentage ?? 0)}%)` : '—'
    const total  = atks.reduce((acc, a) => acc + (a.stars ?? 0), 0)
    return `${mention} — ${m.name} | ${atk1} ${atk2} | ⭐${total}`
  })

  const noAtkLines = noAttack.map(m => {
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${mention} — ${m.name}`
  })

  const embed = new EmbedBuilder()
    .setColor(won ? 0x2E7D32 : clanStars < oppStars ? 0x8B0000 : 0x607D8B)
    .setTitle(`⚔️ Résultats GDC — ${clanName} vs ${oppName}`)
    .setDescription(`${resultText} | ⭐ ${clanStars} vs ${oppStars}`)
    .setFooter({ text: `Donjon Rouge • ${clanLabel}` })
    .setTimestamp()

  if (memberLines.length > 0) {
    embed.addFields({ name: '🏹 Attaques', value: memberLines.join('\n').slice(0, 1024), inline: false })
  }
  if (noAtkLines.length > 0) {
    embed.addFields({ name: '⚠️ N\'ont pas attaqué', value: noAtkLines.join('\n').slice(0, 1024), inline: false })
  }

  return embed
}

// ─── LDC résultats ────────────────────────────────────────────────────────────

async function buildResultatsLdc(war, clanLabel) {
  const members   = war.clan?.members || []
  const clanStars = war.clan?.stars ?? 0
  const oppStars  = war.opponent?.stars ?? 0
  const oppName   = war.opponent?.name || '?'
  const clanName  = war.clan?.name || clanLabel

  const won = clanStars > oppStars
  const resultText = won ? '🏆 Victoire' : clanStars < oppStars ? '💀 Défaite' : '🤝 Match nul'

  const discordMap = await getDiscordIds(members.map(m => m.tag))

  const attacked = members.filter(m => (m.attacks?.length ?? 0) > 0)
  const noAttack = members.filter(m => (m.attacks?.length ?? 0) === 0)

  const memberLines = attacked.map(m => {
    const atk     = m.attacks?.[0]
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${mention} — ${m.name} | ⭐${atk?.stars ?? 0} (${Math.round(atk?.destructionPercentage ?? 0)}%)`
  })

  const noAtkLines = noAttack.map(m => {
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${mention} — ${m.name}`
  })

  const embed = new EmbedBuilder()
    .setColor(won ? 0x2E7D32 : clanStars < oppStars ? 0x8B0000 : 0x607D8B)
    .setTitle(`🏆 Résultats LDC — ${clanName} vs ${oppName}`)
    .setDescription(`${resultText} | ⭐ ${clanStars} vs ${oppStars}`)
    .setFooter({ text: `Donjon Rouge • ${clanLabel}` })
    .setTimestamp()

  if (memberLines.length > 0) {
    embed.addFields({ name: '🏹 Attaques', value: memberLines.join('\n').slice(0, 1024), inline: false })
  }
  if (noAtkLines.length > 0) {
    embed.addFields({ name: '⚠️ N\'ont pas attaqué', value: noAtkLines.join('\n').slice(0, 1024), inline: false })
  }

  return embed
}

// ─── Raids résultats ──────────────────────────────────────────────────────────

async function buildResultatsRaids(raid, clanMembers = []) {
  const members     = raid.members || []
  const totalLoot   = raid.capitalTotalLoot ?? members.reduce((acc, m) => acc + (m.capitalResourcesLooted ?? 0), 0)
  const totalAtks   = raid.totalAttacks ?? members.reduce((acc, m) => acc + (m.attacks ?? 0), 0)

  const raidMap    = new Map(members.map(m => [m.tag, m]))
  const discordMap = await getDiscordIds(clanMembers.map(m => m.tag))

  const fmtN = n => String(Math.round(n ?? 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  const noAtk  = clanMembers.filter(m => !raidMap.has(m.tag))
  const partial = clanMembers.filter(m => { const rm = raidMap.get(m.tag); return rm && (rm.attacks ?? 0) < (rm.attackLimit ?? 5) && (rm.attacks ?? 0) > 0 })
  const done   = clanMembers.filter(m => { const rm = raidMap.get(m.tag); return rm && (rm.attacks ?? 0) >= (rm.attackLimit ?? 5) })

  const fmt = (m, suffix) => {
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${mention} — ${m.name} | ${suffix}`
  }

  const doneLines    = done.map(m    => { const rm = raidMap.get(m.tag); return fmt(m, `${rm.attacks}/${rm.attackLimit ?? 5} att. | ${fmtN(rm.capitalResourcesLooted)} or`) })
  const partialLines = partial.map(m => { const rm = raidMap.get(m.tag); return fmt(m, `${rm.attacks}/${rm.attackLimit ?? 5} att.`) })
  const noAtkLines   = noAtk.map(m   => fmt(m, '0/5 att.'))

  const embed = new EmbedBuilder()
    .setColor(0x7B2FBE)
    .setTitle('💎 Résultats Raid Capital — DR1')
    .addFields({ name: '📊 Stats', value: `⚔️ ${totalAtks} attaques | 💰 ${fmtN(totalLoot)} or`, inline: false })
    .setFooter({ text: 'Donjon Rouge • Raid Capital' })
    .setTimestamp()

  if (doneLines.length)    embed.addFields({ name: '✅ Complété', value: doneLines.join('\n').slice(0, 1024), inline: false })
  if (partialLines.length) embed.addFields({ name: '⚠️ Incomplet', value: partialLines.join('\n').slice(0, 1024), inline: false })
  if (noAtkLines.length)   embed.addFields({ name: '⚠️ N\'ont pas attaqué', value: noAtkLines.join('\n').slice(0, 1024), inline: false })

  return embed
}

// ─── JDC résultats ────────────────────────────────────────────────────────────

async function buildResultatsJdc(jdcData) {
  const { members = [], totalPoints = 0, target = 50000 } = jdcData
  const reached = totalPoints >= target

  const discordMap = await getDiscordIds(members.map(m => m.tag))

  const sorted      = [...members].sort((a, b) => b.points - a.points)
  const participated = sorted.filter(m => m.points > 0)
  const noPartic    = sorted.filter(m => m.points === 0)

  const fmtPts = n => n.toLocaleString('fr-FR')
  const medals = ['🥇', '🥈', '🥉']

  const partLines = participated.map((m, i) => {
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${medals[i] || `${i + 1}.`} ${mention} — ${fmtPts(m.points)} pts`
  })

  const noPartLines = noPartic.map(m => {
    const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    return `${mention} — 0 pts`
  })

  const embed = new EmbedBuilder()
    .setColor(reached ? 0x2E7D32 : 0xFF6600)
    .setTitle('🎖️ Résultats JDC')
    .setDescription(`${reached ? '✅ Objectif atteint !' : '❌ Objectif non atteint'}\n**${fmtPts(totalPoints)} pts** / ${fmtPts(target)} pts`)
    .setFooter({ text: 'Donjon Rouge • Jeux des Clans' })
    .setTimestamp()

  if (partLines.length)   embed.addFields({ name: '🏆 Classement', value: partLines.join('\n').slice(0, 1024), inline: false })
  if (noPartLines.length) embed.addFields({ name: '⚠️ N\'ont pas participé', value: noPartLines.join('\n').slice(0, 1024), inline: false })

  return embed
}

// ─── Publication ──────────────────────────────────────────────────────────────

async function postResultats(client, embed, dedupKey) {
  if (dedupKey) {
    const { data } = await supabase.from('bot_config').select('value').eq('key', dedupKey).maybeSingle()
    if (data?.value) return null
  }

  const channel = await client.channels.fetch(RESULTATS_CHANNEL_ID).catch(() => null)
  if (!channel) return null

  const msg = await channel.send({ embeds: [embed] })

  if (dedupKey) {
    await supabase.from('bot_config').upsert({ key: dedupKey, value: '1', updated_at: new Date().toISOString() })
  }

  return msg
}

// ─── Détection fin d'événement + post auto ────────────────────────────────────

async function checkAndPostResultats(client, warData) {
  const { wars, dr1IsLdc, dr2IsLdc, dr1Cwl, dr2Cwl } = warData

  const configs = [
    { clanKey: 'dr1', clanLabel: 'DR1', ourTag: '#29292QPRC', isLdc: dr1IsLdc, cwl: dr1Cwl },
    { clanKey: 'dr2', clanLabel: 'DR2', ourTag: '#2RCGG9YR9', isLdc: dr2IsLdc, cwl: dr2Cwl },
  ]

  for (const { clanKey, clanLabel, ourTag, isLdc, cwl } of configs) {
    const war = wars[clanKey]
    if (!war || war.state !== 'warEnded') continue

    if (isLdc && cwl?.season) {
      const embed = buildResultatsLdc(normalizeWar(war, ourTag), clanLabel)
      await postResultats(client, await embed, `resultats_ldc_${clanLabel.toLowerCase()}_${cwl.season}`).catch(e =>
        console.error(`[Resultats] LDC ${clanLabel}:`, e)
      )
    } else if (war.endTime) {
      const embed = buildResultatsGdc(war, clanLabel)
      await postResultats(client, await embed, `resultats_gdc_${clanLabel.toLowerCase()}_${war.endTime}`).catch(e =>
        console.error(`[Resultats] GDC ${clanLabel}:`, e)
      )
    }
  }

  try {
    const raidData = await apiGet('/clan/raids')
    const latest   = raidData?.items?.[0] || null
    if (latest?.state === 'ended' && latest?.endTime) {
      const [r1, r2] = await Promise.all([
        apiGet('/clan/dr1/members').catch(() => null),
        apiGet('/clan/dr2/members').catch(() => null),
      ])
      const clanMembers = [...(r1?.items || []), ...(r2?.items || [])]
      const embed = await buildResultatsRaids(latest, clanMembers)
      await postResultats(client, embed, `resultats_raid_${latest.endTime}`).catch(e =>
        console.error('[Resultats] Raid:', e)
      )
    }
  } catch {}
}

module.exports = {
  buildResultatsGdc,
  buildResultatsLdc,
  buildResultatsRaids,
  buildResultatsJdc,
  postResultats,
  checkAndPostResultats,
}
