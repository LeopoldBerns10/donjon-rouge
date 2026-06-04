const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('./supabase.js')
const { REMINDER_CHANNEL_ID, CLANS } = require('./config/reminders.js')
const { updateEventsMessage } = require('./setup/sendEventsPanel.js')

const BASE = process.env.BACKEND_URL
const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function normalizeWar(war, ourTag) {
  if (!war) return war
  if (war.clan?.tag === ourTag) return war
  if (war.opponent?.tag === ourTag) {
    return { ...war, clan: war.opponent, opponent: war.clan }
  }
  return war
}

// ─── Récupération des données ─────────────────────────────────────────────────

async function fetchWarData() {
  const wars = {}
  for (const clanKey of CLANS) {
    try { wars[clanKey] = await apiGet(`/clan/${clanKey}/war`) }
    catch { wars[clanKey] = null }
  }

  let dr1IsLdc = false
  const dr1Inactive = !wars.dr1 || wars.dr1.state === 'notInWar' || wars.dr1.state === 'warEnded'
  if (dr1Inactive) {
    try {
      const ldc = await apiGet('/ldc/current')
      if (ldc?.rounds) {
        const activeRound = ldc.rounds.find(r => r.war != null)
        if (activeRound?.war) { wars.dr1 = normalizeWar(activeRound.war, DR1_TAG); dr1IsLdc = true }
      }
    } catch {}
  }

  let dr2IsLdc = false
  const dr2Inactive = !wars.dr2 || wars.dr2.state === 'notInWar' || wars.dr2.state === 'warEnded'
  if (dr2Inactive) {
    try {
      const ldc2 = await apiGet('/ldc/dr2/current')
      if (ldc2?.rounds) {
        const activeRound2 = ldc2.rounds.find(r => r.war != null)
        if (activeRound2?.war) { wars.dr2 = normalizeWar(activeRound2.war, DR2_TAG); dr2IsLdc = true }
      }
    } catch {}
  }

  let currentRaid = null
  try {
    const raidData = await apiGet('/clan/raids')
    const latest = raidData?.items?.[0] || null
    if (latest?.startTime) {
      const start = parseWarTime(latest.startTime) || new Date(latest.startTime)
      const end = latest.endTime ? (parseWarTime(latest.endTime) || new Date(latest.endTime)) : null
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600000
      if (!isNaN(start) && start.getTime() > sevenDaysAgo && (!end || end.getTime() > Date.now())) {
        currentRaid = latest
      }
    }
  } catch {}

  return { wars, dr1IsLdc, dr2IsLdc, currentRaid }
}

// ─── Embeds des messages persistants ─────────────────────────────────────────

