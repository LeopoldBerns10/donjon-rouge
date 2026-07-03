const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js')
const supabase = require('../supabase.js')
const { log } = require('./botLogger.js')

const GUILD_ID           = '610767309031866371'
const ANNOUNCE_CHANNEL_ID = '1441176254769401969'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getConfig(key) {
  const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

function fmtDate(date) {
  const d = new Date(date)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} à ${hh}:${mi} UTC`
}

function parseFrDate(str) {
  const m = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/)
  if (!m) return null
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]))
}

// ─── Discord API ──────────────────────────────────────────────────────────────

async function createDiscordEvent(client, { title, description, startTime, endTime }) {
  const guild = await client.guilds.fetch(GUILD_ID)
  const event = await guild.scheduledEvents.create({
    name: title,
    description,
    scheduledStartTime: startTime,
    scheduledEndTime: endTime,
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
    entityType: GuildScheduledEventEntityType.External,
    entityMetadata: { location: 'Clash of Clans' },
  })
  return event.id
}

async function deleteDiscordEvent(client, eventId) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID)
    const event = await guild.scheduledEvents.fetch(eventId).catch(() => null)
    if (event) await event.delete()
  } catch {}
}

async function discordEventExists(client, eventId) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID)
    const event = await guild.scheduledEvents.fetch(eventId).catch(() => null)
    return !!event
  } catch {
    return false
  }
}

// ─── Raid Capital ─────────────────────────────────────────────────────────────

function getNextRaidFriday() {
  const now = new Date()
  const day = now.getUTCDay()
  let daysToFriday = (5 - day + 7) % 7
  if (daysToFriday === 0 && now.getUTCHours() >= 9) daysToFriday = 7
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysToFriday,
    9, 0, 0, 0
  ))
}

async function ensureRaidEvent(client) {
  const raidStart = getNextRaidFriday()
  const raidEnd   = new Date(raidStart.getTime() + 3 * 24 * 3600 * 1000) // +3 jours = lundi 9h

  const { data: existing } = await supabase
    .from('discord_events')
    .select('id, discord_event_id')
    .eq('type', 'raid')
    .eq('start_time', raidStart.toISOString())
    .maybeSingle()

  if (!existing) {
    const title       = '💎 Raid Capital — Donjon Rouge'
    const description = 'Le Raid Capital commence ! Participez pour contribuer au clan et gagner des ressources Capital.'
    const eventId     = await createDiscordEvent(client, { title, description, startTime: raidStart, endTime: raidEnd })
    await supabase.from('discord_events').insert({
      discord_event_id: eventId,
      type: 'raid',
      title,
      description,
      start_time: raidStart.toISOString(),
      end_time:   raidEnd.toISOString(),
    })
    console.log(`[Events] Raid créé — ${raidStart.toISOString()}`)
    log(client, 'EVENT', `Raid Capital créé — ${raidStart.toISOString()}`).catch(() => {})
    return
  }

  if (existing.discord_event_id && !await discordEventExists(client, existing.discord_event_id)) {
    const title       = '💎 Raid Capital — Donjon Rouge'
    const description = 'Le Raid Capital commence ! Participez pour contribuer au clan et gagner des ressources Capital.'
    const eventId     = await createDiscordEvent(client, { title, description, startTime: raidStart, endTime: raidEnd })
    await supabase.from('discord_events')
      .update({ discord_event_id: eventId })
      .eq('id', existing.id)
    console.log(`[Events] Raid recréé (supprimé manuellement) — ${raidStart.toISOString()}`)
    log(client, 'EVENT', `Raid Capital recréé — ${raidStart.toISOString()}`).catch(() => {})
  }
}

// ─── Jeux de Clan ─────────────────────────────────────────────────────────────

async function ensureJdcEvent(client) {
  const jdcActive = await getConfig('jdc_active')
  if (jdcActive !== 'true') return

  const jdcStartStr = await getConfig('jdc_start')
  const jdcEndStr   = await getConfig('jdc_end')
  if (!jdcStartStr || !jdcEndStr) return

  const jdcStart = new Date(jdcStartStr)
  const jdcEnd   = new Date(jdcEndStr)

  if (jdcEnd < new Date()) return

  const { data: existing } = await supabase
    .from('discord_events')
    .select('id, discord_event_id')
    .eq('type', 'jdc')
    .eq('start_time', jdcStart.toISOString())
    .maybeSingle()

  if (!existing) {
    const title       = '🎮 Jeux de Clan — Donjon Rouge'
    const description = 'Les Jeux de Clan sont lancés ! Objectif minimum : 5 000 pts pour les membres DR.'
    const eventId     = await createDiscordEvent(client, { title, description, startTime: jdcStart, endTime: jdcEnd })
    await supabase.from('discord_events').insert({
      discord_event_id: eventId,
      type: 'jdc',
      title,
      description,
      start_time: jdcStart.toISOString(),
      end_time:   jdcEnd.toISOString(),
    })
    console.log(`[Events] JDC créé — ${jdcStart.toISOString()}`)
    log(client, 'EVENT', `Jeux de Clan créé — ${jdcStart.toISOString()}`).catch(() => {})
    return
  }

  if (existing.discord_event_id && !await discordEventExists(client, existing.discord_event_id)) {
    const title       = '🎮 Jeux de Clan — Donjon Rouge'
    const description = 'Les Jeux de Clan sont lancés ! Objectif minimum : 5 000 pts pour les membres DR.'
    const eventId     = await createDiscordEvent(client, { title, description, startTime: jdcStart, endTime: jdcEnd })
    await supabase.from('discord_events')
      .update({ discord_event_id: eventId })
      .eq('id', existing.id)
    console.log(`[Events] JDC recréé (supprimé manuellement) — ${jdcStart.toISOString()}`)
    log(client, 'EVENT', `Jeux de Clan recréé — ${jdcStart.toISOString()}`).catch(() => {})
  }
}

// ─── Annonces 1 jour avant ────────────────────────────────────────────────────

async function checkEventAnnouncements(client) {
  const now          = new Date()
  const in24h        = new Date(now.getTime() + 24 * 3600 * 1000)

  const { data: events } = await supabase
    .from('discord_events')
    .select('id, title, description, start_time, end_time')
    .eq('announced', false)
    .gt('end_time', now.toISOString())

  if (!events?.length) return

  const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null)
  if (!channel) return

  for (const event of events) {
    const startTime = new Date(event.start_time)
    if (startTime > in24h) continue

    const message = [
      `📅 **${event.title}**`,
      `L'événement commence demain !`,
      `🕐 Début : ${fmtDate(event.start_time)}`,
      `🕑 Fin : ${fmtDate(event.end_time)}`,
      event.description,
    ].join('\n')

    await channel.send(message)
    await supabase.from('discord_events').update({ announced: true }).eq('id', event.id)
    console.log(`[Events] Annonce envoyée — ${event.title}`)
  }
}

