const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const supabase = require('../supabase.js')
const { getPlayer } = require('../cocApi.js')
const { assignLeagueRole } = require('../utils/assignLeagueRole.js')
const { assignHdvRole } = require('../utils/assignHdvRole.js')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshleagues')
    .setDescription('Resynchronise les rôles de ligue de tous les membres liés (admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply('Cette commande est réservée aux administrateurs.')
    }

    const { data: links, error } = await supabase
      .from('discord_links')
      .select('discord_id, coc_tag, coc_name')
      .eq('is_primary', true)

    if (error) {
      console.error('Erreur /refreshleagues (fetch):', error)
      return interaction.editReply('Erreur lors de la récupération des comptes liés.')
    }

    if (!links || links.length === 0) {
      return interaction.editReply('Aucun compte principal lié trouvé.')
    }

    let updated = 0
    let errors = 0

    for (const link of links) {
      try {
        const member = await interaction.guild.members.fetch(link.discord_id).catch(() => null)
        if (!member) { errors++; continue }

        const player = await getPlayer(link.coc_tag)
        await assignLeagueRole(member, player.leagueTier?.name ?? null)
        await assignHdvRole(member, player.townHallLevel)
        updated++
      } catch (err) {
        console.error(`Erreur /refreshleagues pour ${link.coc_name} (${link.coc_tag}):`, err.message)
        errors++
      }

      await sleep(500)
    }

    await interaction.editReply(
      `Synchronisation terminée : **${updated}** joueur(s) mis à jour, **${errors}** erreur(s).`
    )
  },
}