async function buildReminderDR(war, clanLabel, isLdc) {
  const maxAttaques = isLdc ? 1 : 2

  if (!war || war.state === 'notInWar' || war.state === 'warEnded') {
    return new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle(`😴 ${clanLabel} — Au repos`)
      .setDescription('😴 Aucune guerre en cours')
      .setFooter({ text: 'Donjon Rouge • Rappel de guerre' })
      .setTimestamp()
  }

  if (war.state === 'preparation') {
    const startTime = parseWarTime(war.startTime)
    const hoursLeft = startTime ? Math.max(0, Math.ceil((startTime.getTime() - Date.now()) / 3600000)) : '?'
    const opponentName = war.opponent?.name || 'Adversaire'
    const warType = isLdc ? 'LDC' : 'GDC'

    const embed = new EmbedBuilder()
      .setColor(0xFF6600)
      .setTitle(`⚔️ ${clanLabel} — ${warType} vs ${opponentName}`)
      .setDescription(`🛡️ Guerre en préparation — début dans ${hoursLeft}h`)
      .setFooter({ text: 'Donjon Rouge • Rappel de guerre' })
      .setTimestamp()

    const thumb = war.opponent?.badgeUrls?.medium || war.clan?.badgeUrls?.medium
    if (thumb) embed.setThumbnail(thumb)
    return embed
  }

  if (war.state === 'inWar') {
    const members = war.clan?.members || []
    const clanStars = war.clan?.stars ?? 0
    const opponentStars = war.opponent?.stars ?? 0
    const attacksUsed = members.reduce((acc, m) => acc + (m.attacks?.length ?? 0), 0)
    const totalAttacks = members.length * maxAttaques
    const late = members.filter(m => (m.attacks?.length ?? 0) === 0)
    const opponentName = war.opponent?.name || 'Adversaire'
    const warType = isLdc ? 'LDC' : 'GDC'

    const sorted = [...members].sort((a, b) => {
      const aA = a.attacks?.length ?? 0
      const bA = b.attacks?.length ?? 0
      if (aA === 0 && bA !== 0) return -1
      if (aA !== 0 && bA === 0) return 1
      if (aA < maxAttaques && bA === maxAttaques) return -1
      if (aA === maxAttaques && bA < maxAttaques) return 1
      return b.townhallLevel - a.townhallLevel
    })

    const discordMap = await getDiscordIds(sorted.map(m => m.tag))

    const lines = sorted.map(m => {
      const atks = m.attacks?.length ?? 0
      const icon = atks === 0 ? '❌' : atks < maxAttaques ? '⚡' : '✅'
      const ids = discordMap[m.tag] || []
      const mentionPart = ids.length > 0 ? `<@${ids[0]}>` : m.name
      return `${icon} ${mentionPart} — ${m.name} ${m.tag} — ${atks}/${maxAttaques} att.`
    })

    const embed = new EmbedBuilder()
      .setColor(late.length === 0 ? 0x2E7D32 : 0xFF6600)
      .setTitle(`⚔️ ${clanLabel} — ${warType} vs ${opponentName}`)
      .addFields(
        { name: '📊 Score', value: `⭐ ${clanStars} vs ⭐ ${opponentStars} | ⚔️ ${attacksUsed}/${totalAttacks} attaques`, inline: false },
        { name: '🏹 Guerriers', value: lines.join('\n').slice(0, 1024) || '—', inline: false },
      )
      .setFooter({ text: 'Donjon Rouge • Rappel de guerre' })
      .setTimestamp()

    const thumb = war.clan?.badgeUrls?.medium
    if (thumb) embed.setThumbnail(thumb)
    return embed
  }

  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`❓ ${clanLabel} — État inconnu`)
    .setDescription(`État : ${war.state}`)
    .setFooter({ text: 'Donjon Rouge • Rappel de guerre' })
    .setTimestamp()
}

async function buildReminderRaid(raid) {
  if (!raid) {
    return new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('😴 Raid Capital — Inactif')
      .setDescription('😴 Prochain raid vendredi — DR1 uniquement')
      .setFooter({ text: 'Donjon Rouge • Raid Capital' })
      .setTimestamp()
  }

  const members = raid.members || []
  const noAttack = members.filter(m => (m.attacks ?? 0) === 0)
  const attacksUsed = members.reduce((acc, m) => acc + (m.attacks ?? 0), 0)

  const discordMap = noAttack.length > 0 ? await getDiscordIds(noAttack.map(m => m.tag)) : {}

  const lines = noAttack.map(m => {
    const ids = discordMap[m.tag] || []
    const mention = ids.length > 0 ? `<@${ids[0]}>` : m.name
    return `❌ ${mention} — ${m.name} — 0 att.`
  })

  const description = lines.length === 0
    ? `✅ Tous les membres ont attaqué !\n⚔️ ${attacksUsed} attaques au total`
    : `⚔️ ${attacksUsed} attaques utilisées\n\n${lines.join('\n')}`

  return new EmbedBuilder()
    .setColor(lines.length === 0 ? 0x2E7D32 : 0xFF6600)
    .setTitle('💎 Raid Capital — Actif')
    .setDescription(description.slice(0, 4096))
    .setFooter({ text: 'Donjon Rouge • Raid Capital' })
    .setTimestamp()
}

// ─── Gestion des 3 messages persistants ──────────────────────────────────────

const reminderMsgCache = {}

async function ensureReminderMessage(channel, key, embed, components) {
  const cachedId = reminderMsgCache[key]

  if (cachedId) {
    try {
      const msg = await channel.messages.fetch(cachedId)
      await msg.edit({ embeds: [embed], components })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        reminderMsgCache[key] = null
        await supabase.from('bot_config').delete().eq('key', key)
      } else {
        return null
      }
    }
  }

  const { data } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (data?.value) {
    try {
      const msg = await channel.messages.fetch(data.value)
      reminderMsgCache[key] = msg.id
      await msg.edit({ embeds: [embed], components })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        await supabase.from('bot_config').delete().eq('key', key)
      } else {
        return null
      }
    }
  }

  const msg = await channel.send({ embeds: [embed], components })
  await supabase.from('bot_config').upsert({ key, value: msg.id, updated_at: new Date().toISOString() })
  reminderMsgCache[key] = msg.id
  console.log(`[Scheduler] Message ${key} créé : ${msg.id}`)
  return msg
}

