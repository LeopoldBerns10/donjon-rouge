const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { getCurrentWar } = require('../cocApi.js')

const STATE_FR = {
  notInWar:    'Pas en guerre',
  preparation: 'Préparation',
  inWar:       'En cours',
  warEnded:    'Terminée'
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guerre')
    .setDescription('Affiche la guerre en cours du Donjon Rouge'),

  async execute(interaction) {
    await interaction.deferReply()

    try {
      const war = await getCurrentWar()

      if (war.state === 'notInWar') {
        return interaction.editReply('Le clan n\'est pas en guerre actuellement.')
      }

      const us   = war.clan
      const them = war.opponent
      const color = war.state === 'inWar' ? 0xE74C3C : 0x95A5A6

      const embed = new EmbedBuilder()
        .setTitle(`⚔️  ${us.name}  vs  ${them.name}`)
        .setColor(color)
        .addFields(
          { name: 'État',       value: STATE_FR[war.state] ?? war.state, inline: true },
          { name: 'Taille',     value: `${war.teamSize}v${war.teamSize}`, inline: true },
          { name: '​',     value: '​',                          inline: true },
          { name: us.name,   value: `⭐ ${us.stars}   ${us.destructionPercentage.toFixed(1)}%`,   inline: true },
          { name: them.name, value: `⭐ ${them.stars}   ${them.destructionPercentage.toFixed(1)}%`, inline: true },
        )
        .setFooter({ text: 'Donjon Rouge' })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch {
      await interaction.editReply('Impossible de récupérer la guerre (journal privé ou erreur API).')
    }
  }
}
