const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../../lib/isAdmin.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages dans le salon courant')
    .addIntegerOption(opt =>
      opt.setName('nombre')
        .setDescription('Nombre de messages à supprimer (défaut : 10)')
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    const nombre = interaction.options.getInteger('nombre') ?? 10
    await interaction.deferReply({ ephemeral: true })

    try {
      const deleted = await interaction.channel.bulkDelete(nombre)
      await interaction.editReply(`✅ ${deleted.size} messages supprimés.`)
    } catch (e) {
      console.warn('[Clear] Erreur bulkDelete (messages > 14 jours ?):', e.message)
      await interaction.editReply('⚠️ Certains messages n\'ont pas pu être supprimés (messages trop anciens ?).')
    }
  }
}
