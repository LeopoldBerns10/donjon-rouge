const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { sendReglementPublic } = require('../setup/sendReglementPublic.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupreglementpublic')
    .setDescription('Poste le règlement en lecture seule dans le salon public.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendReglementPublic(interaction.client)
      await interaction.editReply('✅ Règlement public posté et ID sauvegardé.')
    } catch (err) {
      console.error('[setupreglementpublic]', err)
      await interaction.editReply('❌ Impossible de poster le règlement public.')
    }
  },
}
