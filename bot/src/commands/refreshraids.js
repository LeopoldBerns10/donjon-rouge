const { SlashCommandBuilder } = require('discord.js')
const { isChefOrAdjoint, buildRaidsEmbed, makeRefreshRow } = require('../lib/warEmbeds.js')
const { replaceEmbed } = require('../lib/eventChannels.js')

const JDC_RAIDS_CHANNEL = '1511988581135159376'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshraids')
    .setDescription('Actualise l\'embed Raid Capital'),

  async execute(interaction) {
    if (!isChefOrAdjoint(interaction.member)) {
      return interaction.reply({ content: '❌ Réservé aux Chefs et Chefs Adjoints.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      const embed = await buildRaidsEmbed()
      await replaceEmbed(interaction.client, JDC_RAIDS_CHANNEL, 'war_raids_msg_id', embed, makeRefreshRow('refresh_raids'))
      await interaction.editReply('✅ Embed Raid Capital actualisé.')
    } catch (e) {
      console.error('[refreshraids]', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  },
}
