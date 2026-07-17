const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')
const { apiGet } = require('../cocApi.js')

const EVENTS_CHANNEL_ID = '1441176254769401969'

let eventsMsgCache = null

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseWarTime(cocTimeStr) {
  if (!cocTimeStr) return null
  const s = cocTimeStr.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
  return new Date(s)
}

function formatFR(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(date) + ' UTC'
}

function timeUntil(now, target) {
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return '🔴 En cours !'
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'dans moins d\'1h'
  if (hours < 24) return `dans ${hours}h`
  const days = Math.floor(diff / 86400000)
  return `dans ${days} jour${days > 1 ? 's' : ''}`
}

// ─── Calcul des événements ────────────────────────────────────────────────────

// Weekend de Raid : vendredi 8h UTC → lundi 8h UTC
function nextRaidWeekend(now) {
  const day = now.getUTCDay()   // 0=dim, 1=lun, 5=ven, 6=sam
  const hours = now.getUTCHours()

  const inRaid = (day === 5 && hours >= 8) || day === 6 || day === 0 || (day === 1 && hours < 8)

  if (inRaid) {
    const daysToMon = day === 5 ? 3 : day === 6 ? 2 : day === 0 ? 1 : 0
    const end = new Date(now)
    end.setUTCDate(end.getUTCDate() + daysToMon)
    end.setUTCHours(8, 0, 0, 0)
    return { status: '🔴 En cours !', date: end, label: 'Fin le' }
  }

  const daysToFri = (5 - day + 7) % 7 || 7
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() + daysToFri)
  start.setUTCHours(8, 0, 0, 0)
  return { status: timeUntil(now, start), date: start, label: 'Début le' }
}

// Ligue de Clans : du 1er au 10 de chaque mois
function ligueDeClans(now) {
  const day = now.getUTCDate()
  const month = now.getUTCMonth()
  const year = now.getUTCFullYear()

  if (day >= 1 && day <= 10) {
    const end = new Date(Date.UTC(year, month, 10, 23, 59, 59))
    return { status: '🔴 En cours !', date: end, label: 'Fin le' }
  }

  const start = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0))
  return { status: timeUntil(now, start), date: start, label: 'Début le' }
}

// Réinitialisation Ligue : le 15 de chaque mois à 8h UTC
function reinitLigue(now) {
  const month = now.getUTCMonth()
  const year = now.getUTCFullYear()

  let target = new Date(Date.UTC(year, month, 15, 8, 0, 0))
  if (now.getTime() > target.getTime() + 3600000) {
    target = new Date(Date.UTC(year, month + 1, 15, 8, 0, 0))
  }

  const diff = target.getTime() - now.getTime()
  if (diff >= -3600000 && diff <= 3600000) {
    return { status: '🔴 En cours !', date: target, label: 'Le' }
  }

  return { status: timeUntil(now, target), date: target, label: 'Le' }
}

// Jeux de Clan : du 22 au 28 de chaque mois
function jeuxDeClan(now) {
  const day = now.getUTCDate()
  const month = now.getUTCMonth()
  const year = now.getUTCFullYear()

  if (day >= 22 && day <= 28) {
    const end = new Date(Date.UTC(year, month, 28, 23, 59, 59))
    return { status: '🔴 En cours !', date: end, label: 'Fin le' }
  }

  let m = month, y = year
  if (day > 28) {
    m++
    if (m > 11) { m = 0; y++ }
  }
  const start = new Date(Date.UTC(y, m, 22, 0, 0, 0))
  return { status: timeUntil(now, start), date: start, label: 'Début le' }
}

// ─── Statut GDC via API ───────────────────────────────────────────────────────

async function getWarStatus() {
  try {
    const [r1, r2] = await Promise.allSettled([
      apiGet('/clan/dr1/war'),
      apiGet('/clan/dr2/war'),
    ])
    const wars = [r1, r2]
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
      .filter(w => w.state === 'inWar' || w.state === 'preparation')

    if (!wars.length) return null
    return wars.find(w => w.state === 'inWar') ?? wars[0]
  } catch {
    return null
  }
}

// ─── Construction de l'embed ──────────────────────────────────────────────────

async function buildEventsEmbed() {
  const now = new Date()

  const raid  = nextRaidWeekend(now)
  const ldc   = ligueDeClans(now)
  const reinit = reinitLigue(now)
  const jeux  = jeuxDeClan(now)
  const war   = await getWarStatus()

  let gdcValue
  if (war) {
    if (war.state === 'inWar') {
      const end = parseWarTime(war.endTime)
      gdcValue = `🔴 En cours !${end ? `\nFin le : ${formatFR(end)}` : ''}`
    } else {
      const start = parseWarTime(war.startTime)
      gdcValue = `⏳ En préparation${start ? `\nDébut le : ${formatFR(start)}` : ''}`
    }
  } else {
    gdcValue = 'Aucune guerre en cours'
  }

  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('📅 Événements à venir — Donjon Rouge')
    .addFields(
      { name: '🔥 Weekend de Raid',        value: `${raid.status}\n${raid.label} : ${formatFR(raid.date)}`,    inline: false },
      { name: '🏆 Ligue de Clans',          value: `${ldc.status}\n${ldc.label} : ${formatFR(ldc.date)}`,      inline: false },
      { name: '🔄 Réinitialisation Ligue',  value: `${reinit.status}\n${reinit.label} : ${formatFR(reinit.date)}`, inline: false },
      { name: '🎮 Jeux de Clan',            value: `${jeux.status}\n${jeux.label} : ${formatFR(jeux.date)}`,   inline: false },
      { name: '⚔️ GDC',                    value: gdcValue, inline: false },
    )
    .setFooter({ text: 'Mis à jour' })
    .setTimestamp()
}

const makeRow = () => [
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('refresh_events').setLabel('🔄 Actualiser').setStyle(ButtonStyle.Secondary)
  ),
]

// ─── Gestion du message persistant ───────────────────────────────────────────

async function updateEventsMessage(client) {
  const channel = await client.channels.fetch(EVENTS_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const embed = await buildEventsEmbed()
  const components = makeRow()

  if (eventsMsgCache) {
    try {
      const msg = await channel.messages.fetch(eventsMsgCache)
      await msg.edit({ embeds: [embed], components })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        eventsMsgCache = null
        await supabase.from('bot_config').delete().eq('key', 'events_message_id')
      } else return null
    }
  }

  const { data } = await supabase
    .from('bot_config').select('value').eq('key', 'events_message_id').maybeSingle()

  if (data?.value) {
    try {
      const msg = await channel.messages.fetch(data.value)
      eventsMsgCache = msg.id
      await msg.edit({ embeds: [embed], components })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        await supabase.from('bot_config').delete().eq('key', 'events_message_id')
      } else return null
    }
  }

  const msg = await channel.send({ embeds: [embed], components })
  await supabase.from('bot_config').upsert({ key: 'events_message_id', value: msg.id, updated_at: new Date().toISOString() })
  eventsMsgCache = msg.id
  console.log(`[Events] Message créé : ${msg.id}`)
  return msg
}

async function resetEventsMessage() {
  eventsMsgCache = null
  await supabase.from('bot_config').delete().eq('key', 'events_message_id')
}

module.exports = { updateEventsMessage, resetEventsMessage, buildEventsEmbed, EVENTS_CHANNEL_ID }