// ─── Blog Supercell — scraping événements mensuels ───────────────────────────

const BLOG_BASE    = 'https://supercell.com'
const BLOG_LISTING = 'https://supercell.com/en/games/clashofclans/blog/'

const MONTHS_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g,   '&')
    .replace(/&lt;/g,    '<')
    .replace(/&gt;/g,    '>')
    .replace(/&quot;/g,  '"')
    .replace(/&#39;/g,   "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g,  ' ')
}

function extractText(html) {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ')
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.text()
}

function findArticleUrl(html, monthLower, year) {
  // Pattern 1 : href contenant le slug "june-2026" ou "june_2026"
  for (const sep of ['-', '_']) {
    const re = new RegExp(`href="([^"]*${monthLower}${sep}${year}[^"]*)"`, 'i')
    const m  = html.match(re)
    if (m) return m[1]
  }
  // Pattern 2 : href avec l'année puis le mois (ex : "2026-06")
  const re2 = new RegExp(`href="([^"]*blog[^"]*${year}[^"]*${monthLower}[^"]*)"`, 'i')
  const m2  = html.match(re2)
  if (m2) return m2[1]

  // Pattern 3 : chercher dans __NEXT_DATA__ (Next.js SSR)
  const ndMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (ndMatch) {
    try {
      const nd  = JSON.parse(ndMatch[1])
      const raw = JSON.stringify(nd)
      const re3 = new RegExp(`"(\/en\/games\/clashofclans\/blog\/[^"]*${monthLower}[^"]*${year}[^"]*)"`, 'i')
      const m3  = raw.match(re3)
      if (m3) return m3[1]
    } catch {}
  }

  return null
}

function parseEventsFromText(text, year) {
  const results = []
  // Accepte tirets simples, en-dash (–), em-dash (—), tiret HTML encodé
  const re = new RegExp(
    `\\b(${MONTHS_EN.join('|')})\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\s*[:\\s]\\s*([^.\\n\\r<]{4,80})`,
    'gi'
  )
  let m
  while ((m = re.exec(text)) !== null) {
    const [, evMonth, startDay, endDay, rawTitle] = m
    const monthIdx = MONTHS_EN.findIndex(n => n.toLowerCase() === evMonth.toLowerCase())
    if (monthIdx === -1) continue

    const title = rawTitle.trim().replace(/\s+/g, ' ').replace(/[*_[\]]/g, '')
    if (title.length < 4) continue

    // Heure par défaut : début à 8h UTC, fin à 8h UTC du lendemain du dernier jour
    const startTime = new Date(Date.UTC(year, monthIdx, parseInt(startDay, 10),     8, 0, 0))
    const endTime   = new Date(Date.UTC(year, monthIdx, parseInt(endDay,   10) + 1, 8, 0, 0))

    results.push({ title, startTime, endTime })
  }
  return results
}

