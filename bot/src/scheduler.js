const { EmbedBuilder } = require('discord.js')
const supabase = require('./supabase.js')
const { REMINDER_CHANNEL_ID, CLANS } = require('./config/reminders.js')

const BASE = process.env.BACKEND_URL
let statusMessageId = null

async function apiGet(path) {
  const res = await fetch(`${BASE}/api/coc${path}`)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
}

function parseWarTime(cocTimeStr) {
  if (!cocTimeStr) return null
  const s = cocTimeStr.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  )
  return new Date(s)
}

async function getDiscordIds(cocTags) {
  if (!cocTags.length) return {}
  const { data } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag')
    .in('coc_tag', cocTags)
  const map = {}
  for (const row of data || []) {
    if (!map[row.coc_tag]) map[row.coc_tag] = []
    map[row.coc_tag].push(row.discord_id)
  }
  return map
}

// ─── Embed de statut ──────────────────────────────────────────────────────────

function getWarFieldValue(war) {
  if (!war || war.state === 'notInWar' || war.state === 'warEnded') {
    return '😴 Aucune guerre active'
  }
  if (war.state === 'preparation') return '🛡️ Phase de préparation'
  if (war.state === 'inWar') {
    const count = (war.clan?.members || []).filter(m => (m.attacks?.length ?? 0) === 0).length
    return `⚔️ En cours — ${count} guerrier${count !== 1 ? 's' : ''} n'ont pas attaqué`
  }
  return `❓ ${war.state}`
}

function getRaidFieldValue(raid) {
  if (!raid) return '😴 Aucun raid en cours'
  const count = (raid.members || []).filter(m => (m.attacks ?? 0) === 0).length
  return `💎 Raid en cours — ${count} membre${count !== 1 ? 's' : ''} n'ont pas attaqué`
}

function buildStatusEmbed(warDR1, warDR2, raid) {
  const anyActive =
    (warDR1?.state === 'inWar' || warDR1?.state === 'preparation') ||
    (warDR2?.state === 'inWar' || warDR2?.state === 'preparation') ||
    !!raid

  return new EmbedBuilder()
    .setColor(anyActive ? 0xFF6600 : 0x8B0000)
    .setTitle('⚔️ État des combats — Donjon Rouge')
    .addFields(
      { name: '🏰 DR1 — Guerre', value: getWarFieldValue(warDR1),  inline: false },
      { name: '🏰 DR2 — Guerre', value: getWarFieldValue(warDR2),  inline: false },
      { name: '💎 Raid Capital',  value: getRaidFieldValue(raid),   inline: false },
    )
    .setFooter({ text: 'Dernière mise à jour :' })
    .setTimestamp()
}

// ─── Message épinglé (stocké dans bot_config) ─────────────────────────────────

async function getOrCreateStatusMessage(channel) {
  // Utilise l'ID en mémoire si déjà chargé
  if (statusMessageId) {
    try {
      return await channel.messages.fetch(statusMessageId)
    } catch {
      statusMessageId = null
    }
  }

  // Cherche dans Supabase
  const { data } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', 'status_message_id')
    .maybeSingle()

  if (data?.value) {
    try {
      const msg = await channel.messages.fetch(data.value)
      statusMessageId = msg.id
      return msg
    } catch {
      // Message supprimé, on en crée un nouveau
    }
  }

  // Création du nouveau message
  const msg = await channel.send({ embeds: [buildStatusEmbed(null, null, null)] })
  await supabase
    .from('bot_config')
    .upsert({ key: 'status_message_id', value: msg.id, updated_at: new Date().toISOString() })
  statusMessageId = msg.id
  console.log(`[Scheduler] Nouveau message de statut créé : ${msg.id}`)
  return msg
}

// ─── Rappels individuels ──────────────────────────────────────────────────────

const sentWarReminders = new Set()
const sentRaidReminders = new Set()

function buildReminderText(members, discordMap, label) {
  const allMentioned = members.every(m => (discordMap[m.tag] || []).length > 0)
  if (members.length <= 2 && allMentioned) {
    const mentions = members.flatMap(m => (discordMap[m.tag] || []).map(id => `<@${id}>`))
    return `${label} : ${mentions.join(' ')} vous n'avez pas encore attaqué !`
  }
  const list = members.map(m => {
    const ids = discordMap[m.tag] || []
    return ids.length > 0 ? `<@${ids[0]}> (${m.name})` : m.name
  }).join(', ')
  return `${label} — membres sans attaque : ${list}`
}

