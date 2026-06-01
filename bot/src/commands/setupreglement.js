const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { sendReglement } = require('../setup/sendReglement.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupreglement')
    .setDescription('Envoie le règlement dans le salon dédié.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendReglement(interaction.client)
      await interaction.editReply('✅ Règlement envoyé dans le salon dédié.')
    } catch (err) {
      console.error('[setupreglement]', err)
      await interaction.editReply('❌ Impossible d\'envoyer le règlement.')
    }
  },
}
