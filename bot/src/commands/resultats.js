const { SlashCommandBuilder } = require('discord.js')
const { isChefOrAdjoint, getDiscordIds } = require('../lib/warEmbeds.js')
const {
  buildResultatsGdc, buildResultatsLdc, buildResultatsRaids, buildResultatsJdc, postResultats,
} = require('../lib/resultatsEmbeds.js')
const { apiGet, normalizeWar } = require('../cocApi.js')
const { isJdcActive } = require('../lib/jdcTracker.js')

const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resultats')
    .setDescription('Poste manuellement les résultats d\'un événement')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('Type d\'événement')
        .setRequired(true)
        .addChoices(
          { name: 'GDC DR1',  value: 'gdc_dr1' },
          { name: 'GDC DR2',  value: 'gdc_dr2' },
          { name: 'LDC DR1',  value: 'ldc_dr1' },
          { name: 'LDC DR2',  value: 'ldc_dr2' },
          { name: 'Raids',    value: 'raids'    },
          { name: 'JDC',      value: 'jdc'      },
        )
    ),

  async execute(interaction) {
    if (!isChefOrAdjoint(interaction.member)) {
      return interaction.reply({ content: '❌ Réservé aux Chefs et Chefs Adjoints.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    const type = interaction.options.getString('type')

    try {
      let embed

      if (type === 'gdc_dr1' || type === 'gdc_dr2') {
        const clanKey = type === 'gdc_dr1' ? 'dr1' : 'dr2'
        const label   = type === 'gdc_dr1' ? 'DR1' : 'DR2'
        const war     = await apiGet(`/clan/${clanKey}/war`)
        if (!war || war.state === 'notInWar') {
          return interaction.editReply('❌ Aucune guerre terminée disponible.')
        }
        embed = await buildResultatsGdc(war, label)

      } else if (type === 'ldc_dr1' || type === 'ldc_dr2') {
        const clanKey = type === 'ldc_dr1' ? 'dr1' : 'dr2'
        const label   = type === 'ldc_dr1' ? 'DR1' : 'DR2'
        const ourTag  = type === 'ldc_dr1' ? DR1_TAG : DR2_TAG
        const path    = type === 'ldc_dr1' ? '/ldc/current' : '/ldc/dr2/current'
        const ldc     = await apiGet(path)
        const lastEnded = ldc?.rounds?.slice().reverse().find(r => r.war?.state === 'warEnded')
        if (!lastEnded) return interaction.editReply('❌ Aucun round LDC terminé trouvé.')
        embed = await buildResultatsLdc(normalizeWar(lastEnded.war, ourTag), label)

      } else if (type === 'raids') {
        const data   = await apiGet('/clan/raids')
        const latest = data?.items?.[0] ?? null
        if (!latest) return interaction.editReply('❌ Aucun raid trouvé.')
        const [r1, r2] = await Promise.all([
          apiGet('/clan/dr1/members').catch(() => null),
          apiGet('/clan/dr2/members').catch(() => null),
        ])
        const clanMembers = [...(r1?.items || []), ...(r2?.items || [])]
        embed = await buildResultatsRaids(latest, clanMembers)

      } else if (type === 'jdc') {
        const active = await isJdcActive()
        if (!active) return interaction.editReply('❌ Aucun JDC actif.')
        const { fetchAllMembersWithPoints } = require('../lib/jdcTracker.js')
        const season  = new Date().toISOString().slice(0, 7)
        const members = await fetchAllMembersWithPoints(season)
        const total   = members.reduce((acc, m) => acc + (m.points ?? 0), 0)
        embed = await buildResultatsJdc({ members, totalPoints: total, target: 50000 })
      }

      await postResultats(interaction.client, embed, null)
      await interaction.editReply('✅ Résultats postés.')
    } catch (e) {
      console.error('[resultats]', e)
      await interaction.editReply('❌ Erreur lors du post.')
    }
  },
}