async function sendReminder(channel, members, discordMap, label) {
  const msg = await channel.send(buildReminderText(members, discordMap, label))
  setTimeout(() => msg.delete().catch(() => {}), 2 * 60 * 60 * 1000)
}

// ─── Boucle principale ────────────────────────────────────────────────────────

async function checkAndUpdate(client) {
  const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
  if (!channel) return

  // Récupère les données
  const wars = {}
  for (const clanKey of CLANS) {
    try { wars[clanKey] = await apiGet(`/clan/${clanKey}/war`) }
    catch { wars[clanKey] = null }
  }

  let currentRaid = null
  try {
    const raidData = await apiGet('/clan/raids')
    currentRaid = raidData?.items?.[0] || null
  } catch {}

  // Met à jour l'embed de statut
  const statusMsg = await getOrCreateStatusMessage(channel)
  await statusMsg.edit({ embeds: [buildStatusEmbed(wars.dr1, wars.dr2, currentRaid)] })

  // Rappels individuels — guerres
  for (const clanKey of CLANS) {
    const war = wars[clanKey]
    if (!war || war.state !== 'inWar') continue

    const startTime = parseWarTime(war.startTime)
    if (!startTime) continue
    const hoursElapsed = (Date.now() - startTime.getTime()) / 3600000
    const warId = war.preparationStartTime || startTime.toISOString()
    const isLdc = war.teamSize <= 15

    if (hoursElapsed >= 10 && hoursElapsed < 11) {
      const key = `${warId}_10h_${clanKey}`
      if (!sentWarReminders.has(key)) {
        const noAttack = (war.clan?.members || []).filter(m => (m.attacks?.length ?? 0) === 0)
        if (noAttack.length > 0) {
          const discordMap = await getDiscordIds(noAttack.map(m => m.tag))
          await sendReminder(channel, noAttack, discordMap, `⚔️ [${clanKey.toUpperCase()}] Rappel 10h GDC`)
          sentWarReminders.add(key)
        }
      }
    }

    if (!isLdc && hoursElapsed >= 22 && hoursElapsed < 23) {
      const key = `${warId}_22h_${clanKey}`
      if (!sentWarReminders.has(key)) {
        const noSecond = (war.clan?.members || []).filter(m => (m.attacks?.length ?? 0) < 2)
        if (noSecond.length > 0) {
          const discordMap = await getDiscordIds(noSecond.map(m => m.tag))
          await sendReminder(channel, noSecond, discordMap, `⚔️ [${clanKey.toUpperCase()}] Rappel 22h GDC`)
          sentWarReminders.add(key)
        }
      }
    }
  }

  // Rappels individuels — raid (dimanche 12h-13h UTC+2)
  if (currentRaid) {
    const utcPlus2 = new Date(Date.now() + 2 * 3600000)
    if (utcPlus2.getUTCDay() === 0 && utcPlus2.getUTCHours() >= 12 && utcPlus2.getUTCHours() < 13) {
      const key = `raid_${currentRaid.startTime || 'current'}`
      if (!sentRaidReminders.has(key)) {
        const noAttack = (currentRaid.members || []).filter(m => (m.attacks ?? 0) === 0)
        if (noAttack.length > 0) {
          const discordMap = await getDiscordIds(noAttack.map(m => m.tag))
          await sendReminder(channel, noAttack, discordMap, '🏰 Rappel Raid du Capital')
          sentRaidReminders.add(key)
        }
      }
    }
  }
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

function startScheduler(client) {
  const run = async () => {
    try { await checkAndUpdate(client) }
    catch (e) { console.error('[Scheduler] Erreur:', e) }
  }
  run()
  setInterval(run, 60 * 60 * 1000)
  console.log('[Scheduler] Démarré — vérification toutes les heures')
}

async function forceRefresh(client) {
  await checkAndUpdate(client)
}

module.exports = { startScheduler, forceRefresh }
