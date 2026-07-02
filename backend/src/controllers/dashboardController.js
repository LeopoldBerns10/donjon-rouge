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
      .from('route_infinie')
      .select('current_number')
      .eq('active', true)
      .maybeSingle()
    return data?.current_number ?? null
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
  console.log('[Dashboard] getRoute — requête Supabase route_infinie...')

  const { data, error, status, statusText } = await supabase
    .from('route_infinie')
    .select('current_number, last_discord_id, gift_number, gift_desc')
    .eq('active', true)
    .maybeSingle()

  console.log('[Dashboard] getRoute — status:', status, statusText)
  console.log('[Dashboard] getRoute — error:', JSON.stringify(error))
  console.log('[Dashboard] getRoute — data:', JSON.stringify(data))

  if (error) {
    return res.status(500).json({ error: error.message, code: error.code, details: error.details })
  }
  return res.json(data ?? {})
}

export async function getRouteLastPlayer(req, res) {
  try {
    const { data: route } = await supabase
      .from('route_infinie')
      .select('last_discord_id')
      .eq('active', true)
      .maybeSingle()

    if (!route?.last_discord_id) {
      return res.json({ discord_id: null, name: null })
    }

    const { data: link } = await supabase
      .from('discord_links')
      .select('coc_name')
      .eq('discord_id', route.last_discord_id)
      .eq('is_primary', true)
      .maybeSingle()

    return res.json({
      discord_id: route.last_discord_id,
      name: link?.coc_name ?? null,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── Événements Discord ────────────────────────────────────────────────────────

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '610767309031866371'
const DISCORD_API      = 'https://discord.com/api/v10'

function discordHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function discordCreateEvent({ title, description, start_time, end_time }) {
  const token = process.env.DISCORD_TOKEN ?? ''
  const url   = `${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/scheduled-events`
  console.log('[Discord] token (10 premiers chars):', token.slice(0, 10) || '(vide)')
  console.log('[Discord] URL:', url)
  const res = await fetch(url, {
    method: 'POST',
    headers: discordHeaders(),
    body: JSON.stringify({
      name:                  title,
      description,
      scheduled_start_time:  start_time,
      scheduled_end_time:    end_time,
      privacy_level:         2,
      entity_type:           3,
      entity_metadata:       { location: 'Clash of Clans' },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord API ${res.status}: ${text}`)
  }
  return res.json()
}

async function discordDeleteEvent(eventId) {
  const res = await fetch(`${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/scheduled-events/${eventId}`, {
    method: 'DELETE',
    headers: discordHeaders(),
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text()
    throw new Error(`Discord API ${res.status}: ${text}`)
  }
}

async function discordUpdateEvent(eventId, { title, description, start_time, end_time }) {
  const res = await fetch(`${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/scheduled-events/${eventId}`, {
    method: 'PATCH',
    headers: discordHeaders(),
    body: JSON.stringify({
      name:                 title,
      description,
      scheduled_start_time: start_time,
      scheduled_end_time:   end_time,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Discord API ${res.status}: ${text}`)
  }
  return res.json()
}

export async function getEvents(req, res) {
  const { data, error } = await supabase
    .from('discord_events')
    .select('id, discord_event_id, type, title, description, start_time, end_time, announced, created_at')
    .order('start_time', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
}

export async function createEvent(req, res) {
  const { title, description, start_time, end_time } = req.body
  if (!title || !description || !start_time || !end_time) {
    return res.status(400).json({ error: 'Champs manquants : title, description, start_time, end_time' })
  }

  const startDate = new Date(start_time)
  const endDate   = new Date(end_time)
  if (isNaN(startDate) || isNaN(endDate)) return res.status(400).json({ error: 'Dates invalides' })
  if (endDate <= startDate) return res.status(400).json({ error: 'end_time doit être après start_time' })

  let discordEventId = null
  try {
    const ev = await discordCreateEvent({ title, description, start_time, end_time })
    discordEventId = ev.id
  } catch (err) {
    console.error('[Dashboard] createEvent Discord error:', err.message)
    return res.status(502).json({ error: `Erreur Discord : ${err.message}` })
  }

  const { data, error } = await supabase
    .from('discord_events')
    .insert({ discord_event_id: discordEventId, type: 'manual', title, description, start_time, end_time })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
}

export async function updateEvent(req, res) {
  const { id } = req.params
  const { title, description, start_time, end_time } = req.body
  if (!title || !description || !start_time || !end_time) {
    return res.status(400).json({ error: 'Champs manquants : title, description, start_time, end_time' })
  }

  const startDate = new Date(start_time)
  const endDate   = new Date(end_time)
  if (isNaN(startDate) || isNaN(endDate)) return res.status(400).json({ error: 'Dates invalides' })
  if (endDate <= startDate) return res.status(400).json({ error: 'end_time doit être après start_time' })

  const { data: ev, error: fetchError } = await supabase
    .from('discord_events')
    .select('discord_event_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!ev) return res.status(404).json({ error: 'Événement introuvable' })

  if (ev.discord_event_id) {
    try {
      await discordUpdateEvent(ev.discord_event_id, { title, description, start_time, end_time })
    } catch (err) {
      console.error('[Dashboard] updateEvent Discord error:', err.message)
      return res.status(502).json({ error: `Erreur Discord : ${err.message}` })
    }
  }

  const { data, error } = await supabase
    .from('discord_events')
    .update({ title, description, start_time, end_time })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
}

export async function deleteEvent(req, res) {
  const { id } = req.params

  const { data: ev, error: fetchError } = await supabase
    .from('discord_events')
    .select('discord_event_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return res.status(500).json({ error: fetchError.message })
  if (!ev) return res.status(404).json({ error: 'Événement introuvable' })

  if (ev.discord_event_id) {
    try { await discordDeleteEvent(ev.discord_event_id) }
    catch (err) { console.error('[Dashboard] deleteEvent Discord error:', err.message) }
  }

  const { error } = await supabase.from('discord_events').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true })
}

export async function updateRoute(req, res) {
  const { action, gift_number, gift_desc } = req.body
  const now = new Date().toISOString()

  if (action === 'reset') {
    const { error } = await supabase
      .from('route_infinie')
      .update({ current_number: 0, last_discord_id: null, last_time: null, updated_at: now })
      .eq('active', true)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  if (gift_number !== undefined && gift_desc !== undefined) {
    const { error } = await supabase
      .from('route_infinie')
      .update({ gift_number: parseInt(gift_number), gift_desc: String(gift_desc), updated_at: now })
      .eq('active', true)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  return res.status(400).json({ error: 'Action invalide' })
}
