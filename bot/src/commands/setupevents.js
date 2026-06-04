const { SlashCommandBuilder } = require('discord.js')
const { buildEventsEmbed } = require('../setup/sendEventsPanel.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('Affiche les prochains événements Clash of Clans.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      const embed = await buildEventsEmbed()
      await interaction.editReply({ embeds: [embed] })
    } catch (err) {
      console.error('[events]', err)
      await interaction.editReply('❌ Impossible de récupérer les événements.')
    }
  },
}
