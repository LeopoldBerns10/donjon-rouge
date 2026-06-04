const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField,
} = require('discord.js')
const supabase = require('../supabase.js')
const { getPlayer, getRaidSeasons, getLdcCurrent, getLdcCurrentDR2 } = require('../cocApi.js')
const { buildPlayerEmbed, buildNavComponents } = require('../utils/performances.js')
const { assignLeagueRole } = require('../utils/assignLeagueRole.js')
const { ACCOUNT_CHANNEL_ID } = require('../config/reminders.js')

const BASE = process.env.BACKEND_URL
const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

// channelId → { timer, configKey, channel }
const activeSpaces = new Map()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseWarTime(s) {
  if (!s) return null
  return new Date(s.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'))
}

function sanitizeName(name) {
  if (!name) return '—'
  return [...name]
    .filter(ch => {
      const cp = ch.codePointAt(0)
      if (cp < 0x20) return false
      if (cp >= 0x7F && cp <= 0x9F) return false
      if (cp >= 0x200B && cp <= 0x200F) return false
      if (cp === 0xFEFF || cp === 0x2060) return false
      return true
    })
    .join('')
    .slice(0, 30)
}

function getLeagueEmoji(leagueName) {
  if (!leagueName) return '⚔️'
  const n = leagueName.toLowerCase()
  if (n.includes('legend'))   return '🏆'
  if (n.includes('titan'))    return '💎'
  if (n.includes('champion')) return '👑'
  if (n.includes('master'))   return '🔮'
  if (n.includes('crystal'))  return '💠'
  if (n.includes('gold'))     return '🥇'
  if (n.includes('silver'))   return '🥈'
  if (n.includes('bronze'))   return '🥉'
  return '⚔️'
}

function normalizeWar(war, ourTag) {
  if (!war) return war
  if (war.clan?.tag === ourTag) return war
  if (war.opponent?.tag === ourTag) return { ...war, clan: war.opponent, opponent: war.clan }
  return war
}

async function fetchWarForClan(clanKey) {
  if (!BASE) return null
  try {
    const res = await fetch(`${BASE}/api/coc/clan/${clanKey}/war`)
    return res.ok ? res.json() : null
  } catch { return null }
}

// ─── Embed 1 : Profil ─────────────────────────────────────────────────────────

function buildWarriorProfileEmbed(player, member) {
  const leagueName = player.leagueTier?.name ?? player.league?.name ?? null
  const embed = buildPlayerEmbed(player, member.id)
  embed
    .setTitle(`${getLeagueEmoji(leagueName)} ${sanitizeName(player.name)} — HDV${player.townHallLevel}`)
    .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
  return embed
}

// ─── Embed 2 : Guerre & Raid ──────────────────────────────────────────────────

function buildLdcRoundLines(ldc, playerTag, ourTag) {
  const rounds = ldc.rounds || []
  if (!rounds.length) return null

  // Expiration 7 jours après fin de saison
  const allDone = rounds.every(r => !r.war || r.war.state === 'warEnded')
  if (allDone) {
    let lastEnd = null
    for (const r of rounds) {
      if (r.war?.endTime) {
        const t = parseWarTime(r.war.endTime)
        if (t && (!lastEnd || t > lastEnd)) lastEnd = t
      }
    }
    if (lastEnd && Date.now() - lastEnd.getTime() > 7 * 24 * 3600000) return null
  }

  const lines = []
  let futureStart = null

  for (let i = 0; i < rounds.length; i++) {
    const day = i + 1
    const war = rounds[i].war ? normalizeWar(rounds[i].war, ourTag) : null

    if (!war) {
      if (futureStart === null) futureStart = day
      continue
    }

    const opp = sanitizeName(war.opponent?.name ?? '???')
    const m = (war.clan?.members || []).find(m => m.tag === playerTag)

    if (war.state === 'warEnded') {
      if (m) {
        const atks = m.attacks?.length ?? 0
        const stars = (m.attacks || []).reduce((s, a) => s + (a.stars ?? 0), 0)
        lines.push(`✅ Jour ${day} vs ${opp} — ⭐ ${stars} étoile${stars !== 1 ? 's' : ''} (${atks} att.)`)
      } else {
        lines.push(`✅ Jour ${day} vs ${opp} — Terminé`)
      }
    } else if (war.state === 'inWar') {
      if (m) {
        lines.push(`⚔️ Jour ${day} vs ${opp} — En cours (${m.attacks?.length ?? 0}/1 att.)`)
      } else {
        lines.push(`⚔️ Jour ${day} vs ${opp} — En cours`)
      }
    } else if (war.state === 'preparation') {
      lines.push(`🛡️ Jour ${day} vs ${opp} — Préparation`)
    }
  }

  if (futureStart !== null) {
    const last = rounds.length
    lines.push(futureStart === last
      ? `🔒 Jour ${futureStart} — À venir`
      : `🔒 Jours ${futureStart}-${last} — À venir`
    )
  }

  return lines.join('\n') || null
}

async function buildCombatEmbed(playerTag) {
  const embed = new EmbedBuilder()
    .setColor(0xFF6600)
    .setTitle('⚔️ Activité de combat')
    .setFooter({ text: 'Donjon Rouge • Combat' })
    .setTimestamp()

  const fields = []

  for (const [clanKey, ourTag] of [['dr1', DR1_TAG], ['dr2', DR2_TAG]]) {
    const war = await fetchWarForClan(clanKey)
    const inactive = !war || war.state === 'notInWar' || war.state === 'warEnded'

    if (!inactive) {
      const m = (war.clan?.members || []).find(m => m.tag === playerTag)
      if (m) {
        if (war.state === 'preparation') {
          fields.push({ name: `⚔️ GDC ${clanKey.toUpperCase()}`, value: '⏳ En préparation', inline: false })
        } else if (war.state === 'inWar') {
          const atks = m.attacks?.length ?? 0
          const stars = (m.attacks || []).reduce((s, a) => s + (a.stars ?? 0), 0)
          fields.push({ name: `⚔️ GDC ${clanKey.toUpperCase()}`, value: `${atks}/2 attaques — ⭐ ${stars}`, inline: false })
        }
      }
    } else {
      // Fallback LDC
      try {
        const ldc = await (clanKey === 'dr1' ? getLdcCurrent() : getLdcCurrentDR2())
        if (!ldc?.rounds) continue
        const lines = buildLdcRoundLines(ldc, playerTag, ourTag)
        if (lines) fields.push({ name: `🏆 LDC ${clanKey.toUpperCase()}`, value: lines.slice(0, 1024), inline: false })
      } catch {}
    }
  }

  // Raid Capital
  try {
    const raidData = await getRaidSeasons()
    const latest = raidData?.items?.[0]
    if (latest?.startTime) {
      const start = parseWarTime(latest.startTime) ?? new Date(latest.startTime)
      const end   = latest.endTime ? (parseWarTime(latest.endTime) ?? new Date(latest.endTime)) : null
      const isActive = start.getTime() > Date.now() - 7 * 24 * 3600000 && (!end || end.getTime() > Date.now())
      if (isActive) {
        const rm = (latest.members || []).find(m => m.tag === playerTag)
        if (rm) fields.push({ name: '💎 Raid Capital', value: `${rm.attacks ?? 0} attaques utilisées`, inline: false })
      }
    }
  } catch {}

  if (fields.length === 0) embed.setDescription('😴 Aucun combat en cours')
  else embed.addFields(fields)

  return embed
}

// ─── Embed 3 : Mes comptes ────────────────────────────────────────────────────

function buildAccountsEmbed(links) {
  const lines = (links || []).map(l =>
    `${l.is_primary ? '⭐' : '◦'} **${sanitizeName(l.coc_name)}** — \`${l.coc_tag}\``
  )
  return new EmbedBuilder()
    .setColor(0x1565C0)
    .setTitle('🔗 Mes comptes liés')
    .setDescription(lines.join('\n') || 'Aucun compte lié.')
    .setFooter({ text: 'Donjon Rouge • Comptes liés' })
    .setTimestamp()
}

function buildAccountsComponents(discordId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`warrior_change_principal:${discordId}`)
        .setLabel('⭐ Changer de principal')
        .setStyle(ButtonStyle.Secondary)
    ),
  ]
}

