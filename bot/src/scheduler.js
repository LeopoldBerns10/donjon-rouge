const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
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
    return '😴 Au repos'
  }
  if (war.state === 'preparation') {
    const startTime = parseWarTime(war.startTime)
    if (startTime) {
      const hoursLeft = Math.max(0, Math.ceil((startTime.getTime() - Date.now()) / 3600000))
      return `🛡️ Préparation\n⏳ Début dans ${hoursLeft}h`
    }
    return '🛡️ Préparation\n⏳ Début bientôt'
  }
  if (war.state === 'inWar') {
    const members = war.clan?.members || []
    const attacksPerMember = war.attacksPerMember || 2
    const done = members.reduce((acc, m) => acc + (m.attacks?.length ?? 0), 0)
    const total = members.length * attacksPerMember
    const late = members.filter(m => (m.attacks?.length ?? 0) === 0).length
    return `⚔️ Guerre active\n✅ ${done}/${total} attaques faites\n❌ ${late} guerrier${late !== 1 ? 's' : ''} en retard`
  }
  return `❓ ${war.state}`
}

function getRaidFieldValue(raid) {
  if (!raid) return '😴 Prochain raid vendredi'
  const attacksUsed = (raid.members || []).reduce((acc, m) => acc + (m.attacks ?? 0), 0)
  return `💎 Raid actif\n⚔️ ${attacksUsed} attaques utilisées\n⏰ Fin dimanche soir`
}

async function buildWarDetailFields(war, label) {
  if (!war || war.state === 'notInWar' || war.state === 'warEnded') return []

  if (war.state === 'preparation') {
    const ours   = [...(war.clan?.members   || [])].sort((a, b) => b.townhallLevel - a.townhallLevel).slice(0, 15)
    const theirs = [...(war.opponent?.members || [])].sort((a, b) => b.townhallLevel - a.townhallLevel).slice(0, 15)

    const oursValue   = ours.length   ? ours.map(m   => `\`HDV${m.townhallLevel}\` ${m.name}`).join('\n')   : '—'
    const theirsValue = theirs.length ? theirs.map(m => `\`HDV${m.townhallLevel}\` ${m.name}`).join('\n') : '—'

    return [
      { name: `🛡️ ${label} — Nos guerriers`,   value: oursValue.slice(0, 1024),   inline: true },
      { name: `⚔️ ${label} — Leurs guerriers`, value: theirsValue.slice(0, 1024), inline: true },
      { name: '​',                          value: '​',                   inline: true },
    ]
  }

  if (war.state === 'inWar') {
    const attacksPerMember = war.attacksPerMember || 2
    const clanStars     = war.clan?.stars ?? 0
    const opponentStars = war.opponent?.stars ?? 0
    const attacksUsed   = (war.clan?.members || []).reduce((acc, m) => acc + (m.attacks?.length ?? 0), 0)
    const totalAttacks  = (war.clan?.members || []).length * attacksPerMember

    const sorted = [...(war.clan?.members || [])].sort((a, b) => {
      const aA = a.attacks?.length ?? 0
      const bA = b.attacks?.length ?? 0
      if (aA === 0 && bA !== 0) return -1
      if (aA !== 0 && bA === 0) return 1
      if (aA < attacksPerMember && bA === attacksPerMember) return -1
      if (aA === attacksPerMember && bA < attacksPerMember) return 1
      return b.townhallLevel - a.townhallLevel
    }).slice(0, 15)

    const discordMap = await getDiscordIds(sorted.map(m => m.tag))

    const lines = sorted.map(m => {
      const atks  = m.attacks?.length ?? 0
      const icon  = atks === 0 ? '❌' : atks < attacksPerMember ? '⚡' : '✅'
      const ids   = discordMap[m.tag] || []
      const mention = ids.length > 0 ? ` ${ids.map(id => `<@${id}>`).join('')}` : ''
      return `${icon} \`HDV${m.townhallLevel}\` ${m.name}${mention} — ${atks}/${attacksPerMember} att.`
    })

    const value = `⭐ ${clanStars} vs ⭐ ${opponentStars}  |  ⚔️ ${attacksUsed}/${totalAttacks} attaques\n\n${lines.join('\n')}`
    return [{
      name:   `⚔️ ${label} — Guerre active`,
      value:  value.slice(0, 1024),
      inline: false,
    }]
  }

  return []
}

