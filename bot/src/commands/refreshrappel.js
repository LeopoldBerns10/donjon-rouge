const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const { isAdmin } = require('../lib/isAdmin.js')
const { REMINDER_CHANNEL_ID } = require('../config/reminders.js')
const { updateReminderMessages, resetStatus } = require('../scheduler.js')
const { updateJdcEmbeds, isJdcActive, fetchJdcMembersUnder5000 } = require('../lib/jdcTracker.js')
const supabase = require('../supabase.js')

const JDC_RAPPEL_CHANNEL = '1510972919407317142'
const TWO_HOURS = 2 * 60 * 60 * 1000

async function bulkDeleteAll(channel) {
  try { await channel.bulkDelete(100) } catch (e) {
    console.warn(`[RefreshRappel] bulkDelete échoué sur ${channel.id}:`, e.message)
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshrappel')
    .setDescription('Force un refresh des 3 messages de rappel (DR1, DR2, Raid Capital)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!await isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })
    try {
      const { client } = interaction

      const channel = await client.channels.fetch(REMINDER_CHANNEL_ID).catch(() => null)
      if (channel) await bulkDeleteAll(channel)

      await resetStatus()
      await updateReminderMessages(client)
      const jdcActive = await isJdcActive()
      console.log('[refreshrappel] jdc_active =', jdcActive)
      console.log('[refreshrappel] Appel updateJdcEmbeds...')
      try {
        await updateJdcEmbeds(client)
        console.log('[refreshrappel] updateJdcEmbeds terminé')
      } catch (e) {
        console.error('[refreshrappel] Erreur updateJdcEmbeds :', e)
      }

      if (jdcActive) {
        try {
          const allUnder = await fetchJdcMembersUnder5000()
          const zero    = allUnder.filter(m => m.points === 0)
          const partial = allUnder.filter(m => m.points > 0)

          const rappelChannel = await client.channels.fetch(JDC_RAPPEL_CHANNEL).catch(() => null)
          if (rappelChannel) {
            // Lookup Discord IDs en une seule requête pour tous les membres
            const allTags = allUnder.map(m => m.tag)
            const { data: links } = await supabase.from('discord_links').select('discord_id, coc_tag').in('coc_tag', allTags)
            const discordMap = Object.fromEntries((links || []).map(r => [r.coc_tag, r.discord_id]))

            const mention = m => discordMap[m.tag] ? `<@${discordMap[m.tag]}>` : m.name
            const fmtPts  = n => n.toLocaleString('fr-FR')
            const chunk   = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))
            const autoDelete = msg => setTimeout(() => msg.delete().catch(() => {}), TWO_HOURS)

            // ── Groupe 0 pt ──────────────────────────────────────────────────
            if (zero.length > 0) {
              const lines  = zero.map(m => mention(m))
              const chunks = chunk(lines, 10)
              for (let i = 0; i < chunks.length; i++) {
                const header = i === 0
                  ? `🎮 Jeux de Clan en cours — **${zero.length} membre${zero.length > 1 ? 's' : ''} n'ont pas encore participé**\nObjectif DR : 5 000 pts minimum 🎯\n`
                  : `🎮 *(suite ${i + 1}/${chunks.length})*\n`
                autoDelete(await rappelChannel.send(header + chunks[i].join('\n')))
              }
            }

            // ── Groupe en cours (1–4 999 pts) ────────────────────────────────
            if (partial.length > 0) {
              const lines  = partial.map(m => `${mention(m)} — ${fmtPts(m.points)} pts`)
              const chunks = chunk(lines, 10)
              for (let i = 0; i < chunks.length; i++) {
                const header = i === 0
                  ? `🔥 En bonne voie, mais l'objectif DR est 5 000 pts !\n`
                  : `🔥 *(suite ${i + 1}/${chunks.length})*\n`
                autoDelete(await rappelChannel.send(header + chunks[i].join('\n')))
              }
            }
          }
        } catch (e) {
          console.error('[refreshrappel] Erreur rappels JDC :', e)
        }
      }

      await interaction.editReply('✅ Rappels réinitialisés')
    } catch (e) {
      console.error('Erreur /refreshrappel:', e)
      await interaction.editReply('❌ Erreur lors du refresh.')
    }
  },
}
