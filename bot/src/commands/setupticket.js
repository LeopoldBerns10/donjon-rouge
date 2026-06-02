const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { sendTicketMessage } = require('../setup/sendTicketMessage.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupticket')
    .setDescription('Envoie le message d\'ouverture de ticket dans le salon dédié.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendTicketMessage(interaction.client)
      await interaction.editReply('✅ Message de ticket envoyé dans le salon dédié.')
    } catch (err) {
      console.error('[setupticket]', err)
      await interaction.editReply('❌ Impossible d\'envoyer le message de ticket.')
    }
  },
}
