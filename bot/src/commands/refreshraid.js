const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { REMINDER_CHANNEL_ID } = require('../config/reminders.js')
const { updateReminderMessages } = require('../scheduler.js')
const supabase = require('../supabase.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshraid')
    .setDescription('Recrée l\'embed Raid Capital dans le salon rappels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })
    try {
      const { client } = interaction

      const { data } = await supabase.from('bot_config').select('value').eq('key', 'reminder_raid_msg').maybeSingle()
      if (data?.value) {
        const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
        if (channel) {
          try {
            const msg = await channel.messages.fetch(data.value)
            await msg.delete()
            console.log(`[refreshraid] Message reminder_raid_msg supprimé (${data.value})`)
          } catch {}
        }
        await supabase.from('bot_config').delete().eq('key', 'reminder_raid_msg')
      }

      await updateReminderMessages(client)
      await interaction.editReply('✅ Embed Raid recréé.')
    } catch (e) {
      console.error('Erreur /refreshraid:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  }
}
