const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { RAID_CHANNEL } = require('../config/warChannels.js')
const { updateWarChannels, activateWarChannels, resetWarKeys } = require('../warMessages.js')
const supabase = require('../supabase.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshraid')
    .setDescription('Recrée l\'embed Raid Capital dans le salon event-clan')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })
    try {
      const { client } = interaction

      const { data } = await supabase.from('bot_config').select('value').eq('key', 'raid_msg').maybeSingle()
      if (data?.value) {
        const channel = await client.channels.fetch(RAID_CHANNEL).catch(() => null)
        if (channel) {
          try {
            const msg = await channel.messages.fetch(data.value)
            await msg.delete()
            console.log(`[refreshraid] Message raid_msg supprimé (${data.value})`)
          } catch {}
        }
      }

      await resetWarKeys(['raid_msg'])
      activateWarChannels()
      await updateWarChannels(client)
      await interaction.editReply('✅ Embed Raid recréé.')
    } catch (e) {
      console.error('Erreur /refreshraid:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  }
}
