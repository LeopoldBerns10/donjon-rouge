const { SlashCommandBuilder } = require('discord.js')
const { isAdmin } = require('../../lib/isAdmin.js')
const { ADMIN_CHANNEL_ID } = require('../../config/admin.js')
const supabase = require('../../supabase.js')
const { buildHomePayload } = require('../../lib/panelHandlers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Panneau d\'administration du bot'),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }
    if (interaction.channelId !== ADMIN_CHANNEL_ID) {
      return interaction.reply({ content: `❌ Cette commande doit être utilisée dans <#${ADMIN_CHANNEL_ID}>.`, ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const payload = await buildHomePayload()

    // Essayer d'éditer le message panel existant
    const { data } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'admin_panel_message_id')
      .maybeSingle()

    if (data?.value) {
      try {
        const channel = await interaction.client.channels.fetch(ADMIN_CHANNEL_ID)
        const msg = await channel.messages.fetch(data.value)
        await msg.edit(payload)
        return interaction.editReply('✅ Panel mis à jour.')
      } catch {
        // Message introuvable, on en crée un nouveau
      }
    }

    const channel = await interaction.client.channels.fetch(ADMIN_CHANNEL_ID)
    const msg = await channel.send(payload)
    await supabase.from('bot_config').upsert({
      key: 'admin_panel_message_id',
      value: msg.id,
      updated_at: new Date().toISOString(),
    })
    await interaction.editReply('✅ Panel créé.')
  },
}
