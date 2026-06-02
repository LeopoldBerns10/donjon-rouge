const { SlashCommandBuilder } = require('discord.js')
const { isAdmin } = require('../../lib/isAdmin.js')
const { ADMIN_CHANNEL_ID } = require('../../config/admin.js')
const supabase = require('../../supabase.js')
const { assignLeagueRole } = require('../../utils/assignLeagueRole.js')
const { ROLES } = require('../../config/onboarding.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delier-admin')
    .setDescription('Délier manuellement un compte CoC d\'un membre Discord')
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

    const { data: link } = await supabase
      .from('discord_links')
      .select('coc_name, coc_tag, is_primary')
      .eq('discord_id', target.id)
      .eq('coc_tag', tag)
      .maybeSingle()

    if (!link) {
      return interaction.editReply(`⚠️ Aucun lien trouvé entre ${target} et le tag \`${tag}\`.`)
    }

    await supabase
      .from('discord_links')
      .delete()
      .eq('discord_id', target.id)
      .eq('coc_tag', tag)

    const { data: remaining } = await supabase
      .from('discord_links')
      .select('coc_tag')
      .eq('discord_id', target.id)
      .order('created_at', { ascending: true })

    if (!remaining || remaining.length === 0) {
      target.roles.remove(ROLES.LIE).catch(() => {})
      assignLeagueRole(target, null).catch(() => {})
    } else if (link.is_primary) {
      await supabase
        .from('discord_links')
        .update({ is_primary: true })
        .eq('discord_id', target.id)
        .eq('coc_tag', remaining[0].coc_tag)
    }

    await interaction.editReply(`✅ Compte **${link.coc_name}** (${link.coc_tag}) délié de ${target}.`)
  },
}
