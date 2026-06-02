const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { isAdmin } = require('../../lib/isAdmin.js')
const supabase = require('../../supabase.js')
const { getPlayer } = require('../../cocApi.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil-admin')
    .setDescription('Voir le profil complet d\'un membre (comptes liés, rôles, stats CoC)')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre Discord').setRequired(true)),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const target = interaction.options.getMember('membre')

    const { data: links } = await supabase
      .from('discord_links')
      .select('coc_tag, coc_name, is_primary')
      .eq('discord_id', target.id)
      .order('created_at', { ascending: true })

    const roles = [...target.roles.cache.values()]
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => r.name)
      .join(', ') || 'Aucun'

    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle(`🔍 Profil admin — ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '🪪 Discord ID', value: target.id, inline: true },
        { name: '📅 Rejoint le', value: target.joinedAt?.toLocaleDateString('fr-FR') ?? '?', inline: true },
        { name: '🎭 Rôles', value: roles, inline: false },
      )

    if (!links || links.length === 0) {
      embed.addFields({ name: '⚔️ Comptes CoC', value: 'Non lié ❌', inline: false })
      return interaction.editReply({ embeds: [embed] })
    }

    const primary = links.find(l => l.is_primary) ?? links[0]

    let statsField = ''
    try {
      const player = await getPlayer(primary.coc_tag)
      statsField = [
        `🏰 HDV ${player.townHallLevel}`,
        `🏆 ${player.trophies} trophées`,
        `⭐ ${player.warStars ?? 0} étoiles GDC`,
        `🏅 ${player.leagueTier?.name ?? player.league?.name ?? 'Sans ligue'}`,
      ].join(' • ')
    } catch {
      statsField = 'Impossible de récupérer les stats.'
    }

    const cocList = links
      .map(l => `${l.is_primary ? '⭐' : '▪️'} **${l.coc_name}** (${l.coc_tag})`)
      .join('\n')

    embed.addFields(
      { name: '⚔️ Comptes CoC', value: cocList, inline: false },
      { name: '📊 Stats principal', value: statsField, inline: false },
    )

    await interaction.editReply({ embeds: [embed] })
  },
}
