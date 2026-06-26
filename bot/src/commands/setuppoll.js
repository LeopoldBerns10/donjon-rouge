const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { sendPollPanel } = require('../setup/sendPollPanel.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuppoll')
    .setDescription('Poste le panel sondages dans le salon dédié')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendPollPanel(interaction.client)
      await interaction.editReply('✅ Panel sondages posté.')
    } catch (e) {
      console.error('[setuppoll]', e)
      await interaction.editReply('❌ Erreur lors du setup.')
    }
  },
}
