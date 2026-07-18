const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { updateRappelEmbeds } = require('../lib/rappelEmbeds.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuprappels')
    .setDescription('(Re)poste les 6 embeds de rappel dans le salon rappels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      await updateRappelEmbeds(interaction.client)
      await interaction.editReply('✅ Embeds rappels postés.')
    } catch (e) {
      console.error('[setuprappels]', e)
      await interaction.editReply('❌ Erreur lors du setup.')
    }
  },
}
