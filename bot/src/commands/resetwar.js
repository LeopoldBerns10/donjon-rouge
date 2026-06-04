const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { updateWarChannels, resetWarMessages, activateWarChannels } = require('../warMessages.js')
const { DR1_WAR_CHANNEL, DR2_WAR_CHANNEL, RAID_CHANNEL } = require('../config/warChannels.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetwar')
    .setDescription('Supprime et recrée les messages de guerre dans les salons dédiés')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    try {
      // Supprime physiquement tous les messages dans les salons de guerre
      for (const channelId of [DR1_WAR_CHANNEL, DR2_WAR_CHANNEL, RAID_CHANNEL]) {
        try {
          const channel = await interaction.client.channels.fetch(channelId).catch(() => null)
          if (channel) await channel.bulkDelete(10).catch(() => {})
        } catch {}
      }

      // Vide les IDs Supabase + cache mémoire, puis recrée
      await resetWarMessages()
      activateWarChannels()
      await updateWarChannels(interaction.client)
      await interaction.editReply('✅ Messages de guerre réinitialisés.')
    } catch (e) {
      console.error('Erreur /resetwar:', e)
      await interaction.editReply('❌ Erreur lors de la réinitialisation.')
    }
  }
}
