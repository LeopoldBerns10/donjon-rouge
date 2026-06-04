const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { updateWarChannels, activateWarChannels } = require('../warMessages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshwar')
    .setDescription('Force un refresh immédiat des salons de guerre dédiés')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      activateWarChannels()
      await updateWarChannels(interaction.client)
      await interaction.editReply('✅ Salons de guerre mis à jour.')
    } catch (e) {
      console.error('Erreur /refreshwar:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  }
}
