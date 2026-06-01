const { SlashCommandBuilder } = require('discord.js')
const { getPlayer } = require('../cocApi.js')
const supabase = require('../supabase.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lier')
    .setDescription('Associe ton compte Discord à ton tag CoC')
    .addStringOption(opt =>
      opt.setName('tag')
        .setDescription('Ton tag CoC (ex: #ABC123)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const tag = interaction.options.getString('tag').trim().toUpperCase()

    try {
      const player = await getPlayer(tag)

      const { error } = await supabase
        .from('discord_links')
        .upsert(
          { discord_id: interaction.user.id, coc_tag: player.tag, coc_name: player.name },
          { onConflict: 'discord_id' }
        )

      if (error) throw error

      await interaction.editReply(`Compte lié : **${player.name}** (${player.tag})`)
    } catch {
      await interaction.editReply(`Tag introuvable ou erreur. Vérifie le format : \`#ABC123\``)
    }
  }
}
