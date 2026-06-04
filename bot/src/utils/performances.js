const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')
const { getPlayer } = require('../cocApi.js')

// ─── Timer de suppression (navigation) ───────────────────────────────────────

const navTimers = new Map()

function resetNavTimer(message, timeout = 10 * 60 * 1000) {
  const existing = navTimers.get(message.id)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    message.delete().catch(() => {})
    navTimers.delete(message.id)
  }, timeout)
  navTimers.set(message.id, timer)
}

// ─── Couleur et formatage ─────────────────────────────────────────────────────

function getLeagueColor(leagueName) {
  if (!leagueName) return 0x8B0000
  const n = leagueName.toLowerCase()
  if (n.includes('legend'))    return 0xFFD700
  if (n.includes('titan'))     return 0xF0A500
  if (n.includes('champion'))  return 0x3498DB
  if (n.includes('master'))    return 0x9B59B6
  if (n.includes('crystal'))   return 0x1ABC9C
  if (n.includes('gold'))      return 0xDAA520
  if (n.includes('silver'))    return 0xAAAAAA
  if (n.includes('bronze'))    return 0xCD7F32
  return 0x8B0000
}

function formatRole(role) {
  const map = { leader: '👑 Chef', coLeader: '⚜️ Co-chef', admin: '🛡️ Ancien', member: '⚔️ Membre' }
  return map[role] ?? role ?? '-'
}

// ─── Embed joueur ─────────────────────────────────────────────────────────────

function buildPlayerEmbed(player, discordId) {
  const leagueName = player.leagueTier?.name ?? player.league?.name ?? 'Aucune ligue'
  const leagueIcon = player.leagueTier?.iconUrls?.medium ?? player.league?.iconUrls?.medium ?? null
  const clanName   = player.clan?.name ?? 'Sans clan'
  const clanBadge  = player.clan?.badgeUrls?.small ?? null

  const embed = new EmbedBuilder()
    .setColor(getLeagueColor(leagueName))
    .setTitle(`⚔️ ${player.name}`)
    .setAuthor(clanBadge ? { name: clanName, iconURL: clanBadge } : { name: clanName })
    .addFields(
      { name: '🏰 HDV',               value: String(player.townHallLevel ?? '?'), inline: true },
      { name: '🏅 Ligue',             value: leagueName,                          inline: true },
      { name: '🏆 Trophées',          value: String(player.trophies ?? 0),        inline: true },
      { name: '​',               value: '​',                            inline: false },
      { name: '⭐ Étoiles de guerre',  value: String(player.warStars ?? 0),        inline: true },
      { name: '🎁 Donations',         value: String(player.donations ?? 0),       inline: true },
      { name: '🎖️ Rôle',             value: formatRole(player.role),             inline: true },
      { name: '💬 Discord',           value: discordId ? `<@${discordId}>` : 'Non lié ❌', inline: false },
    )
    .setFooter({ text: 'Donjon Rouge • Profil CoC' })
    .setTimestamp()

  if (leagueIcon) embed.setThumbnail(leagueIcon)

  return embed
}

// ─── Boutons de navigation ────────────────────────────────────────────────────

function buildNavComponents(tag, current) {
  const mk = (customId, label, style) => new ButtonBuilder()
    .setCustomId(customId).setLabel(label).setStyle(style)
  const buttons = []
  if (current !== 'heros')   buttons.push(mk(`stats_heros:${tag}`,   '⚔️ Héros',    ButtonStyle.Danger))
  if (current !== 'sorts')   buttons.push(mk(`stats_sorts:${tag}`,   '🪄 Sorts',    ButtonStyle.Primary))
  if (current !== 'troupes') buttons.push(mk(`stats_troupes:${tag}`, '🏹 Troupes',  ButtonStyle.Success))
  if (current !== 'profil')  buttons.push(mk(`stats_profil:${tag}`,  '↩️ Retour',   ButtonStyle.Secondary))
  return [new ActionRowBuilder().addComponents(buttons)]
}

// ─── Handler mes_performances ─────────────────────────────────────────────────

async function handleMesPerformances(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply()

  const { data: links } = await supabase
    .from('discord_links')
    .select('coc_tag, coc_name, is_primary')
    .eq('discord_id', interaction.user.id)
    .order('created_at', { ascending: true })

  if (!links || links.length === 0) {
    return interaction.editReply({ content: '❌ Aucun compte lié. Utilise `/lier` pour associer ton compte COC.' })
  }

  const primary = links.find(l => l.is_primary) ?? links[0]

  let player
  try {
    player = await getPlayer(primary.coc_tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.' })
  }

  const msg = await interaction.editReply({
    embeds: [buildPlayerEmbed(player, interaction.user.id)],
    components: buildNavComponents(player.tag, 'profil'),
  })
  resetNavTimer(msg)
}

module.exports = { buildPlayerEmbed, buildNavComponents, resetNavTimer, handleMesPerformances }
