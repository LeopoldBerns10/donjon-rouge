const { EmbedBuilder } = require('discord.js')
const supabase = require('../supabase.js')
const { getRaidSeasons } = require('../cocApi.js')

const ANNONCES_CHANNEL_ID = '1441176254769401969'

async function sendWeeklyStats(client) {
  const parisNow = new Date(Date.now() + 2 * 3600000)
  if (parisNow.getUTCDay() !== 1) return // 0=dim, 1=lundi, …

  const yyyy = parisNow.getUTCFullYear()
  const mm   = String(parisNow.getUTCMonth() + 1).padStart(2, '0')
  const dd   = String(parisNow.getUTCDate()).padStart(2, '0')
  const dedupKey = `weekly_stats_${yyyy}-${mm}-${dd}`

  const { data: already } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', dedupKey)
    .maybeSingle()
  if (already) return

  const since7d    = new Date(Date.now() - 7 * 24 * 3600000).toISOString().split('T')[0]
  const sinceMonth = `${yyyy}-${mm}-01`

  // ── GDC (7 derniers jours) ───────────────────────────────────────────────────
  const { data: gdcRows = [] } = await supabase
    .from('member_participation')
    .select('discord_id, coc_name, participated, event_date')
    .eq('event_type', 'gdc')
    .gte('event_date', since7d)

  const guerresJouees = new Set(gdcRows.map(r => r.event_date)).size
  const gdcTauxMoyen  = gdcRows.length > 0
    ? Math.round((gdcRows.filter(r => r.participated).length / gdcRows.length) * 100)
    : 0

  const gdcByUser = {}
  for (const r of gdcRows) {
    if (!r.discord_id) continue
    if (!gdcByUser[r.discord_id]) gdcByUser[r.discord_id] = { name: r.coc_name, total: 0, participated: 0 }
    gdcByUser[r.discord_id].total++
    if (r.participated) gdcByUser[r.discord_id].participated++
  }
  let bestGdc = null
  for (const [id, s] of Object.entries(gdcByUser)) {
    const rate = s.total > 0 ? Math.round((s.participated / s.total) * 100) : 0
    if (!bestGdc || rate > bestGdc.rate) bestGdc = { id, rate }
  }
  const bestGdcLine = bestGdc ? `<@${bestGdc.id}> (${bestGdc.rate}% moy.)` : '—'

  // ── JDC (mois en cours) ──────────────────────────────────────────────────────
  const { data: jdcCfg } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', 'jdc_active')
    .maybeSingle()
  const jdcActif = jdcCfg?.value === 'true'

  const { data: jdcRows = [] } = await supabase
    .from('member_participation')
    .select('participated')
    .eq('event_type', 'jdc')
    .gte('event_date', sinceMonth)

  const jdcTotal        = jdcRows.length
  const jdcParticipated = jdcRows.filter(r => r.participated).length
  const jdcTaux         = jdcTotal > 0 ? Math.round((jdcParticipated / jdcTotal) * 100) : 0

  // ── Raid Capital ─────────────────────────────────────────────────────────────
  let raidAttacks = 0, raidLimit = 0, raidActifs = 0
  try {
    const raidData = await getRaidSeasons()
    const latest   = raidData?.items?.[0] || null
    if (latest?.members) {
      for (const m of latest.members) {
        raidAttacks += m.attacks ?? 0
        raidLimit   += m.attackLimit ?? 5
        if ((m.attacks ?? 0) > 0) raidActifs++
      }
    }
  } catch {}

  // ── Top 3 actifs (7 jours, toutes catégories) ──────────────────────────────
  const { data: activeRows = [] } = await supabase
    .from('member_participation')
    .select('discord_id, coc_name')
    .gte('event_date', since7d)
    .eq('participated', true)

  const actifMap = {}
  for (const r of activeRows) {
    const k = r.discord_id || r.coc_name
    if (!actifMap[k]) actifMap[k] = { discordId: r.discord_id, name: r.coc_name, count: 0 }
    actifMap[k].count++
  }
  const top3      = Object.values(actifMap).sort((a, b) => b.count - a.count).slice(0, 3)
  const top3Lines = top3.length > 0
    ? top3.map((u, i) => {
        const display = u.discordId ? `<@${u.discordId}>` : u.name
        return `${i + 1}. ${display} — ${u.count} participation${u.count > 1 ? 's' : ''}`
      }).join('\n')
    : '—'

  // ── Embed ────────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('📊 STATS DE LA SEMAINE — Donjon Rouge')
    .addFields(
      {
        name: '⚔️ Guerres (GDC)',
        value: [
          `• Guerres jouées : **${guerresJouees}**`,
          `• Taux de participation moyen : **${gdcTauxMoyen}%**`,
          `• Meilleur performeur : ${bestGdcLine}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🎮 Jeux de Clan',
        value: [
          `• JDC actif ce mois : **${jdcActif ? 'oui' : 'non'}**`,
          `• Membres ayant participé : **${jdcParticipated}/${jdcTotal}**`,
          `• Taux de participation : **${jdcTaux}%**`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '💎 Raid Capital',
        value: [
          `• Attaques utilisées : **${raidAttacks}/${raidLimit}**`,
          `• Membres actifs : **${raidActifs}**`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '🏆 Top 3 membres les plus actifs cette semaine',
        value: top3Lines,
        inline: false,
      },
    )
    .setFooter({ text: 'Donjon Rouge • Stats automatiques' })
    .setTimestamp()

  const channel = await client.channels.fetch(ANNONCES_CHANNEL_ID).catch(() => null)
  if (!channel) return

  await channel.send({ embeds: [embed] })
  await supabase.from('bot_config').upsert({
    key: dedupKey,
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  console.log(`[WeeklyStats] Stats hebdo postées — ${yyyy}-${mm}-${dd}`)
}

module.exports = { sendWeeklyStats }
