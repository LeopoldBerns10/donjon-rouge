const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')
const { getPlayer, getClanMembers, getClanMembersDR2, extractClanGamePoints, flushCocCache } = require('../cocApi.js')
const {
  TIERS,
  INDIVIDUAL_BONUS_THRESHOLD,
  INDIVIDUAL_DR_THRESHOLD,
  JDC_TRACKING_CHANNEL,
  JDC_REMINDER_CHANNEL,
  JDC_ARCHIVE_CHANNEL,
  REMINDER_HOUR,
  CLANS,
} = require('../config/jdcConfig.js')

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── bot_config helpers ───────────────────────────────────────────────────────

async function getConfig(key) {
  const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}

async function setConfig(key, value) {
  await supabase.from('bot_config').upsert({ key, value, updated_at: new Date().toISOString() })
}

// ─── JDC état ─────────────────────────────────────────────────────────────────

async function isJdcActive() {
  return (await getConfig('jdc_active')) === 'true'
}

// ─── Fetch membres + points ────────────────────────────────────────────────────

async function fetchClanMembersWithPoints(clanKey, season) {
  let raw
  try {
    raw = clanKey === 'dr1' ? await getClanMembers() : await getClanMembersDR2()
  } catch {
    return []
  }
  const members = raw?.items ?? (Array.isArray(raw) ? raw : [])
  const clan    = CLANS.find(c => c.key === clanKey)

  const { data: baselines } = await supabase
    .from('jdc_baselines')
    .select('player_tag, baseline_value')
    .eq('season', season)
    .in('player_tag', members.map(m => m.tag))

  const baselineMap = Object.fromEntries((baselines || []).map(b => [b.player_tag, b.baseline_value]))

  const results = []
  for (const m of members) {
    try {
      const player  = await getPlayer(m.tag)
      const current = extractClanGamePoints(player)
      const base    = baselineMap[m.tag] ?? current
      results.push({ tag: m.tag, name: m.name, points: Math.max(0, current - base) })
    } catch {
      results.push({ tag: m.tag, name: m.name, points: 0 })
    }
    await sleep(150)
  }

  return results.sort((a, b) => b.points - a.points)
}

// ─── Fetch unifié DR1 + DR2 (déduplication par tag, pas par nom) ──────────────

async function fetchAllMembersWithPoints(season) {
  let raw1, raw2
  try { raw1 = await getClanMembers()    } catch { raw1 = [] }
  try { raw2 = await getClanMembersDR2() } catch { raw2 = [] }

  const members1 = raw1?.items ?? (Array.isArray(raw1) ? raw1 : [])
  const members2 = raw2?.items ?? (Array.isArray(raw2) ? raw2 : [])

  const tagsSeen   = new Set()
  const allMembers = []
  for (const m of [...members1, ...members2]) {
    if (!tagsSeen.has(m.tag)) {
      tagsSeen.add(m.tag)
      allMembers.push(m)
    }
  }

  const { data: baselines } = await supabase
    .from('jdc_baselines')
    .select('player_tag, baseline_value')
    .eq('season', season)
    .in('player_tag', allMembers.map(m => m.tag))

  const baselineMap = Object.fromEntries(
    (baselines || []).map(b => [b.player_tag, b.baseline_value])
  )

  const results = []
  for (const m of allMembers) {
    try {
      const player  = await getPlayer(m.tag)
      const current = extractClanGamePoints(player)
      const base    = baselineMap[m.tag] ?? current
      results.push({ tag: m.tag, name: m.name, points: Math.max(0, current - base) })
    } catch {
      results.push({ tag: m.tag, name: m.name, points: 0 })
    }
    await sleep(150)
  }

  return results.sort((a, b) => b.points - a.points)
}

async function saveBaselines(season, clanKey) {
  let raw
  try {
    raw = clanKey === 'dr1' ? await getClanMembers() : await getClanMembersDR2()
  } catch (e) {
    console.error(`[JDC] saveBaselines ${clanKey}:`, e.message)
    return
  }
  const members = raw?.items ?? (Array.isArray(raw) ? raw : [])
  const clan    = CLANS.find(c => c.key === clanKey)

  for (const m of members) {
    try {
      const player   = await getPlayer(m.tag)
      const baseline = extractClanGamePoints(player)
      await supabase.from('jdc_baselines').upsert(
        { player_tag: m.tag, clan_tag: clan.tag, season, baseline_value: baseline },
        { onConflict: 'player_tag,season' }
      )
    } catch (e) {
      console.error(`[JDC] saveBaselines ${m.tag}:`, e.message)
    }
    await sleep(150)
  }
  console.log(`[JDC] Baselines sauvegardées — ${clanKey} saison ${season} (${members.length} membres)`)
}

