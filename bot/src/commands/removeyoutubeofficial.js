const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType } = require('discord.js')
const supabase = require('../supabase.js')

const CHEF_ROLE_ID = '611123759864348672'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removeyoutubeofficial')
    .setDescription('Retire une chaîne du suivi officiel YouTube (Chef uniquement)'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const { data: follows } = await supabase
      .from('youtube_follows_official')
      .select('channel_id')

    if (!follows?.length) {
      return interaction.editReply('❌ Aucune chaîne officielle n\'est suivie pour le moment.')
    }

    const { data: channels } = await supabase
      .from('youtube_channels')
      .select('channel_id, channel_name')
      .in('channel_id', follows.map(f => f.channel_id))

    if (!channels?.length) {
      return interaction.editReply('❌ Aucune chaîne officielle n\'est suivie pour le moment.')
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('youtube_official_remove_select')
      .setPlaceholder('Chaîne à retirer')
      .addOptions(channels.map(c =>
        new StringSelectMenuOptionBuilder()
          .setLabel(c.channel_name.slice(0, 100))
          .setValue(c.channel_id)
      ))

    const response = await interaction.editReply({
      content: 'Quelle chaîne veux-tu retirer des suivis officiels ?',
      components: [new ActionRowBuilder().addComponents(select)],
    })

    let collected
    try {
      collected = await response.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: i => i.user.id === interaction.user.id,
        time: 30_000,
      })
    } catch {
      return interaction.editReply({ content: 'Temps écoulé.', components: [] })
    }

    await collected.deferUpdate()

    const channelId = collected.values[0]
    const selected = channels.find(c => c.channel_id === channelId)

    await supabase
      .from('youtube_follows_official')
      .delete()
      .eq('channel_id', channelId)

    await interaction.editReply({
      content: `✅ Chaîne **${selected?.channel_name ?? channelId}** retirée des suivis officiels.`,
      components: [],
    })
  },
}
