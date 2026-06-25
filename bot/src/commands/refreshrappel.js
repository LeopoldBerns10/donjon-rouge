const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { REMINDER_CHANNEL_ID } = require('../config/reminders.js')
const { updateReminderMessages, resetStatus } = require('../scheduler.js')
const { updateJdcEmbeds, isJdcActive } = require('../lib/jdcTracker.js')

async function bulkDeleteAll(channel) {
  try { await channel.bulkDelete(100) } catch (e) {
    console.warn(`[RefreshRappel] bulkDelete échoué sur ${channel.id}:`, e.message)
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshrappel')
    .setDescription('Force un refresh des 3 messages de rappel (DR1, DR2, Raid Capital)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })
    try {
      const { client } = interaction

      const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
      if (channel) await bulkDeleteAll(channel)

      await resetStatus()
      await updateReminderMessages(client)
      console.log('[refreshrappel] jdc_active =', await isJdcActive())
      console.log('[refreshrappel] Appel updateJdcEmbeds...')
      try {
        await updateJdcEmbeds(client)
        console.log('[refreshrappel] updateJdcEmbeds terminé')
      } catch (e) {
        console.error('[refreshrappel] Erreur updateJdcEmbeds :', e)
      }

      await interaction.editReply('✅ Rappels réinitialisés')
    } catch (e) {
      console.error('Erreur /refreshrappel:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  },
}
