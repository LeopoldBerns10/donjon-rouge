const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { sendKaptcha } = require('../setup/sendKaptcha.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupkaptcha')
    .setDescription('Envoie le message de vérification kaptcha dans le salon dédié.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      await sendKaptcha(interaction.client)
      await interaction.editReply('✅ Message kaptcha envoyé dans le salon vérification.')
    } catch (err) {
      console.error('[setupkaptcha]', err)
      await interaction.editReply('❌ Impossible d\'envoyer le message kaptcha.')
    }
  },
}
