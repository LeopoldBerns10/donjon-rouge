const supabase = require('../supabase.js')

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

module.exports = { recordJdcParticipation }