// ─── Calcul paliers ────────────────────────────────────────────────────────────

function getTierInfo(totalPoints) {
  let current = null
  let next    = null
  for (const tier of TIERS) {
    if (totalPoints >= tier.points) current = tier
    else if (!next) next = tier
  }
  return { current, next }
}

function progressBar(value, max, length = 20) {
  const ratio  = max > 0 ? Math.min(value / max, 1) : 1
  const filled = Math.round(ratio * length)
  return `[${'█'.repeat(filled)}${'░'.repeat(length - filled)}] ${(ratio * 100).toFixed(1)}%`
}

// ─── Statut membre ────────────────────────────────────────────────────────────

function memberStatus(points) {
  if (points >= INDIVIDUAL_DR_THRESHOLD)    return '✅'
  if (points >= INDIVIDUAL_BONUS_THRESHOLD) return '🏆'
  if (points > 0)                           return '⚠️'
  return '❌'
}

// ─── Embed unifié DR1 + DR2 ───────────────────────────────────────────────────

function buildUnifiedJdcEmbed(members, startStr, endStr) {
  const totalPoints = members.reduce((s, m) => s + m.points, 0)
  const { current, next } = getTierInfo(totalPoints)

  const fmtDate = iso => {
    if (!iso) return '?'
    const d = new Date(iso)
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }

  const SEP          = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
  const progressMax  = next ? next.points : TIERS[TIERS.length - 1].points
  const currentLabel = current ? `✅ ${current.label} (${current.points.toLocaleString()})` : 'Aucun palier'
  const nextLabel    = next    ? `🔄 ${next.label} (${next.points.toLocaleString()})` : '🏆 MAX atteint'
  const bar          = progressBar(totalPoints, progressMax)

  const active  = members.filter(m => m.points > 0)
  const zeroes  = members.length - active.length

  const allRankLines = active.map((m, i) => {
    const rank = String(i + 1).padStart(2, ' ')
    const name = m.name.replace(/[\r\n\t`]/g, '').slice(0, 20).padEnd(20, ' ')
    const pts  = String(m.points).padStart(5, ' ')
    return `${rank}. ${name} ${pts}   ${memberStatus(m.points)}`
  })

  const above5000 = members.filter(m => m.points >= INDIVIDUAL_DR_THRESHOLD).length
  const above4000 = members.filter(m => m.points >= INDIVIDUAL_BONUS_THRESHOLD).length
  const now       = Math.floor(Date.now() / 1000)

  // Construit la description complète avec N lignes visibles et M actifs cachés.
  // Appelé en boucle pour ajuster jusqu'à tenir dans 4096 caractères.
  const buildDescription = (shownLines, hiddenActive) => {
    const summaryLines = []
    if (hiddenActive > 0) {
      summaryLines.push(`+ ${hiddenActive} membre${hiddenActive > 1 ? 's' : ''} supplémentaire${hiddenActive > 1 ? 's' : ''}`)
    }
    if (zeroes > 0) {
      summaryLines.push(`• ${zeroes} membre${zeroes > 1 ? 's n\'ont' : ' n\'a'} pas encore participé`)
    }
    return [
      `📅 Du ${fmtDate(startStr)} au ${fmtDate(endStr)} • Mise à jour <t:${now}:R>`,
      '',
      SEP,
      '**PROGRESSION GLOBALE (DR1 + DR2)**',
      `Points : **${totalPoints.toLocaleString()} / ${progressMax.toLocaleString()} pts**`,
      `Palier actuel : ${currentLabel} → ${nextLabel}`,
      bar,
      SEP,
      '```',
      'CLASSEMENT MEMBRES         PTS   STATUT',
      ...shownLines,
      ...summaryLines,
      '```',
      SEP,
      `Total : **${totalPoints.toLocaleString()} pts** • Membres : ${members.length}`,
      `Membres ≥ 5 000 pts (règlement DR) : **${above5000}/${members.length}**`,
      `Membres ≥ 4 000 pts (bonus) : **${above4000}/${members.length}**`,
    ].join('\n')
  }

  // Retirer une ligne à la fois jusqu'à tenir dans 4096 caractères
  let shown = allRankLines.length
  let desc  = buildDescription(allRankLines, 0)
  while (desc.length > 4096 && shown > 0) {
    shown--
    desc = buildDescription(allRankLines.slice(0, shown), active.length - shown)
  }

  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('⚔️ JEUX DE CLAN — DONJON ROUGE')
    .setDescription(desc)
    .setTimestamp()
}

// ─── Embed absents ───────────────────────────────────────────────────────────

function buildAbsentEmbed(members, startStr, endStr) {
  const absent = members.filter(m => m.points === 0)

  const fmtDate = iso => {
    if (!iso) return '?'
    const d = new Date(iso)
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }

  let body
  if (absent.length === 0) {
    body = '✅ Tous les membres ont participé !'
  } else {
    body = absent.map(m => `• ${m.name.replace(/[\r\n\t`]/g, '')}`).join('\n')
  }

  const description = [
    `📅 Du ${fmtDate(startStr)} au ${fmtDate(endStr)}`,
    '',
    body,
    '',
    `**${absent.length} membre${absent.length !== 1 ? 's' : ''} sans participation**`,
  ].join('\n')

  return new EmbedBuilder()
    .setColor(0x2C2F33)
    .setTitle('⏳ MEMBRES JDC PAS COMMENCÉ — DONJON ROUGE')
    .setDescription(description.slice(0, 4096))
    .setTimestamp()
}

// ─── Bouton Actualiser ────────────────────────────────────────────────────────

const CHEF_ROLE_ID = '611123759864348672'

function buildJdcRefreshRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('jdc_refresh')
      .setLabel('🔄 Actualiser')
      .setStyle(ButtonStyle.Secondary)
  )
}

function buildJdcReminderRefreshRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('jdc_reminder_refresh')
      .setLabel('🎮 Actualiser rappels JDC')
      .setStyle(ButtonStyle.Primary)
  )
}

async function handleJdcRefresh(interaction) {
  if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
    return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const channel = await interaction.client.channels.fetch(JDC_TRACKING_CHANNEL).catch(() => null)

  // Supprimer les anciens messages Discord avant de recréer
  for (const key of ['jdc_embed_all_id', 'jdc_embed_absent_id']) {
    const id = jdcMsgCache[key] ?? (await getConfig(key))
    if (id && channel) {
      try {
        const msg = await channel.messages.fetch(id)
        await msg.delete()
      } catch { /* message déjà supprimé ou introuvable */ }
    }
    jdcMsgCache[key] = null
  }
  await supabase.from('bot_config').delete().in('key', ['jdc_embed_all_id', 'jdc_embed_absent_id'])

  await flushCocCache()
  await updateJdcEmbeds(interaction.client)
  await interaction.editReply('✅ Embeds JDC actualisés.')
}

// ─── Gestion message embed live ───────────────────────────────────────────────

const jdcMsgCache = {}

async function ensureJdcMessage(channel, key, embed, buttonRows = null) {
  const components = buttonRows ?? [buildJdcRefreshRow()]
  const cachedId = jdcMsgCache[key]
  if (cachedId) {
    try {
      const msg = await channel.messages.fetch(cachedId)
      await msg.edit({ embeds: [embed], components })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        jdcMsgCache[key] = null
        await supabase.from('bot_config').delete().eq('key', key)
      } else return null
    }
  }

  const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
  if (data?.value) {
    try {
      const msg = await channel.messages.fetch(data.value)
      jdcMsgCache[key] = msg.id
      await msg.edit({ embeds: [embed], components })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        await supabase.from('bot_config').delete().eq('key', key)
      } else return null
    }
  }

  const msg = await channel.send({ embeds: [embed], components })
  await setConfig(key, msg.id)
  jdcMsgCache[key] = msg.id
  console.log(`[JDC] Message ${key} créé : ${msg.id}`)
  return msg
}

// ─── Flush cache joueurs backend ──────────────────────────────────────────────

async function flushPlayersCache() {
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/api/cache/flush/players`, {
      method: 'POST',
      headers: { 'x-bot-secret': process.env.BOT_SECRET ?? '' },
    })
    if (!res.ok) console.warn('[JDC] flushPlayersCache HTTP', res.status, await res.text())
  } catch (e) {
    console.warn('[JDC] flushPlayersCache:', e.message)
  }
}

