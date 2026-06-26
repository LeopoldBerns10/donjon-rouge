const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('./supabase.js')
const { REMINDER_CHANNEL_ID, CLANS } = require('./config/reminders.js')
const { updateEventsMessage } = require('./setup/sendEventsPanel.js')
const { buildLdcRecapMessage, buildGdcRecapMessage, buildRaidRecapMessage, postExploit } = require('./lib/exploits.js')
const { isJdcActive, updateJdcEmbeds, checkJdcEnd, autoDetectJdc } = require('./lib/jdcTracker.js')
const { updateRappelEmbeds, sendRappelPings } = require('./lib/rappelManager.js')

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
  console.log('[fetchWarData] DR1 war.state:', wars.dr1?.state)
  console.log('[fetchWarData] DR2 war.state:', wars.dr2?.state)

  let dr1IsLdc = false
  let dr1LdcBetweenRounds = false
  let dr1Cwl = null
  const dr1Inactive = !wars.dr1 || wars.dr1.state === 'notInWar' || wars.dr1.state === 'warEnded'
  if (dr1Inactive) {
    try {
      const ldc = await apiGet('/ldc/current')
      if (ldc?.rounds) {
        const activeRound =
          ldc.rounds.find(r => r.war?.state === 'inWar') ||
          ldc.rounds.find(r => r.war?.state === 'preparation') ||
          ldc.rounds.find(r => r.war?.state === 'warEnded')
        console.log('[fetchWarData] LDC DR1 round trouvé:', activeRound?.war?.state)
        if (activeRound?.war) {
          wars.dr1 = normalizeWar(activeRound.war, DR1_TAG)
          dr1IsLdc = true
          dr1Cwl = ldc
          if (activeRound.war.state === 'warEnded') dr1LdcBetweenRounds = true
        }
      }
    } catch {}
  }

  let dr2IsLdc = false
  let dr2LdcBetweenRounds = false
  let dr2Cwl = null
  const dr2Inactive = !wars.dr2 || wars.dr2.state === 'notInWar' || wars.dr2.state === 'warEnded'
  if (dr2Inactive) {
    try {
      const ldc2 = await apiGet('/ldc/dr2/current')
      if (ldc2?.rounds) {
        const activeRound2 =
          ldc2.rounds.find(r => r.war?.state === 'inWar') ||
          ldc2.rounds.find(r => r.war?.state === 'preparation') ||
          ldc2.rounds.find(r => r.war?.state === 'warEnded')
        console.log('[fetchWarData] LDC DR2 round trouvé:', activeRound2?.war?.state)
        if (activeRound2?.war) {
          wars.dr2 = normalizeWar(activeRound2.war, DR2_TAG)
          dr2IsLdc = true
          dr2Cwl = ldc2
          if (activeRound2.war.state === 'warEnded') dr2LdcBetweenRounds = true
        }
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

  return { wars, dr1IsLdc, dr2IsLdc, dr1LdcBetweenRounds, dr2LdcBetweenRounds, dr1Cwl, dr2Cwl, currentRaid }
}

// ─── Embeds des messages persistants ─────────────────────────────────────────

async function buildReminderDR(war, clanLabel, isLdc, isBetweenRounds = false) {
  const maxAttaques = isLdc ? 1 : 2

  if (!war || war.state === 'notInWar') {
    return new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle(`😴 ${clanLabel} — Au repos`)
      .setDescription('😴 Aucune guerre en cours')
      .setFooter({ text: 'Donjon Rouge • Rappel de guerre' })
      .setTimestamp()
  }

  if (war.state === 'warEnded') {
    const title = isBetweenRounds ? `😴 ${clanLabel} — Entre deux rounds` : `😴 ${clanLabel} — Au repos`
    const description = isBetweenRounds ? '😴 Entre deux rounds — prochain combat bientôt' : '😴 Aucune guerre en cours'
    return new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle(title)
      .setDescription(description)
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

    const warStartTime = parseWarTime(war.startTime)
    const hoursElapsed = warStartTime ? (Date.now() - warStartTime.getTime()) / 3600000 : null
    let countdownText
    if (hoursElapsed === null) {
      countdownText = '—'
    } else if (hoursElapsed < 10) {
      const rem = 10 - hoursElapsed
      countdownText = `⏰ Rappel automatique dans ${Math.floor(rem)}h ${Math.round((rem % 1) * 60)}min`
    } else if (hoursElapsed < 20) {
      const rem = 20 - hoursElapsed
      countdownText = `⚠️ Rappel envoyé à 10h — prochain dans ${Math.floor(rem)}h ${Math.round((rem % 1) * 60)}min (20h)`
    } else {
      countdownText = '🚨 Rappels terminés — guerre bientôt finie'
    }

    const discordMap = late.length > 0 ? await getDiscordIds(late.map(m => m.tag)) : {}
    const lateLines = late.map(m => {
      const ids = discordMap[m.tag] || []
      const mention = ids.length > 0 ? `<@${ids[0]}>` : m.name
      return `❌ ${mention} — ${m.name} ${m.tag}`
    })

    const warriorsValue = late.length === 0
      ? '✅ Tous les guerriers ont attaqué !'
      : lateLines.join('\n').slice(0, 1024)

    const embed = new EmbedBuilder()
      .setColor(late.length === 0 ? 0x2E7D32 : 0xFF6600)
      .setTitle(`⚔️ ${clanLabel} — ${warType} vs ${opponentName}`)
      .addFields(
        { name: '📊 Score', value: `⭐ ${clanStars} vs ⭐ ${opponentStars} | ⚔️ ${attacksUsed}/${totalAttacks} attaques`, inline: false },
        { name: '❌ Retardataires', value: warriorsValue, inline: false },
        { name: '⏱️ Rappels', value: countdownText, inline: false },
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

  const raidMap     = new Map((raid.members || []).map(m => [m.tag, m]))
  const attacksUsed = (raid.members || []).reduce((acc, m) => acc + (m.attacks ?? 0), 0)

  let allMembers = []
  try {
    const [membersDR1, membersDR2] = await Promise.all([
      apiGet('/clan/dr1/members'),
      apiGet('/clan/dr2/members'),
    ])
    allMembers = [...(membersDR1?.items || []), ...(membersDR2?.items || [])]
    console.log('[Raid] Membres DR1:', (membersDR1?.items || []).map(m => m.tag))
    console.log('[Raid] Membres DR2:', (membersDR2?.items || []).map(m => m.tag))
  } catch {}

  console.log('[Raid] Membres raid:', (raid.members || []).map(m => m.tag))
  console.log('[Raid] Tag ORYX recherché: #2CP089GL0')

  const noAttack = allMembers.filter(m => !raidMap.has(m.tag))
  const partial  = allMembers.filter(m => {
    const rm = raidMap.get(m.tag)
    return rm && (rm.attacks ?? 0) > 0 && (rm.attacks ?? 0) < (rm.attackLimit ?? 5)
  })

  const allTags = [...noAttack, ...partial].map(m => m.tag)
  const discordMap = allTags.length > 0 ? await getDiscordIds(allTags) : {}

  const fmt = (m, icon, suffix) => {
    const ids = discordMap[m.tag] || []
    return ids.length > 0
      ? `${icon} <@${ids[0]}> — ${m.name} — ${suffix}`
      : `${icon} ${m.name} — ${suffix}`
  }

  const lines = [
    ...noAttack.map(m => fmt(m, '❌', '0/5 att.')),
    ...partial.map(m => {
      const rm = raidMap.get(m.tag)
      return fmt(m, '⚡', `${rm.attacks}/${rm.attackLimit ?? 5} att.`)
    }),
  ]

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
  const { wars, dr1IsLdc, dr2IsLdc, dr1LdcBetweenRounds, dr2LdcBetweenRounds, currentRaid } = warData

  const [embedDR1, embedDR2, embedRaid] = await Promise.all([
    buildReminderDR(wars.dr1, '🏰 DR1', dr1IsLdc, dr1LdcBetweenRounds),
    buildReminderDR(wars.dr2, '🏰 DR2', dr2IsLdc, dr2LdcBetweenRounds),
    buildReminderRaid(currentRaid),
  ])

  const makeRow = (customId) => [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(customId).setLabel('🔄 Actualiser').setStyle(ButtonStyle.Secondary)
    ),
  ]

  await ensureReminderMessage(channel, 'reminder_dr1_msg', embedDR1, makeRow('refresh_reminder_dr1'))
  await ensureReminderMessage(channel, 'reminder_dr2_msg', embedDR2, makeRow('refresh_reminder_dr2'))
  await ensureReminderMessage(channel, 'reminder_raid_msg', embedRaid, makeRow('refresh_reminder_raid'))
}

async function updateReminderMessages(client) {
  const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
  if (!channel) return
  const warData = await fetchWarData()
  await _doUpdateReminderMessages(channel, warData)
}

// ─── Exploits (récaps de fins de guerre/raid) ─────────────────────────────────

async function checkExploits(client, warData) {
  const { wars, dr1IsLdc, dr2IsLdc, dr1Cwl, dr2Cwl } = warData

  const configs = [
    { clanKey: 'dr1', clanLabel: '🏰 DR1', ourTag: DR1_TAG, isLdc: dr1IsLdc, cwl: dr1Cwl },
    { clanKey: 'dr2', clanLabel: '🏰 DR2', ourTag: DR2_TAG, isLdc: dr2IsLdc, cwl: dr2Cwl },
  ]

  for (const { clanKey, clanLabel, ourTag, isLdc, cwl } of configs) {
    const war = wars[clanKey]
    if (!war || war.state !== 'warEnded') continue

    if (isLdc && cwl?.season) {
      await postExploit(client, buildLdcRecapMessage(cwl, ourTag), `exploit_ldc_${cwl.season}`)
    } else if (war.endTime) {
      await postExploit(client, buildGdcRecapMessage(war, clanLabel), `exploit_war_${war.endTime}`)
    }
  }

  try {
    const raidData = await apiGet('/clan/raids')
    const latest = raidData?.items?.[0] || null
    if (latest?.state === 'ended' && latest?.endTime) {
      const [membersDR1, membersDR2] = await Promise.all([
        apiGet('/clan/dr1/members').catch(() => null),
        apiGet('/clan/dr2/members').catch(() => null),
      ])
      const clanMembers = [...(membersDR1?.items || []), ...(membersDR2?.items || [])]
      await postExploit(client, buildRaidRecapMessage(latest, clanMembers), `exploit_raid_${latest.endTime}`)
    }
  } catch {}
}

// ─── Boucle principale ────────────────────────────────────────────────────────

async function checkAndUpdate(client) {
  const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const warData = await fetchWarData()
  await _doUpdateReminderMessages(channel, warData)
  await checkExploits(client, warData).catch(e => console.error('[Scheduler] Exploits:', e))
  await updateEventsMessage(client).catch(e => console.error('[Scheduler] Events:', e))

  // Rappels v2 — embeds liste mis à jour à chaque tick
  await updateRappelEmbeds(client).catch(e => console.error('[Scheduler] RappelEmbeds:', e))

  // Rappels v2 — pings à 10h et 20h (heure Paris = UTC+2)
  const parisHour = new Date(Date.now() + 2 * 3600000).getUTCHours()
  console.log('[Scheduler] Heure Paris:', parisHour)
  if (parisHour === 10 || parisHour === 20) {
    await sendRappelPings(client).catch(e => console.error('[Scheduler] RappelPings:', e))
  }

  // JDC — toutes les 30 min
  const jdcActive = await isJdcActive().catch(() => false)
  if (jdcActive) {
    await updateJdcEmbeds(client).catch(e => console.error('[Scheduler] JDC embeds:', e))
    await checkJdcEnd(client).catch(e => console.error('[Scheduler] JDC end:', e))
  } else {
    await autoDetectJdc(client).catch(e => console.error('[Scheduler] JDC detect:', e))
  }
}

// ─── Nettoyage des messages orphelins au démarrage ────────────────────────────

async function cleanupReminderChannel(client) {
  const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const keys = ['reminder_dr1_msg', 'reminder_dr2_msg', 'reminder_raid_msg']
  const validIds = new Set()

  for (const key of keys) {
    const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
    if (!data?.value) continue

    try {
      const msg = await channel.messages.fetch(data.value)
      validIds.add(msg.id)
      reminderMsgCache[key] = msg.id
    } catch {
      reminderMsgCache[key] = null
      await supabase.from('bot_config').delete().eq('key', key)
    }
  }

  try {
    const messages = await channel.messages.fetch({ limit: 100 })
    const orphans = messages.filter(m => !validIds.has(m.id))
    if (orphans.size > 0) {
      await channel.bulkDelete(orphans, true).catch(async () => {
        for (const msg of orphans.values()) {
          await msg.delete().catch(() => {})
        }
      })
      console.log(`[Scheduler] Nettoyage : ${orphans.size} message(s) orphelin(s) supprimé(s)`)
    }
  } catch (e) {
    console.error('[Scheduler] cleanupReminderChannel:', e)
  }
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

function startScheduler(client) {
  const run = async () => {
    try { await checkAndUpdate(client) }
    catch (e) { console.error('[Scheduler] Erreur:', e) }
  }
  cleanupReminderChannel(client)
    .catch(e => console.error('[Scheduler] cleanupReminderChannel:', e))
    .finally(run)
  setInterval(run, 30 * 60 * 1000)
  console.log('[Scheduler] Démarré — vérification toutes les 30 minutes')
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
