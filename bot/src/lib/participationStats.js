const supabase = require('../supabase.js')

// Format CoC 20260701T120000.000Z → Date
function parseWarTime(cocTimeStr) {
  if (!cocTimeStr) return null
  const s = cocTimeStr.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  )
  return new Date(s)
}

// ── Alimentation ──────────────────────────────────────────────────────────────

async function recordGdcParticipation(war) {
  const members = war.clan?.members || []
  if (!members.length) return

  const endDate   = parseWarTime(war.endTime)
  const eventDate = endDate && !isNaN(endDate)
    ? endDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const tags = members.map(m => m.tag)
  const { data: links } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag')
    .in('coc_tag', tags)
  const discordMap = Object.fromEntries((links || []).map(r => [r.coc_tag, r.discord_id]))

  const rows = members.map(m => {
    const attacks      = m.attacks || []
    const participated = attacks.length > 0
    const attackPct    = participated
      ? Math.max(...attacks.map(a => a.destructionPercentage ?? 0))
      : null
    const doublePerf   = attacks.length >= 2 && attacks.every(a => (a.stars ?? 0) >= 3)

    return {
      discord_id:        discordMap[m.tag] ?? null,
      coc_name:          m.name,
      coc_tag:           m.tag,
      event_type:        'gdc',
      event_date:        eventDate,
      participated,
      attack_percentage: participated ? attackPct : null,
      double_perf:       doublePerf,
    }
  })

  if (!rows.length) return
  await supabase
    .from('member_participation')
    .upsert(rows, { onConflict: 'coc_tag,event_type,event_date', ignoreDuplicates: true })
}

async function recordJdcParticipation(members, endStr) {
  if (!members.length) return

  const eventDate = endStr
    ? endStr.split('T')[0]
    : new Date().toISOString().split('T')[0]

  const tags = members.map(m => m.tag)
  const { data: links } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag')
    .in('coc_tag', tags)
  const discordMap = Object.fromEntries((links || []).map(r => [r.coc_tag, r.discord_id]))

  const rows = members.map(m => ({
    discord_id:        discordMap[m.tag] ?? null,
    coc_name:          m.name,
    coc_tag:           m.tag,
    event_type:        'jdc',
    event_date:        eventDate,
    participated:      m.points > 0,
    attack_percentage: null,
    double_perf:       false,
  }))

  await supabase
    .from('member_participation')
    .upsert(rows, { onConflict: 'coc_tag,event_type,event_date', ignoreDuplicates: true })
}

// ── Lecture ───────────────────────────────────────────────────────────────────

async function getParticipationRate(discordId, options = {}) {
  const { eventType = 'all', windowSize = null } = options

  let query = supabase
    .from('member_participation')
    .select('participated, attack_percentage, event_type, event_date')
    .eq('discord_id', discordId)
    .order('event_date', { ascending: false })

  if (eventType !== 'all') query = query.eq('event_type', eventType)
  if (windowSize)          query = query.limit(windowSize)

  const { data, error } = await query
  if (error) throw error

  const events            = data || []
  const totalEvents       = events.length
  const participatedCount = events.filter(e => e.participated).length
  const rate              = totalEvents > 0 ? Math.round((participatedCount / totalEvents) * 100) : 0
  const withPct           = events.filter(e => e.attack_percentage != null)
  const avgAttackPercentage = withPct.length > 0
    ? Math.round(withPct.reduce((sum, e) => sum + e.attack_percentage, 0) / withPct.length)
    : null

  return { totalEvents, participated: participatedCount, rate, avgAttackPercentage }
}

module.exports = { recordGdcParticipation, recordJdcParticipation, getParticipationRate }
