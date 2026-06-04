const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { sendCommandsPanel } = require('../setup/sendCommandsPanel.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupcommands')
    .setDescription('Envoie le panneau des commandes dans le salon dédié.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendCommandsPanel(interaction.client)
      await interaction.editReply('✅ Panneau des commandes envoyé.')
    } catch (err) {
      console.error('[setupcommands]', err)
      await interaction.editReply('❌ Impossible d\'envoyer le panneau des commandes.')
    }
  },
}