async function fetchSupercellEvents(client) {
  const now   = new Date()
  const yyyy  = now.getUTCFullYear()
  const mm    = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd    = String(now.getUTCDate()).padStart(2, '0')
  const today = `${yyyy}-${mm}-${dd}`

  // Anti-doublon : une seule exécution par jour
  const sentKey = `supercell_events_fetched_${today}`
  const { data: already } = await supabase.from('bot_config').select('value').eq('key', sentKey).maybeSingle()
  if (already) return

  const monthName  = MONTHS_EN[now.getUTCMonth()]
  const monthLower = monthName.toLowerCase()
  console.log(`[Events/Supercell] Recherche article ${monthName} ${yyyy}...`)

  // Étape 1 : listing du blog
  let listHtml
  try {
    listHtml = await fetchHtml(BLOG_LISTING)
  } catch (e) {
    console.error('[Events/Supercell] Impossible de charger le blog listing:', e.message)
    return
  }

  // Étape 2 : trouver l'URL de l'article du mois
  let articlePath = findArticleUrl(listHtml, monthLower, yyyy)
  if (!articlePath) {
    console.log(`[Events/Supercell] Aucun article trouvé pour ${monthName} ${yyyy}`)
    await supabase.from('bot_config').upsert({ key: sentKey, value: 'not_found', updated_at: now.toISOString() })
    return
  }
  const articleUrl = articlePath.startsWith('http') ? articlePath : BLOG_BASE + articlePath
  console.log(`[Events/Supercell] Article trouvé : ${articleUrl}`)

  // Étape 3 : charger l'article
  let articleHtml
  try {
    articleHtml = await fetchHtml(articleUrl)
  } catch (e) {
    console.error('[Events/Supercell] Impossible de charger l\'article:', e.message)
    return
  }

  // Étape 4 : extraire le texte et parser les événements
  const text   = extractText(articleHtml)
  const events = parseEventsFromText(text, yyyy)
  console.log(`[Events/Supercell] ${events.length} événement(s) parsé(s)`)

  // Étape 5 : créer les événements Discord
  let created = 0
  for (const { title, startTime, endTime } of events) {
    // Ignorer les événements dont le début est déjà passé
    if (startTime <= now) {
      console.log(`[Events/Supercell] Ignoré (passé) : ${title}`)
      continue
    }

    // Anti-doublon en DB : même type + même start_time + même titre
    const { data: existing } = await supabase
      .from('discord_events')
      .select('id')
      .eq('type', 'supercell')
      .eq('start_time', startTime.toISOString())
      .eq('title', title)
      .maybeSingle()
    if (existing) continue

    try {
      const description = `Événement Clash of Clans — ${title}`
      const eventId = await createDiscordEvent(client, { title, description, startTime, endTime })
      await supabase.from('discord_events').insert({
        discord_event_id: eventId,
        type:        'supercell',
        title,
        description,
        start_time:  startTime.toISOString(),
        end_time:    endTime.toISOString(),
      })
      console.log(`[Events/Supercell] Créé : "${title}" (${startTime.toISOString()})`)
      created++
    } catch (e) {
      console.error(`[Events/Supercell] Erreur création "${title}" :`, e.message)
    }
  }

  console.log(`[Events/Supercell] Terminé — ${created} créé(s) sur ${events.length} parsé(s)`)
  if (created > 0) {
    log(client, 'EVENT', `Événements Supercell — ${created} créé(s) sur ${events.length} parsé(s)`).catch(() => {})
  }
  await supabase.from('bot_config').upsert({ key: sentKey, value: new Date().toISOString(), updated_at: new Date().toISOString() })
}

// ─── Événements du mois suivant (le 28 de chaque mois) ───────────────────────

