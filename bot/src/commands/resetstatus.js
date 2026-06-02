const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { resetStatus, forceRefresh } = require('../scheduler.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetstatus')
    .setDescription('Supprime le message de statut existant et en crée un nouveau.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      await resetStatus()
      await forceRefresh(interaction.client)
      await interaction.editReply('✅ Message de statut réinitialisé et recréé.')
    } catch (err) {
      console.error('[resetstatus]', err)
      await interaction.editReply('❌ Erreur lors de la réinitialisation.')
    }
  },
}
