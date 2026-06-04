const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const supabase = require('../../supabase.js')

const LIE_ROLE_ID = '1511096527664320655'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vocal-prive')
    .setDescription('Rend ton salon vocal privé (retire la permission du rôle Lié)'),

  async execute(interaction) {
    const member = interaction.member
    const voiceChannel = member.voice.channel

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ Tu n\'es pas dans un salon vocal.', ephemeral: true })
    }

    const { data } = await supabase
      .from('voice_channels')
      .select('owner_id')
      .eq('channel_id', voiceChannel.id)
      .maybeSingle()

    if (!data) {
      return interaction.reply({ content: '❌ Ce salon n\'est pas géré par le bot.', ephemeral: true })
    }

    if (data.owner_id !== member.id) {
      return interaction.reply({ content: '❌ Tu n\'es pas le propriétaire de ce salon.', ephemeral: true })
    }

    await voiceChannel.permissionOverwrites.edit(LIE_ROLE_ID, {
      ViewChannel: false,
      Connect: false,
    })

    await interaction.reply({ content: '🔒 Salon rendu privé — le rôle Lié ne peut plus rejoindre.', ephemeral: true })
  },
}
