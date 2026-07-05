const { SlashCommandBuilder } = require('discord.js')
const { sendYoutubePanel } = require('../setup/sendYoutubePanel.js')
const supabase = require('../supabase.js')

const CHEF_ROLE_ID = '611123759864348672'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupyoutubepanel')
    .setDescription('Poste le panel suivi YouTube dans un salon (Chef uniquement)')
    .addChannelOption(opt => opt
      .setName('salon')
      .setDescription('Salon où poster le panel')
      .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const channel = interaction.options.getChannel('salon')

    await supabase.from('bot_config').upsert({
      key:        'youtube_panel_channel_id',
      value:      channel.id,
      updated_at: new Date().toISOString(),
    })

    try {
      await sendYoutubePanel(interaction.client, channel.id)
      await interaction.editReply(`✅ Panel YouTube posté dans ${channel}.`)
    } catch (e) {
      console.error('[setupyoutubepanel]', e)
      await interaction.editReply('❌ Erreur lors du setup.')
    }
  },
}
