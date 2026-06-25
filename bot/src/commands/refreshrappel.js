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
            const buildMentions = async members => {
              const tags = members.map(m => m.tag)
              const { data } = await supabase.from('discord_links').select('discord_id, coc_tag').in('coc_tag', tags)
              const map = Object.fromEntries((data || []).map(r => [r.coc_tag, r.discord_id]))
              return members.map(m => map[m.tag] ? `<@${map[m.tag]}>` : m.name).join(' ')
            }

            if (zero.length > 0) {
              const mentions = await buildMentions(zero)
              const msg = await rappelChannel.send(
                `🎮 ${mentions} — Jeux de Clan en cours ! Vous n'avez pas encore participé. Objectif DR : 5 000 pts minimum 🎯`
              )
              setTimeout(() => msg.delete().catch(() => {}), TWO_HOURS)
            }

            if (partial.length > 0) {
              const mentions = await buildMentions(partial)
              const msg = await rappelChannel.send(
                `🎮 ${mentions} — Tu es en bonne voie mais l'objectif DR est 5 000 pts ! 🔥`
              )
              setTimeout(() => msg.delete().catch(() => {}), TWO_HOURS)
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