async function ensureNextMonthEvents(client) {
  const now = new Date()

  const nextDate  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const nextYear  = nextDate.getUTCFullYear()
  const nextMonth = nextDate.getUTCMonth() // 0-indexed
  const nextKey   = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`

  const sentKey = `next_month_events_${nextKey}`
  const { data: already } = await supabase.from('bot_config').select('value').eq('key', sentKey).maybeSingle()
  if (already) return

  console.log(`[Events/NextMonth] Création des événements pour ${nextKey}...`)
  let created = 0

  async function createIfMissing({ type, title, description, startTime, endTime }) {
    const { data: existing } = await supabase
      .from('discord_events')
      .select('id')
      .eq('title', title)
      .eq('start_time', startTime.toISOString())
      .maybeSingle()
    if (existing) {
      console.log(`[Events/NextMonth] ⏭  Ignoré (déjà présent) : "${title}" (${startTime.toISOString()})`)
      return
    }
    try {
      const eventId = await createDiscordEvent(client, { title, description, startTime, endTime })
      await supabase.from('discord_events').insert({
        discord_event_id: eventId,
        type,
        title,
        description,
        start_time:  startTime.toISOString(),
        end_time:    endTime.toISOString(),
        announced:   false,
      })
      console.log(`[Events/NextMonth] ✅ Créé : "${title}" (${startTime.toISOString()})`)
      created++
    } catch (e) {
      console.error(`[Events/NextMonth] ❌ Erreur "${title}" :`, e.message)
    }
  }

  // Raids — chaque vendredi du mois suivant, 9h UTC → lundi 9h UTC
  const daysInMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate()
  for (let day = 1; day <= daysInMonth; day++) {
    if (new Date(Date.UTC(nextYear, nextMonth, day)).getUTCDay() !== 5) continue
    await createIfMissing({
      type:        'raid',
      title:       '💎 Raid Capital — Donjon Rouge',
      description: 'Le Raid Capital commence ! Participez pour contribuer au clan et gagner des ressources Capital.',
      startTime:   new Date(Date.UTC(nextYear, nextMonth, day,     9, 0, 0)),
      endTime:     new Date(Date.UTC(nextYear, nextMonth, day + 3, 9, 0, 0)),
    })
  }

  // JDC — du 22 au 28
  await createIfMissing({
    type:        'jdc',
    title:       '🎮 Jeux de Clan — Donjon Rouge',
    description: 'Les Jeux de Clan sont lancés ! Objectif minimum : 5 000 pts pour les membres DR.',
    startTime:   new Date(Date.UTC(nextYear, nextMonth, 22, 8, 0, 0)),
    endTime:     new Date(Date.UTC(nextYear, nextMonth, 29, 8, 0, 0)),
  })

  // LDC — du 1 au 11
  await createIfMissing({
    type:        'ldc',
    title:       '⚔️ Ligue de Guerre — Donjon Rouge',
    description: 'La Ligue de Guerre de Clans commence ! Donnez le meilleur pour monter dans les ligues.',
    startTime:   new Date(Date.UTC(nextYear, nextMonth,  1, 8, 0, 0)),
    endTime:     new Date(Date.UTC(nextYear, nextMonth, 12, 8, 0, 0)),
  })

  console.log(`[Events/NextMonth] Terminé — ${created} créé(s) pour ${nextKey}`)
  if (created > 0) {
    log(client, 'EVENT', `Événements mois suivant (${nextKey}) — ${created} créé(s)`).catch(() => {})
  }
  await supabase.from('bot_config').upsert({ key: sentKey, value: new Date().toISOString(), updated_at: new Date().toISOString() })
}

// ─── Handler modal /createevent ───────────────────────────────────────────────

async function handleModalCreateEvent(interaction) {
  await interaction.deferReply({ ephemeral: true })

  const title       = interaction.fields.getTextInputValue('event_title')
  const description = interaction.fields.getTextInputValue('event_description')
  const startRaw    = interaction.fields.getTextInputValue('event_start')
  const endRaw      = interaction.fields.getTextInputValue('event_end')

  const startTime = parseFrDate(startRaw)
  const endTime   = parseFrDate(endRaw)

  if (!startTime || isNaN(startTime) || !endTime || isNaN(endTime)) {
    return interaction.editReply('❌ Format de date invalide. Utilisez JJ/MM/YYYY HH:MM')
  }
  if (endTime <= startTime) {
    return interaction.editReply('❌ La date de fin doit être après la date de début.')
  }
  if (startTime < new Date()) {
    return interaction.editReply('❌ La date de début doit être dans le futur.')
  }

  const eventId = await createDiscordEvent(interaction.client, { title, description, startTime, endTime })
  await supabase.from('discord_events').insert({
    discord_event_id: eventId,
    type: 'manual',
    title,
    description,
    start_time: startTime.toISOString(),
    end_time:   endTime.toISOString(),
  })

  log(interaction.client, 'EVENT', `Événement créé par ${interaction.user.username} : "${title}" (${startRaw} → ${endRaw})`).catch(() => {})
  await interaction.editReply('✅ Événement créé !')
}

module.exports = {
  createDiscordEvent,
  deleteDiscordEvent,
  ensureRaidEvent,
  ensureJdcEvent,
  ensureNextMonthEvents,
  checkEventAnnouncements,
  fetchSupercellEvents,
  handleModalCreateEvent,
}
