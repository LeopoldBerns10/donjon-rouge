const {
  SlashCommandBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
} = require('discord.js')
const { getPlayer } = require('../cocApi.js')
const supabase = require('../supabase.js')
const { buildNavComponents, resetNavTimer } = require('../utils/performances.js')
const { ACCOUNT_CHANNEL_ID } = require('../config/reminders.js')

function buildEmbed(p) {
  return new EmbedBuilder()
    .setTitle(`${p.name} (${p.tag})`)
    .setColor(0xC0392B)
    .addFields(
      { name: 'HDV',         value: String(p.townHallLevel),  inline: true },
      { name: 'Niveau',      value: String(p.expLevel),       inline: true },
      { name: 'Trophées',    value: String(p.trophies),       inline: true },
      { name: 'Clan',        value: p.clan?.name ?? 'Aucun',  inline: true },
      { name: 'Rôle',        value: p.role ?? '-',            inline: true },
      { name: 'Étoiles GDC', value: String(p.warStars ?? 0),  inline: true },
    )
    .setFooter({ text: 'Donjon Rouge' })
    .setTimestamp()
}

function buildMenu(links, activeTag) {
  return new StringSelectMenuBuilder()
    .setCustomId('select_profil')
    .setPlaceholder('Voir un autre compte')
    .addOptions(
      links.map(link =>
        new StringSelectMenuOptionBuilder()
          .setLabel(link.is_primary ? `⭐ ${link.coc_name}` : link.coc_name)
          .setValue(link.coc_tag)
          .setDescription(link.coc_tag)
          .setDefault(link.coc_tag === activeTag)
      )
    )
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche ton profil CoC'),

  async execute(interaction) {
    await interaction.deferReply()
    const navTimeout = interaction.channelId === ACCOUNT_CHANNEL_ID ? 5 * 60 * 1000 : 10 * 60 * 1000

    const { data: links, error } = await supabase
      .from('discord_links')
      .select('coc_tag, coc_name, is_primary')
      .eq('discord_id', interaction.user.id)
      .order('created_at', { ascending: true })

    if (error || !links || links.length === 0) {
      return interaction.editReply('Aucun compte CoC lié. Utilise `/lier` d\'abord.')
    }

    const primary = links.find(l => l.is_primary) ?? links[0]
    let activeTag = primary.coc_tag

    let player
    try {
      player = await getPlayer(activeTag)
    } catch {
      return interaction.editReply(`Impossible de récupérer le profil pour \`${activeTag}\`.`)
    }

    if (links.length === 1) {
      const msg = await interaction.editReply({
        embeds: [buildEmbed(player)],
        components: buildNavComponents(activeTag, 'profil'),
      })
      resetNavTimer(msg, navTimeout)
      return
    }

    const selectRow = new ActionRowBuilder().addComponents(buildMenu(links, activeTag))
    const navRow    = buildNavComponents(activeTag, 'profil')[0]
    const response  = await interaction.editReply({
      embeds: [buildEmbed(player)],
      components: [selectRow, navRow],
    })
    resetNavTimer(response, navTimeout)

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id,
      time: 120_000,
    })

    collector.on('collect', async i => {
      activeTag = i.values[0]
      await i.deferUpdate()
      try {
        const p = await getPlayer(activeTag)
        const newSelectRow = new ActionRowBuilder().addComponents(buildMenu(links, activeTag))
        const newNavRow    = buildNavComponents(activeTag, 'profil')[0]
        await interaction.editReply({ embeds: [buildEmbed(p)], components: [newSelectRow, newNavRow] })
      } catch {
        await interaction.editReply({ content: `Impossible de récupérer le profil pour \`${activeTag}\`.`, components: [] })
      }
    })

    collector.on('end', () => {
      interaction.editReply({ components: buildNavComponents(activeTag, 'profil') }).catch(() => {})
    })
  },
}
