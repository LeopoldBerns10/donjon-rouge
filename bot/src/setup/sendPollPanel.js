const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')

const POLL_CHANNEL_ID = '1520034566532759633'

async function sendPollPanel(client) {
  const channel = await client.channels.fetch(POLL_CHANNEL_ID).catch(() => null)
  if (!channel) throw new Error('Salon sondages introuvable')

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📊 SONDAGES — DONJON ROUGE')
    .setDescription(
      'Crée un sondage pour recueillir l\'avis du clan !\n' +
      'Les membres peuvent voter via les boutons sous le sondage.'
    )

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('poll_create').setLabel('📊 Créer un sondage').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('poll_end').setLabel('🏁 Terminer le sondage').setStyle(ButtonStyle.Danger),
  )

  const { data } = await supabase.from('bot_config').select('value').eq('key', 'poll_panel_id').maybeSingle()
  if (data?.value) {
    try {
      const existing = await channel.messages.fetch(data.value)
      await existing.delete()
    } catch {}
    await supabase.from('bot_config').delete().eq('key', 'poll_panel_id')
  }

  const msg = await channel.send({ embeds: [embed], components: [row] })
  await supabase.from('bot_config').upsert({ key: 'poll_panel_id', value: msg.id, updated_at: new Date().toISOString() })
  console.log(`[PollPanel] Panel créé : ${msg.id}`)
  return msg
}

module.exports = { sendPollPanel }
