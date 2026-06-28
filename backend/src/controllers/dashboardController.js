import supabase from '../lib/supabase.js'
import { getCached } from '../services/cacheService.js'
import { getClanInfo, getCurrentWar, getClanRaidSeasons } from '../services/cocApiService.js'

const DR1 = process.env.COC_CLAN_TAG_DR1 || '#29292QPRC'
const DR2 = process.env.COC_CLAN_TAG_DR2 || '#2RCGG9YR9'

// ── Stats générales ───────────────────────────────────────────────────────────

export async function getStats(req, res) {
  try {
    const [
      dr1Info,
      dr2Info,
      warDr1,
      warDr2,
      raidDr1,
      linksCount,
      birthdaysToday,
      activePolls,
      routeState,
    ] = await Promise.allSettled([
      getCached(`clan:${DR1}`, () => getClanInfo(DR1)),
      getCached(`clan:${DR2}`, () => getClanInfo(DR2)),
      getCached(`war:${DR1}`, () => getCurrentWar(DR1)),
      getCached(`war:${DR2}`, () => getCurrentWar(DR2)),
      getCached(`raids:${DR1}`, () => getClanRaidSeasons(DR1)),
      supabase.from('discord_links').select('*', { count: 'exact', head: true }),
      _getBirthdaysToday(),
      _getActivePolls(),
      _getRouteNumber(),
    ])

    const stats = {
      dr1_members: dr1Info.status === 'fulfilled' ? dr1Info.value.members : null,
      dr2_members: dr2Info.status === 'fulfilled' ? dr2Info.value.members : null,
      linked_members: linksCount.status === 'fulfilled' ? linksCount.value.count : null,

      war_dr1_state: warDr1.status === 'fulfilled' ? warDr1.value.state : null,
      war_dr1_detail: _warDetail(warDr1),
      war_dr2_state: warDr2.status === 'fulfilled' ? warDr2.value.state : null,
      war_dr2_detail: _warDetail(warDr2),

      raid_state:
        raidDr1.status === 'fulfilled' && raidDr1.value.items?.[0]?.state
          ? raidDr1.value.items[0].state
          : null,

      birthdays_today: birthdaysToday.status === 'fulfilled' ? birthdaysToday.value : 0,
      active_polls: activePolls.status === 'fulfilled' ? activePolls.value : 0,
      route_number: routeState.status === 'fulfilled' ? routeState.value : null,
    }

    return res.json(stats)
  } catch (err) {
    console.error('getStats error:', err)
    return res.status(500).json({ error: 'Erreur lors du chargement des stats' })
  }
}

function _warDetail(settled) {
  if (settled.status !== 'fulfilled') return null
  const war = settled.value
  if (!war || war.state === 'notInWar') return null
  if (war.state === 'inWar') {
    return `${war.clan?.attacks ?? 0} / ${(war.teamSize ?? 0) * 2} attaques`
  }
  if (war.state === 'preparation') {
    const start = war.startTime
      ? new Date(war.startTime.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z'))
      : null
    if (start) {
      const diff = Math.round((start - Date.now()) / 3_600_000)
      return diff > 0 ? `Début dans ${diff}h` : 'Commence bientôt'
    }
  }
  return null
}

async function _getBirthdaysToday() {
  try {
    const today = new Date()
    const { count } = await supabase
      .from('birthdays')
      .select('*', { count: 'exact', head: true })
      .eq('birth_month', today.getMonth() + 1)
      .eq('birth_day', today.getDate())
    return count ?? 0
  } catch {
    return 0
  }
}

async function _getActivePolls() {
  try {
    const { count } = await supabase
      .from('polls')
      .select('*', { count: 'exact', head: true })
      .eq('ended', false)
    return count ?? 0
  } catch {
    return 0
  }
}

async function _getRouteNumber() {
  try {
    const { data } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'route_current_number')
      .single()
    return data?.value ? parseInt(data.value) : null
  } catch {
    return null
  }
}

// ── Config bot_config ─────────────────────────────────────────────────────────

export async function getConfig(req, res) {
  const { data, error } = await supabase.from('bot_config').select('key, value')
  if (error) return res.status(500).json({ error: error.message })

  const config = {}
  for (const row of data) config[row.key] = row.value
  return res.json(config)
}

export async function updateConfig(req, res) {
  const updates = req.body
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Body invalide' })
  }

  const entries = Object.entries(updates)
  if (entries.length === 0) return res.json({ ok: true })

  const rows = entries.map(([key, value]) => ({ key, value: String(value) }))
  const { error } = await supabase
    .from('bot_config')
    .upsert(rows, { onConflict: 'key' })

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true })
}

// ── Anniversaires ─────────────────────────────────────────────────────────────

export async function getBirthdays(req, res) {
  const { data, error } = await supabase
    .from('birthdays')
    .select('discord_id, discord_name, birth_day, birth_month, birth_year')
    .order('birth_month')
    .order('birth_day')

  if (error) {
    console.error('[Dashboard] getBirthdays error:', error.code, error.message, error.details)
    return res.status(500).json({ error: error.message })
  }
  return res.json(data)
}

export async function deleteBirthday(req, res) {
  const { discord_id } = req.params
  const { error } = await supabase
    .from('birthdays')
    .delete()
    .eq('discord_id', discord_id)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true })
}

// ── Sondages ──────────────────────────────────────────────────────────────────

export async function getPolls(req, res) {
  const { data, error } = await supabase
    .from('polls')
    .select('id, question, options, votes, ended, ends_at, created_at, creator_id')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Dashboard] getPolls error:', error.code, error.message, error.details)
    return res.status(500).json({ error: error.message })
  }
  return res.json(data)
}

export async function endPoll(req, res) {
  const { id } = req.params
  const { error } = await supabase
    .from('polls')
    .update({ ended: true })
    .eq('id', id)

  if (error) {
    console.error('[Dashboard] endPoll error:', error.code, error.message, error.details)
    return res.status(500).json({ error: error.message })
  }
  return res.json({ ok: true })
}

// ── Route de l'Infinie ────────────────────────────────────────────────────────

export async function getRoute(req, res) {
  const { data, error } = await supabase
    .from('bot_config')
    .select('key, value')
    .in('key', ['route_current_number', 'route_last_player', 'route_gift', 'route_gift_number'])

  if (error) return res.status(500).json({ error: error.message })

  const config = {}
  for (const row of data ?? []) config[row.key] = row.value
  return res.json(config)
}

export async function updateRoute(req, res) {
  const { action, gift_number, gift_desc } = req.body

  if (action === 'reset') {
    const rows = [
      { key: 'route_current_number', value: '0' },
      { key: 'route_last_player', value: '' },
    ]
    const { error } = await supabase.from('bot_config').upsert(rows, { onConflict: 'key' })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  if (gift_number !== undefined && gift_desc !== undefined) {
    const rows = [
      { key: 'route_gift_number', value: String(gift_number) },
      { key: 'route_gift', value: String(gift_desc) },
    ]
    const { error } = await supabase.from('bot_config').upsert(rows, { onConflict: 'key' })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  return res.status(400).json({ error: 'Action invalide' })
}
