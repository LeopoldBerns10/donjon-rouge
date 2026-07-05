const { SlashCommandBuilder } = require('discord.js')
const supabase = require('../supabase.js')
const { resolveChannelId, ensureChannel } = require('../lib/youtubeTracker.js')

const CHEF_ROLE_ID = '611123759864348672'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addyoutubeofficial')
    .setDescription('Ajoute une chaîne YouTube au suivi officiel (Chef uniquement)')
    .addStringOption(opt => opt
      .setName('lien')
      .setDescription('Lien de la chaîne YouTube')
      .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const url = interaction.options.getString('lien').trim()

    const channelId = await resolveChannelId(url)
    if (!channelId) {
      return interaction.editReply('❌ Lien non reconnu. Utilise un lien de chaîne YouTube valide.')
    }

    const { data: already } = await supabase
      .from('youtube_follows_official')
      .select('id')
      .eq('channel_id', channelId)
      .maybeSingle()

    if (already) {
      return interaction.editReply('❌ Cette chaîne est déjà dans les suivis officiels.')
    }

    const chData = await ensureChannel(channelId, url)

    await supabase.from('youtube_follows_official').insert({
      channel_id: channelId,
      added_by:   interaction.user.id,
    })

    const { data: cfg } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'youtube_official_channel_id')
      .maybeSingle()

    const channelMention = cfg?.value ? `<#${cfg.value}>` : '*(salon officiel non configuré — utilise bot_config)*'

    await interaction.editReply(
      `✅ Chaîne **${chData.channel_name ?? channelId}** ajoutée aux suivis officiels.\n` +
      `Les nouvelles vidéos seront postées dans ${channelMention}.`
    )
  },
}
