const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ComponentType,
} = require('discord.js')
const supabase = require('../supabase.js')
const { getPlayer } = require('../cocApi.js')
const { assignLeagueRole } = require('../utils/assignLeagueRole.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('principal')
    .setDescription('Définit ton compte CoC principal parmi tes comptes liés'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const { data: links, error } = await supabase
      .from('discord_links')
      .select('coc_tag, coc_name, is_primary')
      .eq('discord_id', interaction.user.id)
      .order('created_at', { ascending: true })

    if (error || !links || links.length === 0) {
      return interaction.editReply('Aucun compte CoC lié. Utilise `/lier` d\'abord.')
    }

    if (links.length === 1) {
      return interaction.editReply('Tu n\'as qu\'un seul compte lié, il est déjà principal.')
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_principal')
      .setPlaceholder('Choisis ton compte principal')
      .addOptions(
        links.map(link =>
          new StringSelectMenuOptionBuilder()
            .setLabel(link.is_primary ? `⭐ ${link.coc_name}` : link.coc_name)
            .setValue(link.coc_tag)
            .setDescription(link.coc_tag)
        )
      )

    const row = new ActionRowBuilder().addComponents(menu)

    const response = await interaction.editReply({
      content: 'Quel compte veux-tu définir comme principal ?',
      components: [row],
    })

    let collected
    try {
      collected = await response.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: i => i.user.id === interaction.user.id,
        time: 30_000,
      })
    } catch {
      return interaction.editReply({ content: 'Temps écoulé. Relance `/principal`.', components: [] })
    }

    await collected.deferUpdate()

    const selectedTag = collected.values[0]

    const { error: err1 } = await supabase
      .from('discord_links')
      .update({ is_primary: false })
      .eq('discord_id', interaction.user.id)

    if (err1) {
      console.error('Erreur /principal (reset):', err1)
      return interaction.editReply({ content: 'Erreur lors de la mise à jour. Réessaie plus tard.', components: [] })
    }

    const { error: err2 } = await supabase
      .from('discord_links')
      .update({ is_primary: true })
      .eq('discord_id', interaction.user.id)
      .eq('coc_tag', selectedTag)

    if (err2) {
      console.error('Erreur /principal (set):', err2)
      return interaction.editReply({ content: 'Erreur lors de la mise à jour. Réessaie plus tard.', components: [] })
    }

    if (interaction.member) {
      ;(async () => {
        try {
          console.log('[Principal] Tag sélectionné:', selectedTag)
          const player = await getPlayer(selectedTag)
          console.log('[Principal] leagueTier complet:', JSON.stringify(player?.leagueTier))
          console.log('[Principal] leagueTier.name:', player?.leagueTier?.name)
          await assignLeagueRole(interaction.member, player?.leagueTier?.name)
          console.log('[Principal] Rôle assigné avec succès')
        } catch (err) {
          console.error('Erreur mise à jour rôle ligue /principal:', err)
        }
      })()
    }

    const selected = links.find(l => l.coc_tag === selectedTag)
    await interaction.editReply({
      content: `Compte principal mis à jour : **${selected.coc_name}** (${selectedTag})`,
      components: [],
    })
  },
}