async function buildStatusEmbed(warDR1, warDR2, raid) {
  const warActive =
    warDR1?.state === 'inWar' || warDR1?.state === 'preparation' ||
    warDR2?.state === 'inWar' || warDR2?.state === 'preparation'
  const raidActive = !!raid

  let color
  if (warActive && raidActive) color = 0xCC3300
  else if (warActive)          color = 0xFF6600
  else if (raidActive)         color = 0x7B2FBE
  else                         color = 0x8B0000

  const ownBadge = warDR1?.clan?.badgeUrls?.medium || warDR2?.clan?.badgeUrls?.medium || null
  const oppBadge =
    warDR1?.state === 'preparation' ? (warDR1?.opponent?.badgeUrls?.medium ?? null) :
    warDR2?.state === 'preparation' ? (warDR2?.opponent?.badgeUrls?.medium ?? null) : null
  const thumbUrl = oppBadge || ownBadge

  const footer = ownBadge
    ? { text: 'Donjon Rouge • Mis à jour', iconURL: ownBadge }
    : { text: 'Donjon Rouge • Mis à jour' }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🏰 Donjon Rouge — Situation des combats')
    .addFields(
      { name: '🏰 DR1 — Guerre', value: getWarFieldValue(warDR1), inline: true },
      { name: '​',           value: '​',                 inline: true },
      { name: '🏰 DR2 — Guerre', value: getWarFieldValue(warDR2), inline: true },
      { name: '💎 Raid Capital',  value: getRaidFieldValue(raid),  inline: false },
    )
    .setFooter(footer)
    .setTimestamp()

  if (thumbUrl) embed.setThumbnail(thumbUrl)

  const [dr1Fields, dr2Fields] = await Promise.all([
    buildWarDetailFields(warDR1, 'DR1'),
    buildWarDetailFields(warDR2, 'DR2'),
  ])
  for (const field of [...dr1Fields, ...dr2Fields]) embed.addFields(field)

  return embed
}

function buildStatusComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mes_performances')
        .setLabel('📊 Mes performances')
        .setStyle(ButtonStyle.Primary)
    )
  ]
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
      // Message supprimé — on nettoie Supabase et on recrée
      await supabase.from('bot_config').delete().eq('key', 'status_message_id')
    }
  }

  // Création du nouveau message
  const msg = await channel.send({ embeds: [await buildStatusEmbed(null, null, null)], components: buildStatusComponents() })
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

// ─── Normalisation de guerre (LDC) ───────────────────────────────────────────

function normalizeWar(war, ourTag) {
  if (!war) return war
  if (war.clan?.tag === ourTag) return war
  if (war.opponent?.tag === ourTag) {
    return { ...war, clan: war.opponent, opponent: war.clan }
  }
  return war
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
  const DR1_TAG = '#29292QPRC'
  const DR2_TAG = '#2RCGG9YR9'

  // Fallback LDC pour DR1 si pas en guerre normale
  const dr1Inactive = !wars.dr1 || wars.dr1.state === 'notInWar' || wars.dr1.state === 'warEnded'
  if (dr1Inactive) {
    try {
      const ldc = await apiGet('/ldc/current')
      if (ldc?.rounds) {
        const activeRound = ldc.rounds.find(r => r.war != null)
        if (activeRound?.war) wars.dr1 = normalizeWar(activeRound.war, DR1_TAG)
      }
    } catch {}
  }

  // Fallback LDC pour DR2 si pas en guerre normale
  const dr2Inactive = !wars.dr2 || wars.dr2.state === 'notInWar' || wars.dr2.state === 'warEnded'
  if (dr2Inactive) {
    try {
      const ldc2 = await apiGet('/ldc/dr2/current')
      if (ldc2?.rounds) {
        const activeRound2 = ldc2.rounds.find(r => r.war != null)
        if (activeRound2?.war) wars.dr2 = normalizeWar(activeRound2.war, DR2_TAG)
      }
    } catch {}
  }

  let currentRaid = null
  try {
    const raidData = await apiGet('/clan/raids')
    const latest = raidData?.items?.[0] || null
    if (latest?.startTime) {
      const start = parseWarTime(latest.startTime) || new Date(latest.startTime)
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600000
      if (!isNaN(start) && start.getTime() > sevenDaysAgo) currentRaid = latest
    }
  } catch {}

  // Met à jour l'embed de statut
  const statusMsg = await getOrCreateStatusMessage(channel)
  await statusMsg.edit({ embeds: [await buildStatusEmbed(wars.dr1, wars.dr2, currentRaid)], components: buildStatusComponents() })

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

async function resetStatus() {
  statusMessageId = null
  await supabase.from('bot_config').delete().eq('key', 'status_message_id')
}

module.exports = { startScheduler, forceRefresh, resetStatus }
