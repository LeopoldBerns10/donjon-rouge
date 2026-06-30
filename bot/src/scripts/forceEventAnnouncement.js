require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const supabase = require('../supabase.js')

const ANNOUNCE_CHANNEL_ID = '1441176254769401969'

function fmtDate(date) {
  const d = new Date(date)
  const dd   = String(d.getUTCDate()).padStart(2, '0')
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh   = String(d.getUTCHours()).padStart(2, '0')
  const mi   = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} à ${hh}:${mi} UTC`
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
})

client.once('ready', async () => {
  console.log(`[forceEventAnnouncement] Connecté en tant que ${client.user.tag}`)

  const now = new Date()

  const { data: event, error } = await supabase
    .from('discord_events')
    .select('id, title, description, start_time, end_time')
    .gt('end_time', now.toISOString())
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[forceEventAnnouncement] Erreur Supabase :', error.message)
    await client.destroy()
    process.exit(1)
  }

  if (!event) {
    console.log('[forceEventAnnouncement] Aucun événement à venir trouvé.')
    await client.destroy()
    process.exit(0)
  }

  console.log(`[forceEventAnnouncement] Événement ciblé : "${event.title}" (${event.start_time})`)

  const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null)
  if (!channel) {
    console.error('[forceEventAnnouncement] Salon introuvable :', ANNOUNCE_CHANNEL_ID)
    await client.destroy()
    process.exit(1)
  }

  const message = [
    `📅 **${event.title}**`,
    `L'événement commence le ${fmtDate(event.start_time)} !`,
    `🕐 Début : ${fmtDate(event.start_time)}`,
    `🕑 Fin : ${fmtDate(event.end_time)}`,
    event.description,
  ].join('\n')

  await channel.send(message)
  console.log('[forceEventAnnouncement] Message envoyé.')

  await supabase.from('discord_events').update({ announced: true }).eq('id', event.id)
  console.log('[forceEventAnnouncement] announced = true enregistré.')

  await client.destroy()
  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
