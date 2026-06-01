const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { getPlayer } = require('../cocApi.js')
const supabase = require('../supabase.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche le profil CoC d\'un joueur')
    .addStringOption(opt =>
      opt.setName('tag')
        .setDescription('Tag CoC (ex: #ABC123). Laisse vide pour ton compte lié.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply()

    let tag = interaction.options.getString('tag')

    if (!tag) {
      const { data } = await supabase
        .from('discord_links')
        .select('coc_tag')
        .eq('discord_id', interaction.user.id)
        .single()

      if (!data) {
        return interaction.editReply('Aucun compte CoC lié. Utilise `/lier <tag>` pour associer ton tag.')
      }
      tag = data.coc_tag
    }

    try {
      const p = await getPlayer(tag)

      const embed = new EmbedBuilder()
        .setTitle(`${p.name} (${p.tag})`)
        .setColor(0xC0392B)
        .addFields(
          { name: 'HDV',       value: String(p.townHallLevel),  inline: true },
          { name: 'Niveau',    value: String(p.expLevel),       inline: true },
          { name: 'Trophées',  value: String(p.trophies),       inline: true },
          { name: 'Clan',      value: p.clan?.name ?? 'Aucun',  inline: true },
          { name: 'Rôle',      value: p.role ?? '-',            inline: true },
          { name: 'Étoiles GDC', value: String(p.warStars ?? 0), inline: true },
        )
        .setFooter({ text: 'Donjon Rouge' })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch {
      await interaction.editReply(`Joueur introuvable pour le tag \`${tag}\`. Vérifie le format (ex: \`#ABC123\`).`)
    }
  }
}