async function _doUpdateReminderMessages(channel, warData) {
  const { wars, dr1IsLdc, dr2IsLdc, currentRaid } = warData

  const [embedDR1, embedDR2, embedRaid] = await Promise.all([
    buildReminderDR(wars.dr1, '🏰 DR1', dr1IsLdc),
    buildReminderDR(wars.dr2, '🏰 DR2', dr2IsLdc),
    buildReminderRaid(currentRaid),
  ])

  const makeRow = (customId) => [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(customId).setLabel('🔄 Actualiser').setStyle(ButtonStyle.Secondary)
    ),
  ]

  await Promise.allSettled([
    ensureReminderMessage(channel, 'reminder_dr1_msg',  embedDR1,  makeRow('refresh_reminder_dr1')),
    ensureReminderMessage(channel, 'reminder_dr2_msg',  embedDR2,  makeRow('refresh_reminder_dr2')),
    ensureReminderMessage(channel, 'reminder_raid_msg', embedRaid, makeRow('refresh_reminder_raid')),
  ])
}

async function updateReminderMessages(client) {
  const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
  if (!channel) return
  const warData = await fetchWarData()
  await _doUpdateReminderMessages(channel, warData)
}

// ─── Rappels automatiques (messages @mention auto-supprimés) ──────────────────

const sentWarReminders = new Set()
const sentRaidReminders = new Set()

function buildReminderText(members, discordMap, label) {
  const lines = members.map(m => {
    const ids = discordMap[m.tag] || []
    const mention = ids.length > 0 ? `<@${ids[0]}>` : m.name
    return `${mention} — ${m.name} ${m.tag} n'a pas attaqué !`
  })
  return `${label}\n${lines.join('\n')}`
}

async function sendReminder(channel, members, discordMap, label) {
  const msg = await channel.send(buildReminderText(members, discordMap, label))
  setTimeout(() => msg.delete().catch(() => {}), 2 * 60 * 60 * 1000)
}

async function checkWarReminders(channel, { wars, dr1IsLdc, dr2IsLdc, currentRaid }) {
  for (const clanKey of CLANS) {
    const war = wars[clanKey]
    if (!war || war.state !== 'inWar') continue

    const startTime = parseWarTime(war.startTime)
    if (!startTime) continue
    const hoursElapsed = (Date.now() - startTime.getTime()) / 3600000
    const warId = war.preparationStartTime || startTime.toISOString()
    const isLdc = clanKey === 'dr1' ? dr1IsLdc : dr2IsLdc

    if (hoursElapsed >= 10 && hoursElapsed < 11) {
      const key = `${warId}_10h_${clanKey}`
      if (!sentWarReminders.has(key)) {
        const noAttack = (war.clan?.members || []).filter(m => (m.attacks?.length ?? 0) === 0)
        if (noAttack.length > 0) {
          const discordMap = await getDiscordIds(noAttack.map(m => m.tag))
          const type = isLdc ? 'LDC' : 'GDC'
          await sendReminder(channel, noAttack, discordMap, `⚔️ [${clanKey.toUpperCase()}] Rappel 10h ${type}`)
          sentWarReminders.add(key)
        }
      }
    }

    if (hoursElapsed >= 20 && hoursElapsed < 21) {
      const key = `${warId}_20h_${clanKey}`
      if (!sentWarReminders.has(key)) {
        const laggards = isLdc
          ? (war.clan?.members || []).filter(m => (m.attacks?.length ?? 0) === 0)
          : (war.clan?.members || []).filter(m => (m.attacks?.length ?? 0) < 2)
        if (laggards.length > 0) {
          const discordMap = await getDiscordIds(laggards.map(m => m.tag))
          const type = isLdc ? 'LDC' : 'GDC'
          await sendReminder(channel, laggards, discordMap, `⚔️ [${clanKey.toUpperCase()}] Rappel 20h ${type}`)
          sentWarReminders.add(key)
        }
      }
    }
  }

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

// ─── Boucle principale ────────────────────────────────────────────────────────

async function checkAndUpdate(client) {
  const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const warData = await fetchWarData()
  await _doUpdateReminderMessages(channel, warData)
  await checkWarReminders(channel, warData)
  await updateEventsMessage(client).catch(e => console.error('[Scheduler] Events:', e))
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
  await updateReminderMessages(client)
}

async function resetStatus() {
  for (const key of ['reminder_dr1_msg', 'reminder_dr2_msg', 'reminder_raid_msg']) {
    reminderMsgCache[key] = null
    await supabase.from('bot_config').delete().eq('key', key)
  }
}

module.exports = { startScheduler, forceRefresh, resetStatus, updateReminderMessages }