// ─── Mise à jour embeds live ──────────────────────────────────────────────────

async function updateJdcEmbeds(client) {
  const channel = await client.channels.fetch(JDC_TRACKING_CHANNEL).catch(() => null)
  if (!channel) return

  const [startStr, endStr] = await Promise.all([getConfig('jdc_start'), getConfig('jdc_end')])
  const season = startStr ? startStr.slice(0, 7) : new Date().toISOString().slice(0, 7)

  await flushPlayersCache()

  try {
    const members     = await fetchAllMembersWithPoints(season)
    const embed       = buildUnifiedJdcEmbed(members, startStr, endStr)
    const absentEmbed = buildAbsentEmbed(members, startStr, endStr)
    await ensureJdcMessage(channel, 'jdc_embed_all_id',    embed)
    await ensureJdcMessage(channel, 'jdc_embed_absent_id', absentEmbed, [])
  } catch (e) {
    console.error('[JDC] updateJdcEmbeds:', e)
  }
}

// ─── Rappels automatiques 20h ─────────────────────────────────────────────────

const sentJdcReminders = new Set()

async function checkJdcReminders(client) {
  const [startStr, endStr] = await Promise.all([getConfig('jdc_start'), getConfig('jdc_end')])
  if (!startStr || !endStr) return
  const season = startStr.slice(0, 7)

  const now   = Date.now()
  const start = new Date(startStr).getTime()
  const end   = new Date(endStr).getTime()
  if (now < start || now > end) return

  const daysSinceStart = Math.floor((now - start) / 86400000)
  if (daysSinceStart < 1 || daysSinceStart > 4) return

  // Heure Paris (UTC+2 en été)
  const parisHour = new Date(now + 2 * 3600000).getUTCHours()
  if (parisHour !== REMINDER_HOUR) return

  const today = new Date(now + 2 * 3600000).toISOString().slice(0, 10)
  if (sentJdcReminders.has(today)) return

  const channel  = await client.channels.fetch(JDC_REMINDER_CHANNEL).catch(() => null)
  if (!channel) return

  const daysLeft = Math.max(1, Math.ceil((end - now) / 86400000))

  for (const clan of CLANS) {
    try {
      const members = await fetchClanMembersWithPoints(clan.key, season)
      const zero    = members.filter(m => m.points === 0)
      const partial = members.filter(m => m.points > 0 && m.points < INDIVIDUAL_DR_THRESHOLD)

      if (zero.length > 0) {
        const tags = zero.map(m => m.tag)
        const { data } = await supabase.from('discord_links').select('discord_id, coc_tag').in('coc_tag', tags)
        const discordMap = Object.fromEntries((data || []).map(r => [r.coc_tag, r.discord_id]))
        const mentions   = zero.map(m => discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name).join(' ')
        const msg = await channel.send(
          `⚔️ ${mentions} — Jeux de Clan en cours !\nVous n'avez pas encore participé. Il reste **${daysLeft} jour(s)** !\nObjectif DR : **5 000 pts** minimum 🎯`
        )
        setTimeout(() => msg.delete().catch(() => {}), 2 * 60 * 60 * 1000)
      }

      if (partial.length > 0) {
        const tags = partial.map(m => m.tag)
        const { data } = await supabase.from('discord_links').select('discord_id, coc_tag').in('coc_tag', tags)
        const discordMap = Object.fromEntries((data || []).map(r => [r.coc_tag, r.discord_id]))
        const lines = partial.map(m => {
          const mention = discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
          return `${mention} (${m.points} pts)`
        }).join(', ')
        const msg = await channel.send(
          `⚠️ ${lines}\nVous êtes en cours mais pas encore à l'objectif DR (**5 000 pts**). Il reste **${daysLeft} jour(s)** ! 🔥`
        )
        setTimeout(() => msg.delete().catch(() => {}), 2 * 60 * 60 * 1000)
      }
    } catch (e) {
      console.error(`[JDC] checkJdcReminders ${clan.key}:`, e)
    }
  }

  sentJdcReminders.add(today)
  console.log(`[JDC] Rappels envoyés pour le ${today}`)
}

