const { SlashCommandBuilder } = require('discord.js')
const { getPlayer } = require('../cocApi.js')
const supabase = require('../supabase.js')
const { assignLeagueRole } = require('../utils/assignLeagueRole.js')
const { assignHdvRole } = require('../utils/assignHdvRole.js')
const { ROLES } = require('../config/onboarding.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lier')
    .setDescription('Associe un compte CoC à ton Discord (multi-comptes supportés)')
    .addStringOption(opt =>
      opt.setName('tag')
        .setDescription('Ton tag CoC (ex: #ABC123)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const raw = interaction.options.getString('tag').trim().toUpperCase()
    const tag = raw.startsWith('#') ? raw : `#${raw}`

    try {
      const player = await getPlayer(tag)

      const { data: existing } = await supabase
        .from('discord_links')
        .select('id')
        .eq('discord_id', interaction.user.id)
        .eq('coc_tag', player.tag)
        .maybeSingle()

      if (existing) {
        return interaction.editReply(`Ce compte est déjà lié : **${player.name}** (${player.tag})`)
      }

      const { count } = await supabase
        .from('discord_links')
        .select('id', { count: 'exact', head: true })
        .eq('discord_id', interaction.user.id)

      const isPrimary = count === 0

      const { error } = await supabase
        .from('discord_links')
        .insert({
          discord_id: interaction.user.id,
          coc_tag: player.tag,
          coc_name: player.name,
          is_primary: isPrimary,
        })

      if (error) throw error

      if (isPrimary && interaction.member && player.leagueTier?.name) {
        assignLeagueRole(interaction.member, player.leagueTier.name).catch(err => {
          console.error('Erreur assignation rôle ligue:', err)
        })
      }

      if (isPrimary && interaction.member) {
        assignHdvRole(interaction.member, player.townHallLevel).catch(err => {
          console.error('Erreur assignation rôle HDV:', err)
        })
      }

      if (interaction.member && ROLES.LIE) {
        interaction.member.roles.add(ROLES.LIE).catch(err => {
          console.error('Erreur assignation rôle Lié:', err)
        })
      }

      const note = isPrimary
        ? ' *(compte principal)*'
        : ' — utilise `/principal` pour en faire ton compte principal'
      await interaction.editReply(`Compte lié : **${player.name}** (${player.tag})${note}`)
    } catch (err) {
      console.error('Erreur /lier:', err)
      await interaction.editReply('Tag introuvable ou erreur. Vérifie le format : `#ABC123`')
    }
  }
}
