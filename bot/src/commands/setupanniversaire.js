const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { sendBirthdayPanel } = require('../setup/sendBirthdayPanel.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupanniversaire')
    .setDescription('Poste le panel anniversaire dans le salon dédié')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendBirthdayPanel(interaction.client)
      await interaction.editReply('✅ Panel anniversaire posté.')
    } catch (e) {
      console.error('[setupanniversaire]', e)
      await interaction.editReply('❌ Erreur lors du setup.')
    }
  },
}