// ─── Archivage fin d'événement ────────────────────────────────────────────────

async function checkJdcEnd(client) {
  const endStr = await getConfig('jdc_end')
  if (!endStr) return
  if (Date.now() < new Date(endStr).getTime()) return

  const season         = new Date(endStr).toISOString().slice(0, 7)
  const alreadyArchived = await getConfig(`jdc_archived_${season}`)
  if (alreadyArchived === 'true') return

  const archiveChannel = await client.channels.fetch(JDC_ARCHIVE_CHANNEL).catch(() => null)
  const startStr       = await getConfig('jdc_start')

  const fmtDate = iso => {
    if (!iso) return '?'
    const d = new Date(iso)
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
  }

  const monthName = new Date(endStr).toLocaleString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

  for (const clan of CLANS) {
    try {
      const members     = await fetchClanMembersWithPoints(clan.key, season)
      const totalPoints = members.reduce((s, m) => s + m.points, 0)
      const { current } = getTierInfo(totalPoints)
      const tierReached = current?.tier ?? 0

      await supabase.from('jdc_results').insert({
        clan_tag:     clan.tag,
        clan_name:    clan.name,
        season,
        total_points: totalPoints,
        tier_reached: tierReached,
        members:      members.map(m => ({ tag: m.tag, name: m.name, points: m.points })),
      })

      if (archiveChannel) {
        const above5000   = members.filter(m => m.points >= INDIVIDUAL_DR_THRESHOLD).length
        const participants = members.filter(m => m.points > 0).length
        const ranking      = members.slice(0, 50).map((m, i) =>
          `${String(i + 1).padStart(2, ' ')}. ${m.name.slice(0, 20).padEnd(20)} ${String(m.points).padStart(5)} pts ${memberStatus(m.points)}`
        ).join('\n')

        const content = [
          `🏁 **RÉSULTATS JEUX DE CLAN — ${monthName.toUpperCase()}**`,
          `Clan : **${clan.name}** (${clan.tag})`,
          SEP,
          `🏆 Palier atteint : **${current?.label ?? 'Aucun'} (${totalPoints.toLocaleString()} pts)**`,
          `📊 Total clan : **${totalPoints.toLocaleString()} pts**`,
          `👥 Membres participants : **${participants}/${members.length}**`,
          `✅ Membres ≥ 5 000 pts (règlement) : **${above5000}/${members.length}**`,
          '',
          '**CLASSEMENT FINAL**',
          '```',
          ranking,
          '```',
          SEP,
          `📅 Du ${fmtDate(startStr)} au ${fmtDate(endStr)}`,
        ].join('\n')

        await archiveChannel.send(content.slice(0, 2000))
      }

      console.log(`[JDC] Archivage ${clan.key} saison ${season} terminé`)
    } catch (e) {
      console.error(`[JDC] checkJdcEnd ${clan.key}:`, e)
    }
  }

  await setConfig(`jdc_archived_${season}`, 'true')
  await setConfig('jdc_active', 'false')

  jdcMsgCache['jdc_embed_all_id']    = null
  jdcMsgCache['jdc_embed_absent_id'] = null
  await supabase.from('bot_config').delete().in('key', ['jdc_embed_all_id', 'jdc_embed_absent_id'])

  console.log(`[JDC] Événement terminé — archivé pour la saison ${season}`)
}

