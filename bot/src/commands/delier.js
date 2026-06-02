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
const { ROLES } = require('../config/onboarding.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delier')
    .setDescription('Supprime un compte CoC lié à ton Discord'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const { data: links, error } = await supabase
      .from('discord_links')
      .select('coc_tag, coc_name, is_primary')
      .eq('discord_id', interaction.user.id)
      .order('created_at', { ascending: true })

    if (error || !links || links.length === 0) {
      return interaction.editReply('Aucun compte CoC lié.')
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_delier')
      .setPlaceholder('Choisis le compte à supprimer')
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
      content: 'Quel compte veux-tu délier ?',
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
      return interaction.editReply({ content: 'Temps écoulé. Relance `/delier`.', components: [] })
    }

    await collected.deferUpdate()

    const selectedTag = collected.values[0]
    const selected = links.find(l => l.coc_tag === selectedTag)

    const { error: delError } = await supabase
      .from('discord_links')
      .delete()
      .eq('discord_id', interaction.user.id)
      .eq('coc_tag', selectedTag)

    if (delError) {
      console.error('Erreur /delier (delete):', delError)
      return interaction.editReply({ content: 'Erreur lors de la suppression. Réessaie plus tard.', components: [] })
    }

    const { data: remaining } = await supabase
      .from('discord_links')
      .select('coc_tag')
      .eq('discord_id', interaction.user.id)
      .order('created_at', { ascending: true })

    if (!remaining || remaining.length === 0) {
      // Plus aucun compte → retirer rôle Lié + rôle ligue
      if (interaction.member && ROLES.LIE) {
        interaction.member.roles.remove(ROLES.LIE).catch(err => {
          console.error('Erreur retrait rôle Lié:', err)
        })
      }
      if (interaction.member) {
        assignLeagueRole(interaction.member, null).catch(err => {
          console.error('Erreur retrait rôle ligue:', err)
        })
      }
    } else if (selected.is_primary) {
      // Principal supprimé mais il reste des comptes → promouvoir le premier restant
      const newPrimaryTag = remaining[0].coc_tag
      await supabase
        .from('discord_links')
        .update({ is_primary: true })
        .eq('discord_id', interaction.user.id)
        .eq('coc_tag', newPrimaryTag)

      // Mettre à jour le rôle ligue avec celui du nouveau principal
      if (interaction.member) {
        try {
          const newPrimary = await getPlayer(newPrimaryTag)
          if (newPrimary.leagueTier?.name) {
            assignLeagueRole(interaction.member, newPrimary.leagueTier.name).catch(err => {
              console.error('Erreur mise à jour rôle ligue nouveau principal:', err)
            })
          } else {
            assignLeagueRole(interaction.member, null).catch(err => {
              console.error('Erreur retrait rôle ligue nouveau principal:', err)
            })
          }
        } catch (err) {
          console.error('Erreur fetch nouveau principal:', err)
        }
      }
    }
    // Compte secondaire supprimé → ne rien changer au rôle ligue

    await interaction.editReply({
      content: `Compte **${selected.coc_name}** délié avec succès.`,
      components: [],
    })
  },
}
