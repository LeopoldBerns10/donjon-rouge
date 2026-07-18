const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { postSauronPanel } = require('../lib/panelSauron.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuppanel')
    .setDescription('(Re)poste le panel Sauron dans le salon admin')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      await postSauronPanel(interaction.client)
      await interaction.editReply('✅ Panel Sauron posté.')
    } catch (e) {
      console.error('[setuppanel]', e)
      await interaction.editReply('❌ Erreur lors du setup.')
    }
  },
}