// ─── Détection automatique début JDC ─────────────────────────────────────────

async function autoDetectJdc(client) {
  try {
    const raw     = await getClanMembers()
    const members = (raw?.items ?? (Array.isArray(raw) ? raw : [])).slice(0, 3)

    for (const m of members) {
      const player = await getPlayer(m.tag)
      // clanGamePoints est un champ direct de l'API CoC, présent uniquement pendant les JDC
      if ((player?.clanGamePoints ?? 0) > 0) {
        console.log('[JDC] Jeux de Clan détectés automatiquement')
        await setConfig('jdc_active', 'true')

        const existingStart = await getConfig('jdc_start')
        if (!existingStart) {
          const now   = new Date()
          const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 22, 8, 0, 0))
          const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 28, 8, 0, 0))
          await setConfig('jdc_start', start.toISOString())
          await setConfig('jdc_end',   end.toISOString())
        }

        await updateJdcEmbeds(client)
        return true
      }
      await sleep(200)
    }
  } catch (e) {
    console.error('[JDC] autoDetectJdc:', e)
  }
  return false
}

// ─── Export pour messagingHandlers ────────────────────────────────────────────

async function fetchJdcMembersUnder5000() {
  const startStr = await getConfig('jdc_start')
  const season   = startStr ? startStr.slice(0, 7) : new Date().toISOString().slice(0, 7)
  const members  = await fetchAllMembersWithPoints(season)
  return members.filter(m => m.points < INDIVIDUAL_DR_THRESHOLD)
}

