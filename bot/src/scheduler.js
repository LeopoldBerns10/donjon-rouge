const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('./supabase.js')
const { REMINDER_CHANNEL_ID, CLANS } = require('./config/reminders.js')
const { log } = require('./lib/botLogger.js')
const { updateEventsMessage } = require('./setup/sendEventsPanel.js')
const { buildLdcRecapMessage, buildGdcRecapMessage, buildRaidRecapMessage, postExploit } = require('./lib/exploits.js')
const { recordGdcParticipation } = require('./lib/participationStats.js')
const { sendWeeklyStats } = require('./lib/weeklyStats.js')

const DONJON_ROUGE_ROLE_ID = '611125112519000064'
const LIE_ROLE_ID          = '1511096527664320655'

// ─── Snapshot mensuel ─────────────────────────────────────────────────────────

async function takeMonthlySnapshot() {
  const parisNow = new Date(Date.now() + 2 * 3600000)
  if (parisNow.getUTCDate() !== 1) return

  const yyyy         = parisNow.getUTCFullYear()
  const mm           = String(parisNow.getUTCMonth() + 1).padStart(2, '0')
  const snapshotDate = `${yyyy}-${mm}-01`

  const [dr1, dr2] = await Promise.allSettled([
    apiGet('/clan/members'),
    apiGet('/clan/dr2/members'),
  ])

  for (const [tag, result] of [[DR1_TAG, dr1], [DR2_TAG, dr2]]) {
    if (result.status !== 'fulfilled') continue
    const items = result.value?.items || []
    await supabase.from('clan_snapshots').upsert({
      snapshot_date:   snapshotDate,
      clan_tag:        tag,
      member_count:    items.length,
      avg_trophies:    items.length ? Math.round(items.reduce((s, m) => s + (m.trophies ?? 0), 0) / items.length) : 0,
      total_donations: items.reduce((s, m) => s + (m.donations ?? 0), 0),
    }, { onConflict: 'snapshot_date,clan_tag', ignoreDuplicates: true })
  }
  console.log(`[Snapshot] Snapshot mensuel — ${snapshotDate}`)
}
const { isJdcActive, updateJdcEmbeds, checkJdcEnd, autoDetectJdc } = require('./lib/jdcTracker.js')
const { startYoutubeScheduler } = require('./lib/youtubeTracker.js')
const { updateRappelEmbeds } = require('./lib/rappelManager.js')
const { checkBirthdays } = require('./lib/birthdayManager.js')
const { checkExpiredPolls } = require('./lib/pollManager.js')
const { ensureRaidEvent, ensureJdcEvent, ensureNextMonthEvents, checkEventAnnouncements, fetchSupercellEvents } = require('./lib/discordEvents.js')
const { getPlayer, apiGet, parseWarTime, normalizeWar } = require('./cocApi.js')
const { refreshCoreData } = require('./cocDirectApi.js')
const { assignLeagueRole } = require('./utils/assignLeagueRole.js')
const { assignHdvRole } = require('./utils/assignHdvRole.js')

const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

