const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js')
const supabase = require('../supabase.js')
const { resolveChannelId, ensureChannel, ensureMemberChannel } = require('./youtubeTracker.js')

// ─── Bouton : ouvre la modal "Ajouter suivi" ──────────────────────────────────

async function handleYoutubeAddFollow(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_youtube_add_follow')
    .setTitle('Ajouter un suivi YouTube')

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('youtube_channel_url')
        .setLabel('Lien de la chaîne YouTube')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('https://www.youtube.com/@NomChaine')
    )
  )

  await interaction.showModal(modal)
}

// ─── Bouton : affiche le menu de suppression ──────────────────────────────────

async function handleYoutubeRemoveFollow(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const { data: follows } = await supabase
    .from('youtube_follows_member')
    .select('channel_id')
    .eq('discord_id', interaction.user.id)

  if (!follows?.length) {
    return interaction.editReply('❌ Tu ne suis aucune chaîne pour le moment.')
  }

  const { data: channels } = await supabase
    .from('youtube_channels')
    .select('channel_id, channel_name')
    .in('channel_id', follows.map(f => f.channel_id))

  if (!channels?.length) {
    return interaction.editReply('❌ Tu ne suis aucune chaîne pour le moment.')
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('youtube_remove_select')
    .setPlaceholder('Choisis la chaîne à retirer')
    .addOptions(channels.map(c =>
      new StringSelectMenuOptionBuilder()
        .setLabel(c.channel_name.slice(0, 100))
        .setValue(c.channel_id)
    ))

  await interaction.editReply({
    content: 'Quelle chaîne veux-tu arrêter de suivre ?',
    components: [new ActionRowBuilder().addComponents(select)],
  })
}

// ─── Modal submit : valide et ajoute le suivi ─────────────────────────────────

async function handleModalYoutubeAddFollow(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const url = interaction.fields.getTextInputValue('youtube_channel_url').trim()

  const { count } = await supabase
    .from('youtube_follows_member')
    .select('*', { count: 'exact', head: true })
    .eq('discord_id', interaction.user.id)

  if (count >= 5) {
    return interaction.editReply('❌ Tu suis déjà 5 chaînes, retire-en une pour en ajouter une nouvelle.')
  }

  const channelId = await resolveChannelId(url)
  if (!channelId) {
    return interaction.editReply(
      '❌ Lien non reconnu. Colle un lien de chaîne YouTube valide (ex: `https://www.youtube.com/@NomChaine`).'
    )
  }

  const { data: alreadyFollowing } = await supabase
    .from('youtube_follows_member')
    .select('id')
    .eq('discord_id', interaction.user.id)
    .eq('channel_id', channelId)
    .maybeSingle()

  if (alreadyFollowing) {
    return interaction.editReply('❌ Tu suis déjà cette chaîne.')
  }

  const chData = await ensureChannel(channelId, url)

  await supabase.from('youtube_follows_member').insert({
    discord_id: interaction.user.id,
    channel_id: channelId,
  })

  const salon = await ensureMemberChannel(interaction.member, interaction.guild, interaction.client)

  await interaction.editReply(
    `✅ Chaîne **${chData.channel_name ?? channelId}** ajoutée ! Tu seras pingé dans ${salon} dès qu'une nouvelle vidéo sort.`
  )
}

// ─── Select menu : supprime le suivi sélectionné ─────────────────────────────

async function handleYoutubeRemoveSelect(interaction) {
  await interaction.deferUpdate()

  const channelId = interaction.values[0]

  const { data: ch } = await supabase
    .from('youtube_channels')
    .select('channel_name')
    .eq('channel_id', channelId)
    .maybeSingle()

  await supabase
    .from('youtube_follows_member')
    .delete()
    .eq('discord_id', interaction.user.id)
    .eq('channel_id', channelId)

  await interaction.editReply({
    content: `✅ Tu ne suis plus **${ch?.channel_name ?? channelId}**.`,
    components: [],
  })
}

module.exports = {
  handleYoutubeAddFollow,
  handleYoutubeRemoveFollow,
  handleModalYoutubeAddFollow,
  handleYoutubeRemoveSelect,
}
