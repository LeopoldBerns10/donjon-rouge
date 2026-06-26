const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { REMINDER_CHANNEL_ID } = require('../config/reminders.js')
const { updateReminderMessages, resetStatus } = require('../scheduler.js')
const { updateJdcEmbeds } = require('../lib/jdcTracker.js')
const { updateRappelEmbeds, sendRappelPings } = require('../lib/rappelManager.js')

async function bulkDeleteAll(channel) {
  try { await channel.bulkDelete(100) } catch (e) {
    console.warn(`[RefreshRappel] bulkDelete échoué sur ${channel.id}:`, e.message)
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshrappel')
    .setDescription('Force un refresh complet des rappels (embeds liste + pings mentions)')
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

      try {
        await updateJdcEmbeds(client)
      } catch (e) {
        console.error('[refreshrappel] Erreur updateJdcEmbeds :', e)
      }

      try {
        await updateRappelEmbeds(client)
      } catch (e) {
        console.error('[refreshrappel] Erreur updateRappelEmbeds :', e)
      }

      try {
        await sendRappelPings(client)
      } catch (e) {
        console.error('[refreshrappel] Erreur sendRappelPings :', e)
      }

      await interaction.editReply('✅ Rappels réinitialisés')
    } catch (e) {
      console.error('Erreur /refreshrappel:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  },
}