let lastRappelEmbedLogHour = -1

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          ldc.rounds.slice().reverse().find(r => r.war?.state === 'warEnded')
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
          ldc2.rounds.slice().reverse().find(r => r.war?.state === 'warEnded')
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
    console.log('[fetchWarData] Raid state reçu:', latest?.state, '| startTime:', latest?.startTime, '| endTime:', latest?.endTime)
    if (latest?.state === 'ongoing') currentRaid = latest
  } catch (e) {
    console.error('[fetchWarData] Raid API error:', e.message)
  }

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
      if (war.state === 'warEnded') {
        await recordGdcParticipation(war, 'ldc').catch(e => console.error('[Participation] LDC:', e))
      }
    } else if (war.endTime) {
      await postExploit(client, buildGdcRecapMessage(war, clanLabel), `exploit_war_${war.endTime}`)
      await recordGdcParticipation(war).catch(e => console.error('[Participation] GDC:', e))
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

const GDC_MSG_CHANNEL_ID   = '1512570321683746926'
const GDC_DEFAULT_DIMANCHE = "Salut <@&1297318759396278425> Il est l'heure d'envoyer les inscriptions pour la GDC du mardi Chef !"
const GDC_DEFAULT_MARDI    = "Salut <@&1297318759396278425> Il est l'heure de lancer la GDC Chef !"

// ─── Messages automatiques GDC (dimanche + mardi à 21h Paris) ─────────────────

async function checkGdcMessages(client) {
  const parisNow  = new Date(Date.now() + 2 * 3600000)
  const parisDay  = parisNow.getUTCDay() // 0=dimanche, 2=mardi
  const isDimanche = parisDay === 0
  const isMardi    = parisDay === 2
  if (!isDimanche && !isMardi) return

  const yyyy    = parisNow.getUTCFullYear()
  const mm      = String(parisNow.getUTCMonth() + 1).padStart(2, '0')
  const dd      = String(parisNow.getUTCDate()).padStart(2, '0')
  const dayName = isDimanche ? 'dimanche' : 'mardi'
  const sentKey = `gdc_sent_${dayName}_${yyyy}-${mm}-${dd}`

  const { data: already } = await supabase.from('bot_config').select('value').eq('key', sentKey).maybeSingle()
  if (already) return

  const configKey  = isDimanche ? 'gdc_msg_dimanche' : 'gdc_msg_mardi'
  const defaultMsg = isDimanche ? GDC_DEFAULT_DIMANCHE : GDC_DEFAULT_MARDI
  const { data: msgData } = await supabase.from('bot_config').select('value').eq('key', configKey).maybeSingle()
  const text = msgData?.value ?? defaultMsg

  const channel = await client.channels.fetch(GDC_MSG_CHANNEL_ID).catch(() => null)
  if (!channel) return

  await channel.send(text)
  await supabase.from('bot_config').upsert({ key: sentKey, value: new Date().toISOString(), updated_at: new Date().toISOString() })
  console.log(`[Scheduler] Message GDC ${dayName} envoyé`)
  log(client, 'GDC', `Message GDC ${dayName} envoyé`).catch(() => {})
}

// ─── Refresh ligues automatique (lundi 12h Paris) ────────────────────────────

async function checkLeagueRefresh(client) {
  const parisNow = new Date(Date.now() + 2 * 3600000)
  if (parisNow.getUTCDay() !== 1) return // 1 = lundi

  const yyyy    = parisNow.getUTCFullYear()
  const mm      = String(parisNow.getUTCMonth() + 1).padStart(2, '0')
  const dd      = String(parisNow.getUTCDate()).padStart(2, '0')
  const sentKey = `league_refresh_${yyyy}-${mm}-${dd}`

  const { data: already } = await supabase.from('bot_config').select('value').eq('key', sentKey).maybeSingle()
  if (already) return

  const { data: links } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag, coc_name')
    .eq('is_primary', true)

  if (!links?.length) return

  const guild = client.guilds.cache.first()
  if (!guild) return

  let updated = 0
  let errors  = 0

  for (const link of links) {
    try {
      const member = await guild.members.fetch(link.discord_id).catch(() => null)
      if (!member) {
        errors++
        log(client, 'ERREUR', `Refresh ligue — **${link.coc_name}** (\`${link.coc_tag}\`) : membre Discord introuvable (quitté le serveur ?)`, true).catch(() => {})
        continue
      }

      if (!member.roles.cache.has(DONJON_ROUGE_ROLE_ID) || !member.roles.cache.has(LIE_ROLE_ID)) {
        await assignLeagueRole(member, null).catch(() => {})
        continue
      }

      const player = await getPlayer(link.coc_tag)
      await assignLeagueRole(member, player.leagueTier?.name ?? null)
      await assignHdvRole(member, player.townHallLevel)
      updated++
    } catch (e) {
      console.error(`[Scheduler] League refresh ${link.coc_name} (${link.coc_tag}):`, e.message)
      errors++
      log(client, 'ERREUR', `Refresh ligue — **${link.coc_name}** (\`${link.coc_tag}\`) : ${e.message}`, true).catch(() => {})
    }
    await new Promise(r => setTimeout(r, 500))
  }

  await supabase.from('bot_config').upsert({ key: sentKey, value: new Date().toISOString(), updated_at: new Date().toISOString() })
  console.log(`[Scheduler] League refresh lundi — ${updated} mis à jour, ${errors} erreur(s)`)
  log(client, 'SCHEDULER', `Refresh ligue lundi — ${updated} mis à jour, ${errors} erreur(s)`).catch(() => {})
}

// ─── Purge automatique du salon Logs bot (toutes les 24h à 3h Paris) ─────────

const LOGS_BOT_CHANNEL_ID = '1522722935918559364'
const PURGE_NORMAL_MS     = 24 * 60 * 60 * 1000   // 24h — logs normaux
const PURGE_ERROR_MS      = 48 * 60 * 60 * 1000   // 48h — logs d'erreur (🔴)
const FOURTEEN_DAYS_MS    = 14 * 24 * 60 * 60 * 1000

async function checkLogsPurge(client) {
  const channel = await client.channels.fetch(LOGS_BOT_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const now = Date.now()

  // Récupère les messages par lots jusqu'à remonter au-delà du seuil le plus large (48h)
  const all = []
  let lastId = null
  while (true) {
    const options = { limit: 100 }
    if (lastId) options.before = lastId
    const batch = await channel.messages.fetch(options).catch(() => null)
    if (!batch?.size) break
    all.push(...batch.values())
    const oldest = batch.last()
    if (now - oldest.createdTimestamp > PURGE_ERROR_MS) break  // inutile d'aller plus loin
    lastId = oldest.id
    if (batch.size < 100) break
  }

  const toDeleteBulk = []
  const toDeleteOne  = []

  for (const msg of all) {
    const isError   = msg.content.startsWith('🔴')
    const threshold = isError ? PURGE_ERROR_MS : PURGE_NORMAL_MS
    if (now - msg.createdTimestamp < threshold) continue

    if (now - msg.createdTimestamp < FOURTEEN_DAYS_MS) {
      toDeleteBulk.push(msg.id)
    } else {
      toDeleteOne.push(msg)
    }
  }

  let deleted = 0

  for (let i = 0; i < toDeleteBulk.length; i += 100) {
    const batch = toDeleteBulk.slice(i, i + 100)
    if (batch.length >= 2) {
      await channel.bulkDelete(batch).catch(() => {})
    } else {
      await channel.messages.delete(batch[0]).catch(() => {})
    }
    deleted += batch.length
  }

  for (const msg of toDeleteOne) {
    await msg.delete().catch(() => {})
    deleted++
    await new Promise(r => setTimeout(r, 500))
  }

  if (deleted > 0) {
    console.log(`[Scheduler] LogsPurge — ${deleted} message(s) supprimé(s) du salon Logs bot`)
  }
}

// ─── Boucle principale ────────────────────────────────────────────────────────

async function checkAndUpdate(client) {
  await refreshCoreData().catch(e => console.error('[Scheduler] CoC core refresh:', e))

  const warData = await fetchWarData()
  await checkExploits(client, warData).catch(e => console.error('[Scheduler] Exploits:', e))
  await updateEventsMessage(client).catch(e => console.error('[Scheduler] Events:', e))

  // Sondages — vérification des sondages expirés à chaque tick
  await checkExpiredPolls(client).catch(e => console.error('[Scheduler] Polls:', e))

  // Calcul heure Paris en avance (utilisé pour les logs et les conditions)
  const parisNow  = new Date(Date.now() + 2 * 3600000)
  const parisHour = parisNow.getUTCHours()
  const parisDay  = parisNow.getUTCDate()

  // Rappels v2 — embeds liste mis à jour à chaque tick
  await updateRappelEmbeds(client).catch(e => console.error('[Scheduler] RappelEmbeds:', e))
  if (parisHour !== lastRappelEmbedLogHour) {
    lastRappelEmbedLogHour = parisHour
    const dr1State  = warData.wars?.dr1?.state ?? 'unknown'
    const dr2State  = warData.wars?.dr2?.state ?? 'unknown'
    const raidState = warData.currentRaid ? 'ongoing' : 'inactive'
    log(client, 'SCHEDULER', `Embeds rappel mis à jour (DR1 ${dr1State}, DR2 ${dr2State}, Raid ${raidState})`).catch(() => {})
  }

  // Rappels v2 — refresh embeds à 10h et 20h (heure Paris = UTC+2)
  console.log('[Scheduler] Heure Paris:', parisHour)
  if (parisHour === 10 || parisHour === 20) {
    await updateRappelEmbeds(client).catch(e => console.error('[Scheduler] RappelEmbeds 10h/20h:', e))
  }
  if (parisHour === 3) {
    await checkLogsPurge(client).catch(e => console.error('[Scheduler] LogsPurge:', e))
  }
  if (parisHour === 10) {
    await checkBirthdays(client).catch(e => console.error('[Scheduler] Birthdays:', e))
    await sendWeeklyStats(client).catch(e => console.error('[Scheduler] WeeklyStats:', e))
    log(client, 'SCHEDULER', 'Stats hebdomadaires envoyées').catch(() => {})
  }
  if (parisHour === 12) {
    await checkLeagueRefresh(client).catch(e => console.error('[Scheduler] LeagueRefresh:', e))
  }
  if (parisHour === 21) {
    await checkGdcMessages(client).catch(e => console.error('[Scheduler] GDC messages:', e))
  }

  // Événements Discord — raid, JDC, annonces
  await ensureRaidEvent(client).catch(e => console.error('[Events] Raid:', e))
  await ensureJdcEvent(client).catch(e => console.error('[Events] JDC:', e))
  await checkEventAnnouncements(client).catch(e => console.error('[Events] Annonces:', e))

  // Événements Supercell — scraping blog CoC, une fois par jour à 8h Paris
  if (parisHour === 8) {
    await fetchSupercellEvents(client).catch(e => console.error('[Events] Supercell:', e))
    if (parisDay === 1) {
      log(client, 'SCHEDULER', 'Snapshot mensuel pris').catch(() => {})
    }
    await takeMonthlySnapshot().catch(e => console.error('[Scheduler] Snapshot:', e))
  }

  // Événements mois suivant — le 28 à 8h Paris
  if (parisHour === 8 && parisDay === 28) {
    await ensureNextMonthEvents(client).catch(e => console.error('[Events] NextMonth:', e))
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

// ─── Chargement des IDs connus au démarrage ───────────────────────────────────

async function cleanupReminderChannel(client) {
  const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const keys = [
    'reminder_dr1_msg', 'reminder_dr2_msg', 'reminder_raid_msg',
    'rappel_embed_jdc_id',
    'rappel_ping_dr1_id', 'rappel_ping_dr2_id',
  ]

  for (const key of keys) {
    const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
    if (!data?.value) continue

    try {
      const msg = await channel.messages.fetch(data.value)
      reminderMsgCache[key] = msg.id
    } catch {
      reminderMsgCache[key] = null
      await supabase.from('bot_config').delete().eq('key', key)
    }
  }
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

function startScheduler(client) {
  let isRunning = false
  const run = async () => {
    if (isRunning) {
      console.log('[Scheduler] Tick ignoré — tick précédent encore en cours')
      return
    }
    isRunning = true
    try { await checkAndUpdate(client) }
    catch (e) {
      console.error('[Scheduler] Erreur:', e)
      log(client, 'ERREUR', `scheduler.js: ${e.message}`, true).catch(() => {})
    } finally {
      isRunning = false
    }
  }
  cleanupReminderChannel(client)
    .catch(e => console.error('[Scheduler] cleanupReminderChannel:', e))
    .finally(run)
  setInterval(run, 30 * 60 * 1000)
  console.log('[Scheduler] Démarré — vérification toutes les 30 minutes')
  startYoutubeScheduler(client)
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
