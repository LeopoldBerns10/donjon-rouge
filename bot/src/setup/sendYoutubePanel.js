const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')

async function sendYoutubePanel(client, channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel) throw new Error('Salon YouTube introuvable')

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('📺 SUIVI YOUTUBE — DONJON ROUGE')
    .setDescription(
      'Suis tes chaînes YouTube préférées !\n' +
      'Chaque nouvelle vidéo te sera signalée en ping dans ton salon privé.\n\n' +
      '**Maximum 5 chaînes par membre.**\n\n' +
      'Clique sur un bouton ci-dessous :'
    )

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('youtube_add_follow').setLabel('➕ Ajouter suivi').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('youtube_remove_follow').setLabel('➖ Retirer un suivi').setStyle(ButtonStyle.Danger),
  )

  const { data } = await supabase.from('bot_config').select('value').eq('key', 'youtube_panel_id').maybeSingle()
  if (data?.value) {
    try {
      const existing = await channel.messages.fetch(data.value)
      await existing.delete()
    } catch {}
    await supabase.from('bot_config').delete().eq('key', 'youtube_panel_id')
  }

  const msg = await channel.send({ embeds: [embed], components: [row] })
  await supabase.from('bot_config').upsert({ key: 'youtube_panel_id', value: msg.id, updated_at: new Date().toISOString() })
  console.log(`[YoutubePanel] Panel créé : ${msg.id}`)
  return msg
}

module.exports = { sendYoutubePanel }
