const { SlashCommandBuilder } = require('discord.js')
const { isChefOrAdjoint, buildLdcEmbed, makeRefreshRow } = require('../lib/warEmbeds.js')
const { replaceEmbed } = require('../lib/eventChannels.js')

const DR1_WAR_CHANNEL = '1511988469918994545'
const DR2_WAR_CHANNEL = '1511988535094153286'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshldc')
    .setDescription('Actualise l\'embed LDC du clan choisi')
    .addStringOption(opt =>
      opt.setName('clan')
        .setDescription('Clan à actualiser')
        .setRequired(true)
        .addChoices({ name: 'DR1', value: 'dr1' }, { name: 'DR2', value: 'dr2' })
    ),

  async execute(interaction) {
    if (!isChefOrAdjoint(interaction.member)) {
      return interaction.reply({ content: '❌ Réservé aux Chefs et Chefs Adjoints.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const clan      = interaction.options.getString('clan')
    const channelId = clan === 'dr1' ? DR1_WAR_CHANNEL : DR2_WAR_CHANNEL
    const key       = `war_ldc_${clan}_msg_id`
    const btnId     = `refresh_ldc_${clan}`

    try {
      const embed = await buildLdcEmbed(clan)
      await replaceEmbed(interaction.client, channelId, key, embed, makeRefreshRow(btnId))
      await interaction.editReply(`✅ Embed LDC ${clan.toUpperCase()} actualisé.`)
    } catch (e) {
      console.error('[refreshldc]', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  },
}
