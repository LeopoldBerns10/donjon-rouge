const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { forceRefresh } = require('../scheduler.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshstatus')
    .setDescription('Force un refresh immédiat du message de statut des combats')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await forceRefresh(interaction.client)
      await interaction.editReply('✅ Statut mis à jour.')
    } catch (e) {
      console.error('Erreur /refreshstatus:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  }
}
