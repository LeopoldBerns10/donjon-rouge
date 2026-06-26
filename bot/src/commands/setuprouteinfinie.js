const { SlashCommandBuilder } = require('discord.js')
const supabase = require('../supabase.js')
const { buildPanelEmbed, buildPanelComponents, PANEL_CHANNEL_ID } = require('../lib/routeInfinie.js')

const CHEF_ROLE_ID = '611123759864348672'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setuprouteinfinie')
    .setDescription('[Admin] Poste le panel Route de l\'Infinie dans le salon admin.'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Réservé aux chefs.', ephemeral: true })
    }
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

    const state = await supabase
      .from('route_infinie')
      .select('*')
      .eq('active', true)
      .maybeSingle()
      .then(r => r.data)

    if (!state) {
      return interaction.editReply('❌ Aucune ligne active dans route_infinie. Lance la migration SQL d\'abord.')
    }

    const channel = await interaction.client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null)
    if (!channel) {
      return interaction.editReply(`❌ Salon panel introuvable (${PANEL_CHANNEL_ID}).`)
    }

    const msg = await channel.send({
      embeds: [buildPanelEmbed(state)],
      components: [buildPanelComponents()],
    })

    await supabase
      .from('bot_config')
      .upsert({ key: 'route_panel_msg_id', value: msg.id }, { onConflict: 'key' })

    await interaction.editReply('✅ Panel Route de l\'Infinie posté.')
  },
}
