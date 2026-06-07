const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../../lib/isAdmin.js')
const { ACCOUNT_CHANNEL_ID, REMINDER_CHANNEL_ID } = require('../../config/reminders.js')
const { DR1_WAR_CHANNEL, DR2_WAR_CHANNEL, RAID_CHANNEL } = require('../../config/warChannels.js')
const { TICKET_CHANNEL_ID } = require('../../config/tickets.js')
const { CHANNELS } = require('../../config/onboarding.js')
const { getOrCreateAccountMessage } = require('../../accountMessage.js')
const { resetStatus, forceRefresh } = require('../../scheduler.js')
const { updateEventsMessage, resetEventsMessage, EVENTS_CHANNEL_ID } = require('../../setup/sendEventsPanel.js')
const { sendCommandsPanel, COMMANDS_CHANNEL_ID } = require('../../setup/sendCommandsPanel.js')
const { updateWarChannels, activateWarChannels, resetWarKeys } = require('../../warMessages.js')
const { sendTicketMessage } = require('../../setup/sendTicketMessage.js')
const { sendKaptcha } = require('../../setup/sendKaptcha.js')
const { sendReglement } = require('../../setup/sendReglement.js')

async function bulkDeleteAll(channel) {
  try { await channel.bulkDelete(100) } catch (e) {
    console.warn(`[Reset] bulkDelete échoué sur ${channel.id}:`, e.message)
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Réinitialise le salon courant selon son type')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    if (!await isAdmin(interaction.member)) {
      return interaction.editReply({ content: '❌ Accès refusé.' })
    }

    const { channelId, channel, client } = interaction

    try {
      if (channelId === ACCOUNT_CHANNEL_ID) {
        await bulkDeleteAll(channel)
        await getOrCreateAccountMessage(client)

      } else if (channelId === REMINDER_CHANNEL_ID) {
        await bulkDeleteAll(channel)
        await resetStatus()
        await forceRefresh(client)

      } else if (channelId === DR1_WAR_CHANNEL) {
        await bulkDeleteAll(channel)
        await resetWarKeys(['dr1_war_msg1', 'dr1_war_msg2', 'dr1_war_msg3'])
        activateWarChannels()
        await updateWarChannels(client)

      } else if (channelId === DR2_WAR_CHANNEL) {
        await bulkDeleteAll(channel)
        await resetWarKeys(['dr2_war_msg1', 'dr2_war_msg2', 'dr2_war_msg3'])
        activateWarChannels()
        await updateWarChannels(client)

      } else if (channelId === RAID_CHANNEL) {
        await bulkDeleteAll(channel)
        await resetWarKeys(['raid_msg'])
        activateWarChannels()
        await updateWarChannels(client)

      } else if (channelId === TICKET_CHANNEL_ID) {
        await bulkDeleteAll(channel)
        await sendTicketMessage(client)

      } else if (channelId === CHANNELS.VERIFICATION) {
        await bulkDeleteAll(channel)
        await sendKaptcha(client)

      } else if (channelId === CHANNELS.REGLEMENT) {
        await bulkDeleteAll(channel)
        await sendReglement(client)

      } else if (channelId === EVENTS_CHANNEL_ID) {
        await bulkDeleteAll(channel)
        await resetEventsMessage()
        await updateEventsMessage(client)

      } else if (channelId === COMMANDS_CHANNEL_ID) {
        await bulkDeleteAll(channel)
        await sendCommandsPanel(client)

      } else {
        return interaction.editReply('❌ Ce salon n\'a pas de reset configuré.')
      }

      await interaction.editReply('✅ Salon réinitialisé.')
    } catch (e) {
      console.error('Erreur /reset:', e)
      await interaction.editReply('❌ Erreur lors de la réinitialisation.')
    }
  }
}
