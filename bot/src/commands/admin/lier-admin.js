const { SlashCommandBuilder } = require('discord.js')
const { isAdmin } = require('../../lib/isAdmin.js')
const { ADMIN_CHANNEL_ID } = require('../../config/admin.js')
const { getPlayer } = require('../../cocApi.js')
const supabase = require('../../supabase.js')
const { assignLeagueRole } = require('../../utils/assignLeagueRole.js')
const { ROLES } = require('../../config/onboarding.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lier-admin')
    .setDescription('Lier manuellement un compte CoC à un membre Discord')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre Discord').setRequired(true))
    .addStringOption(opt => opt.setName('tag').setDescription('Tag CoC (ex: #ABC123)').setRequired(true)),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }
    if (interaction.channelId !== ADMIN_CHANNEL_ID) {
      return interaction.reply({ content: `❌ Cette commande doit être utilisée dans <#${ADMIN_CHANNEL_ID}>.`, ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const target = interaction.options.getMember('membre')
    const raw    = interaction.options.getString('tag').trim().toUpperCase()
    const tag    = raw.startsWith('#') ? raw : `#${raw}`

    try {
      const player = await getPlayer(tag)

      const { data: existing } = await supabase
        .from('discord_links')
        .select('id')
        .eq('discord_id', target.id)
        .eq('coc_tag', player.tag)
        .maybeSingle()

      if (existing) {
        return interaction.editReply(`⚠️ Ce compte est déjà lié à ${target} : **${player.name}** (${player.tag})`)
      }

      const { count } = await supabase
        .from('discord_links')
        .select('id', { count: 'exact', head: true })
        .eq('discord_id', target.id)

      const isPrimary = count === 0

      await supabase.from('discord_links').insert({
        discord_id: target.id,
        coc_tag:    player.tag,
        coc_name:   player.name,
        is_primary: isPrimary,
      })

      if (isPrimary && player.leagueTier?.name) {
        assignLeagueRole(target, player.leagueTier.name).catch(() => {})
      }
      if (ROLES.LIE) {
        target.roles.add(ROLES.LIE).catch(() => {})
      }

      await interaction.editReply(`✅ Compte **${player.name}** (${player.tag}) lié à ${target}${isPrimary ? ' *(principal)*' : ''}.`)
    } catch (err) {
      console.error('[lier-admin]', err)
      await interaction.editReply('❌ Tag introuvable ou erreur. Vérifie le format : `#ABC123`')
    }
  },
}
