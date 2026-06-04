const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { sendMessagingPanel } = require('../setup/sendMessagingPanel.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupmessaging')
    .setDescription('Crée ou recrée le panneau de messagerie ciblée')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendMessagingPanel(interaction.client)
      await interaction.editReply('✅ Panneau de messagerie créé.')
    } catch (e) {
      console.error('[setupmessaging]', e)
      await interaction.editReply('❌ Erreur lors de la création du panneau.')
    }
  },
}
