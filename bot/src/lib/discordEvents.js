const { GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } = require('discord.js')
const supabase = require('../supabase.js')

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

  await interaction.editReply('✅ Événement créé !')
}

module.exports = {
  createDiscordEvent,
  deleteDiscordEvent,
  ensureRaidEvent,
  ensureJdcEvent,
  checkEventAnnouncements,
  handleModalCreateEvent,
}
