const { SlashCommandBuilder } = require('discord.js')
const supabase = require('../../supabase.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vocal-mute')
    .setDescription('Mute ou démute un membre dans ton salon vocal')
    .addUserOption(opt =>
      opt.setName('membre')
        .setDescription('Le membre à muter/démuter')
        .setRequired(true)
    ),

  async execute(interaction) {
    const member = interaction.member
    const voiceChannel = member.voice.channel
    const target = interaction.options.getMember('membre')

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

    if (!target || target.id === member.id) {
      return interaction.reply({ content: '❌ Tu ne peux pas te muter toi-même.', ephemeral: true })
    }

    if (target.voice.channelId !== voiceChannel.id) {
      return interaction.reply({ content: '❌ Ce membre n\'est pas dans ton salon.', ephemeral: true })
    }

    const isMuted = target.voice.serverMute
    await target.voice.setMute(!isMuted)

    const msg = isMuted
      ? `🔊 **${target.displayName}** a été démuté.`
      : `🔇 **${target.displayName}** a été muté.`

    await interaction.reply({ content: msg, ephemeral: true })
  },
}