// ─── Minuterie 5 min (reset sur message ou interaction) ───────────────────────

function scheduleSpaceDeletion(channel, configKey) {
  const existing = activeSpaces.get(channel.id)
  if (existing?.timer) clearTimeout(existing.timer)

  const timer = setTimeout(async () => {
    await channel.delete().catch(() => {})
    await supabase.from('bot_config').delete().eq('key', configKey)
    activeSpaces.delete(channel.id)
    console.log(`[WarriorSpace] Supprimé (5min inactivité) : ${channel.id}`)
  }, 5 * 60 * 1000)

  activeSpaces.set(channel.id, { timer, configKey, channel })
}

function touchWarriorSpace(channelId) {
  const space = activeSpaces.get(channelId)
  if (space) scheduleSpaceDeletion(space.channel, space.configKey)
}

// ─── Création de l'espace guerrier ────────────────────────────────────────────

async function createWarriorSpace(member, client) {
  const discordId = member.id
  const configKey = `warrior_space_${discordId}`

  // Réutiliser le salon existant si toujours présent
  const { data: existing } = await supabase
    .from('bot_config').select('value').eq('key', configKey).maybeSingle()

  if (existing?.value) {
    const existingChannel = await client.channels.fetch(existing.value).catch(() => null)
    if (existingChannel) return existingChannel
    await supabase.from('bot_config').delete().eq('key', configKey)
  }

  const accountChannel = await client.channels.fetch(ACCOUNT_CHANNEL_ID).catch(() => null)
  if (!accountChannel) throw new Error('Salon #mon-compte introuvable.')

  const channelName = `⚔️・${member.user.username.toLowerCase().replace(/\s+/g, '-').slice(0, 90)}`

  const channel = await member.guild.channels.create({
    name: channelName,
    parent: accountChannel.parentId ?? null,
    permissionOverwrites: [
      { id: member.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
      {
        id: member.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
      },
      {
        id: client.user.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages],
      },
    ],
  })

  // Positionner juste après #mon-compte
  try { await channel.setPosition(accountChannel.position + 1) } catch {}

  await supabase.from('bot_config').upsert({ key: configKey, value: channel.id, updated_at: new Date().toISOString() })

  // Récupération des comptes liés
  const { data: links } = await supabase
    .from('discord_links')
    .select('coc_tag, coc_name, is_primary')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: true })

  const primary = (links || []).find(l => l.is_primary) ?? (links || [])[0]

  // Embed 1 — Profil
  if (primary) {
    let player = null
    try { player = await getPlayer(primary.coc_tag) } catch {}
    if (player) {
      await channel.send({
        embeds: [buildWarriorProfileEmbed(player, member)],
        components: buildNavComponents(player.tag, 'profil'),
      })
    }
  }

  // Embed 2 — Guerre & Raid
  await channel.send({ embeds: [await buildCombatEmbed(primary?.coc_tag ?? '')] })

  // Embed 3 — Mes comptes
  await channel.send({
    embeds: [buildAccountsEmbed(links || [])],
    components: buildAccountsComponents(discordId),
  })

  // Minuterie 5 min, reset sur chaque message utilisateur
  scheduleSpaceDeletion(channel, configKey)
  const collector = channel.createMessageCollector({ filter: m => !m.author.bot })
  collector.on('collect', () => touchWarriorSpace(channel.id))

  console.log(`[WarriorSpace] Créé pour ${member.user.username} : ${channel.id}`)
  return channel
}

// ─── Changement de principal depuis le warrior space ─────────────────────────

async function applyPrincipalChange(discordId, selectedTag, member) {
  await supabase.from('discord_links').update({ is_primary: false }).eq('discord_id', discordId)
  await supabase.from('discord_links').update({ is_primary: true }).eq('discord_id', discordId).eq('coc_tag', selectedTag)

  if (member) {
    ;(async () => {
      try {
        const player = await getPlayer(selectedTag)
        await assignLeagueRole(member, player?.leagueTier?.name)
      } catch {}
    })()
  }

  const { data: updated } = await supabase
    .from('discord_links')
    .select('coc_tag, coc_name, is_primary')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: true })

  return updated || []
}

module.exports = {
  createWarriorSpace,
  buildAccountsEmbed,
  buildAccountsComponents,
  applyPrincipalChange,
  touchWarriorSpace,
}
