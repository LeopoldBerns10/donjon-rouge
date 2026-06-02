const { SlashCommandBuilder } = require('discord.js')
const { isAdmin } = require('../../lib/isAdmin.js')
const { ADMIN_CHANNEL_ID } = require('../../config/admin.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-admin')
    .setDescription('Attribuer ou retirer un rôle à un membre')
    .addUserOption(opt => opt.setName('membre').setDescription('Membre Discord').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Rôle à modifier').setRequired(true))
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('Ajouter ou retirer le rôle')
        .setRequired(true)
        .addChoices(
          { name: 'Ajouter', value: 'add' },
          { name: 'Retirer', value: 'remove' },
        )
    ),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }
    if (interaction.channelId !== ADMIN_CHANNEL_ID) {
      return interaction.reply({ content: `❌ Cette commande doit être utilisée dans <#${ADMIN_CHANNEL_ID}>.`, ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const target = interaction.options.getMember('membre')
    const role   = interaction.options.getRole('role')
    const action = interaction.options.getString('action')

    try {
      if (action === 'add') {
        await target.roles.add(role)
        await interaction.editReply(`✅ Rôle **${role.name}** ajouté à ${target}.`)
      } else {
        await target.roles.remove(role)
        await interaction.editReply(`✅ Rôle **${role.name}** retiré de ${target}.`)
      }
    } catch (err) {
      console.error('[role-admin]', err)
      await interaction.editReply('❌ Impossible de modifier le rôle. Vérifie la hiérarchie des rôles du bot.')
    }
  },
}
