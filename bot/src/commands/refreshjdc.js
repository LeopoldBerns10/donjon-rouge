const { SlashCommandBuilder } = require('discord.js')
const { updateJdcEmbeds } = require('../lib/jdcTracker.js')
const { JDC_TRACKING_CHANNEL } = require('../config/jdcConfig.js')
const supabase = require('../supabase.js')

const CHEF_ROLE_ID = '611123759864348672'
const EMBED_KEYS   = ['jdc_embed_all_id', 'jdc_embed_absent_id']

module.exports = {
  data: new SlashCommandBuilder()
    .setName('refreshjdc')
    .setDescription('Recrée les embeds JDC (classement + absents) dans le salon de suivi.'),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
      return interaction.reply({ content: '❌ Accès réservé aux Chefs.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    // ── 1. Récupérer les IDs des embeds actuels en base ─────────────────────
    const { data: rows } = await supabase
      .from('bot_config')
      .select('key, value')
      .in('key', EMBED_KEYS)
    const embedIds = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]))

    // ── 2. Supprimer les anciens messages Discord ────────────────────────────
    const channel = await interaction.client.channels.fetch(JDC_TRACKING_CHANNEL).catch(() => null)
    if (channel) {
      for (const key of EMBED_KEYS) {
        const id = embedIds[key]
        if (id) {
          try {
            const msg = await channel.messages.fetch(id)
            await msg.delete()
            console.log(`[refreshjdc] Message ${key} supprimé (${id})`)
          } catch { /* déjà supprimé ou introuvable */ }
        }
      }
    }

    // ── 3. Vider bot_config — ensureJdcMessage recréera les messages ────────
    await supabase.from('bot_config').delete().in('key', EMBED_KEYS)

    // ── 4. Recréer les embeds ────────────────────────────────────────────────
    try {
      await updateJdcEmbeds(interaction.client)
      await interaction.editReply('✅ Embeds JDC recréés.')
    } catch (e) {
      console.error('[refreshjdc] Erreur updateJdcEmbeds :', e)
      await interaction.editReply('❌ Erreur lors de la recréation des embeds.')
    }
  },
}
