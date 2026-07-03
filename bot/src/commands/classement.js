const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const supabase = require('../supabase.js')
const { getParticipationRate } = require('../lib/participationStats.js')

const ROLE_LIE = '1511096527664320655'
const MEDALS   = ['🥇', '🥈', '🥉']

function getSince(periode) {
  if (periode === 'semaine') return new Date(Date.now() - 7 * 24 * 3600000).toISOString().split('T')[0]
  if (periode === 'mois')    return new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0]
  return null
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Classement des membres les plus actifs')
    .addStringOption(opt =>
      opt.setName('periode')
        .setDescription('Période à considérer (défaut : mois)')
        .setRequired(false)
        .addChoices(
          { name: 'Semaine (7 jours)',  value: 'semaine' },
          { name: 'Mois (30 jours)',    value: 'mois'    },
          { name: 'Total (historique)', value: 'total'   },
        )
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(ROLE_LIE)) {
      return interaction.reply({
        content: '❌ Cette commande est réservée aux membres liés au clan.',
        ephemeral: true,
      })
    }

    await interaction.deferReply({ ephemeral: true })

    const periode = interaction.options.getString('periode') ?? 'mois'
    const since   = getSince(periode)

    const periodeLabel = {
      semaine: '7 derniers jours',
      mois:    '30 derniers jours',
      total:   'historique complet',
    }[periode]

    const { data: links } = await supabase
      .from('discord_links')
      .select('discord_id, coc_name')
      .eq('is_primary', true)

    if (!links?.length) {
      return interaction.editReply('❌ Aucun membre lié trouvé.')
    }

    const results = []
    for (const link of links) {
      try {
        const stats = await getParticipationRate(link.discord_id, { since })
        if (stats.totalEvents > 0) {
          results.push({ discordId: link.discord_id, name: link.coc_name, ...stats })
        }
      } catch {}
    }

    if (results.length === 0) {
      return interaction.editReply('Pas encore assez de données pour cette période.')
    }

    results.sort((a, b) => b.rate - a.rate || b.participated - a.participated)
    const top10 = results.slice(0, 10)

    const lines = top10.map((u, i) => {
      const medal   = MEDALS[i]
      const mention = `<@${u.discordId}>`
      const prefix  = medal ? `${medal} ${mention}` : `${i + 1}. ${mention}`
      return `${prefix} — **${u.rate}%** (${u.participated}/${u.totalEvents} événements)`
    }).join('\n')

    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle(`🏆 CLASSEMENT — Donjon Rouge (${periodeLabel})`)
      .setDescription(lines)
      .setFooter({ text: 'Basé sur GDC + JDC combinés' })
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })
  },
}