// ─── Démarrage forcé ──────────────────────────────────────────────────────────

async function startJdcTracking(client) {
  const now    = new Date()
  const season = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  // Dates canoniques JDC : 22 au 28 du mois en cours, 8h UTC
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 22, 8, 0, 0))
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 28, 8, 0, 0))

  await setConfig('jdc_start',  start.toISOString())
  await setConfig('jdc_end',    end.toISOString())
  await setConfig('jdc_active', 'true')

  console.log(`[JDC] Tracking activé — saison ${season}, du ${start.toISOString()} au ${end.toISOString()}`)
  console.log('[JDC] Sauvegarde des baselines "Games Champion"...')

  await Promise.all(CLANS.map(c => saveBaselines(season, c.key)))

  console.log('[JDC] Récupération des points delta et mise à jour des embeds...')
  await updateJdcEmbeds(client)

  console.log('[JDC] Embeds DR1 et DR2 postés/mis à jour.')
}

// ─── Bouton Actualiser rappels JDC ───────────────────────────────────────────

async function handleJdcReminderRefresh(interaction) {
  if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
    return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const channel = await interaction.client.channels.fetch(JDC_REMINDER_CHANNEL).catch(() => null)
  if (!channel) return interaction.editReply('❌ Salon introuvable.')

  try {
    const allUnder = await fetchJdcMembersUnder5000()
    const zero     = allUnder.filter(m => m.points === 0)
    const partial  = allUnder.filter(m => m.points > 0)

    if (allUnder.length === 0) {
      return interaction.editReply('✅ Tous les membres ont atteint 5 000 pts !')
    }

    const allTags = allUnder.map(m => m.tag)
    const { data: links } = await supabase.from('discord_links').select('discord_id, coc_tag').in('coc_tag', allTags)
    const discordMap = Object.fromEntries((links || []).map(r => [r.coc_tag, r.discord_id]))

    const mention  = m => discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
    const fmtPts   = n => n.toLocaleString('fr-FR')
    const chunk    = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))
    const TWO_HOURS = 2 * 60 * 60 * 1000
    const autoDelete = msg => setTimeout(() => msg.delete().catch(() => {}), TWO_HOURS)

    if (zero.length > 0) {
      const lines  = zero.map(m => mention(m))
      const chunks = chunk(lines, 10)
      for (let i = 0; i < chunks.length; i++) {
        const header = i === 0
          ? `🎮 Jeux de Clan en cours — **${zero.length} membre${zero.length > 1 ? 's' : ''} n'ont pas encore participé**\nObjectif DR : 5 000 pts minimum 🎯\n`
          : `🎮 *(suite ${i + 1}/${chunks.length})*\n`
        autoDelete(await channel.send(header + chunks[i].join('\n')))
      }
    }

    if (partial.length > 0) {
      const lines  = partial.map(m => `${mention(m)} — ${fmtPts(m.points)} pts`)
      const chunks = chunk(lines, 10)
      for (let i = 0; i < chunks.length; i++) {
        const header = i === 0
          ? `🔥 En bonne voie, mais l'objectif DR est 5 000 pts !\n`
          : `🔥 *(suite ${i + 1}/${chunks.length})*\n`
        autoDelete(await channel.send(header + chunks[i].join('\n')))
      }
    }

    await interaction.editReply(`✅ Rappels envoyés (${zero.length} absents, ${partial.length} en cours).`)
  } catch (e) {
    console.error('[JDC] handleJdcReminderRefresh:', e)
    await interaction.editReply('❌ Erreur lors de l\'envoi des rappels.')
  }
}

module.exports = {
  isJdcActive,
  startJdcTracking,
  updateJdcEmbeds,
  checkJdcReminders,
  checkJdcEnd,
  autoDetectJdc,
  fetchJdcMembersUnder5000,
  handleJdcRefresh,
  handleJdcReminderRefresh,
}
