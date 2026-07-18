const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { buildGdcEmbed, buildLdcEmbed, buildRaidsEmbed, buildJdcEmbed, makeRefreshRow } = require('../lib/warEmbeds.js')
const { replaceEmbed } = require('../lib/eventChannels.js')

const DR1_WAR_CHANNEL   = '1511988469918994545'
const DR2_WAR_CHANNEL   = '1511988535094153286'
const JDC_RAIDS_CHANNEL = '1511988581135159376'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupguerre')
    .setDescription('(Re)poste les embeds guerre dans les salons d\'infos')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      const [gdcDR1, ldcDR1, gdcDR2, ldcDR2, raids, jdc] = await Promise.all([
        buildGdcEmbed('dr1'),
        buildLdcEmbed('dr1'),
        buildGdcEmbed('dr2'),
        buildLdcEmbed('dr2'),
        buildRaidsEmbed(),
        buildJdcEmbed(),
      ])

      await Promise.all([
        replaceEmbed(interaction.client, DR1_WAR_CHANNEL,   'war_gdc_dr1_msg_id', gdcDR1, makeRefreshRow('refresh_gdc_dr1')),
        replaceEmbed(interaction.client, DR1_WAR_CHANNEL,   'war_ldc_dr1_msg_id', ldcDR1, makeRefreshRow('refresh_ldc_dr1')),
        replaceEmbed(interaction.client, DR2_WAR_CHANNEL,   'war_gdc_dr2_msg_id', gdcDR2, makeRefreshRow('refresh_gdc_dr2')),
        replaceEmbed(interaction.client, DR2_WAR_CHANNEL,   'war_ldc_dr2_msg_id', ldcDR2, makeRefreshRow('refresh_ldc_dr2')),
        replaceEmbed(interaction.client, JDC_RAIDS_CHANNEL, 'war_raids_msg_id',   raids,  makeRefreshRow('refresh_raids')),
        replaceEmbed(interaction.client, JDC_RAIDS_CHANNEL, 'war_jdc_msg_id',     jdc,    makeRefreshRow('refresh_jdc')),
      ])

      await interaction.editReply('✅ Embeds guerre postés.')
    } catch (e) {
      console.error('[setupguerre]', e)
      await interaction.editReply('❌ Erreur lors du setup.')
    }
  },
}
