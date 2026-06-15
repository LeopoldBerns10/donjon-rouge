const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { DR1_WAR_CHANNEL, DR2_WAR_CHANNEL } = require('../config/warChannels.js')
const { updateWarChannels, activateWarChannels, resetWarKeys } = require('../warMessages.js')

async function bulkDeleteAll(channel) {
  try { await channel.bulkDelete(100) } catch (e) {
    console.warn(`[RefreshWar] bulkDelete échoué sur ${channel.id}:`, e.message)
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshwar')
    .setDescription('Force un refresh immédiat des salons de guerre dédiés')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })
    try {
      const { client } = interaction

      const [dr1Channel, dr2Channel] = await Promise.all([
        client.channels.fetch(DR1_WAR_CHANNEL).catch(() => null),
        client.channels.fetch(DR2_WAR_CHANNEL).catch(() => null),
      ])

      if (dr1Channel) await bulkDeleteAll(dr1Channel)
      if (dr2Channel) await bulkDeleteAll(dr2Channel)

      await resetWarKeys(['dr1_war_msg1', 'dr1_war_msg2', 'dr2_war_msg1', 'dr2_war_msg2'])

      activateWarChannels()
      await updateWarChannels(client)

      await interaction.editReply('✅ Salons de guerre réinitialisés')
    } catch (e) {
      console.error('Erreur /refreshwar:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  }
}
