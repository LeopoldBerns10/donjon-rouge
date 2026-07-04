const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { updateReminderMessages, resetStatus } = require('../scheduler.js')
const { updateRappelEmbeds } = require('../lib/rappelManager.js')
const supabase = require('../supabase.js')

const RAPPEL_CHANNEL_ID = '1510972919407317142'
const RAPPEL_KEYS = [
  'reminder_dr1_msg', 'reminder_dr2_msg', 'reminder_raid_msg',
  'rappel_embed_jdc_id',
  'rappel_ping_dr1_id', 'rappel_ping_dr2_id',
]

async function deleteRappelMessages(client) {
  const { data: rows } = await supabase
    .from('bot_config')
    .select('key, value')
    .in('key', RAPPEL_KEYS)

  if (!rows?.length) return

  const channel = await client.channels.fetch(RAPPEL_CHANNEL_ID).catch(() => null)
  if (channel) {
    for (const { key, value } of rows) {
      try {
        const msg = await channel.messages.fetch(value)
        await msg.delete()
        console.log(`[refreshrappel] Message ${key} supprimé (${value})`)
      } catch {}
    }
  }

  await supabase.from('bot_config').delete().in('key', RAPPEL_KEYS)
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshrappel')
    .setDescription('Force un refresh complet des rappels (embeds liste)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })
    try {
      const { client } = interaction

      await deleteRappelMessages(client)
      await resetStatus()
      await updateReminderMessages(client)

      try {
        await updateRappelEmbeds(client)
        console.log('[refreshrappel] updateRappelEmbeds exécuté avec succès')
      } catch (e) {
        console.error('[refreshrappel] Erreur updateRappelEmbeds :', e)
      }

      await interaction.editReply('✅ Rappels réinitialisés')
    } catch (e) {
      console.error('Erreur /refreshrappel:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  },
}
