const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { updateWarChannels, activateWarChannels, resetWarKeys } = require('../warMessages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshraid')
    .setDescription('Force un refresh immédiat du salon raid capital')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })
    try {
      const { client } = interaction

      await resetWarKeys(['raid_msg'])

      activateWarChannels()
      await updateWarChannels(client)

      await interaction.editReply('✅ Salon raid réinitialisé')
    } catch (e) {
      console.error('Erreur /refreshraid:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  }
}
