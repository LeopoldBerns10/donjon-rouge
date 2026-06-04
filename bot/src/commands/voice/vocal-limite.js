const { SlashCommandBuilder } = require('discord.js')
const supabase = require('../../supabase.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vocal-limite')
    .setDescription('Fixe le nombre maximum d\'utilisateurs dans ton salon vocal (0 = illimité)')
    .addIntegerOption(opt =>
      opt.setName('nombre')
        .setDescription('Nombre max d\'utilisateurs (1-10, 0 = illimité)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    const member = interaction.member
    const voiceChannel = member.voice.channel
    const nombre = interaction.options.getInteger('nombre')

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

    await voiceChannel.setUserLimit(nombre)

    const msg = nombre === 0
      ? '♾️ Limite supprimée — salon illimité.'
      : `👥 Limite fixée à **${nombre}** utilisateur(s).`

    await interaction.reply({ content: msg, ephemeral: true })
  },
}
