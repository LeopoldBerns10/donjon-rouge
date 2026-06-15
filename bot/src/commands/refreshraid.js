const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { RAID_CHANNEL } = require('../config/warChannels.js')
const { updateWarChannels, activateWarChannels, resetWarKeys } = require('../warMessages.js')

async function bulkDeleteAll(channel) {
  try { await channel.bulkDelete(100) } catch (e) {
    console.warn(`[RefreshRaid] bulkDelete échoué sur ${channel.id}:`, e.message)
  }
}

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

      const raidChannel = await client.channels.fetch(RAID_CHANNEL).catch(() => null)
      if (raidChannel) await bulkDeleteAll(raidChannel)

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
