const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const supabase = require('../supabase.js')
const { fetchLatestVideo, fetchChannelName } = require('../lib/youtubeTracker.js')

const CHEF_ROLE_ID = '611123759864348672'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testyoutube')
    .setDescription('Test RSS d\'une chaîne YouTube sans notifier ni modifier la base (Chef uniquement)')
    .addStringOption(opt => opt
      .setName('channel_id')
      .setDescription('ID YouTube de la chaîne (format UCxxxx)')
      .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
    }

    await interaction.deferReply()

    const channelId = interaction.options.getString('channel_id').trim()

    const [latest, channelName] = await Promise.all([
      fetchLatestVideo(channelId),
      fetchChannelName(channelId),
    ])

    if (!latest) {
      return interaction.editReply(
        `❌ Impossible de lire le flux RSS pour \`${channelId}\`.\n` +
        `Vérifie que l'ID est correct (format \`UCxxxx\`) et que la chaîne a des vidéos publiques.`
      )
    }

    const { data: stored } = await supabase
      .from('youtube_channels')
      .select('last_video_id')
      .eq('channel_id', channelId)
      .maybeSingle()

    const isNew = stored ? latest.videoId !== stored.last_video_id : null

    const statusLine = stored === null
      ? '⚪ **Chaîne non enregistrée en base** (aucun suivi actif)'
      : isNew
        ? `🔴 **Nouvelle vidéo** — différente du \`last_video_id\` en base (\`${stored.last_video_id}\`)`
        : `✅ **Vidéo déjà connue** — correspond au \`last_video_id\` en base`

    const embed = new EmbedBuilder()
      .setColor(isNew === true ? 0xFF0000 : isNew === false ? 0x2E7D32 : 0x808080)
      .setTitle(`📺 Test RSS — ${channelName}`)
      .addFields(
        { name: 'Chaîne', value: `\`${channelId}\``, inline: true },
        { name: 'Dernière vidéo (RSS)', value: latest.title || '*(titre vide)*', inline: false },
        { name: 'Lien', value: latest.link, inline: false },
        { name: 'Video ID (RSS)', value: `\`${latest.videoId}\``, inline: true },
        { name: 'Statut', value: statusLine, inline: false },
      )
      .setFooter({ text: 'Mode test — aucune notification envoyée, base non modifiée' })
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  },
}
