const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')

const BIRTHDAY_CHANNEL_ID = '1520034360559013939'

async function sendBirthdayPanel(client) {
  const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID).catch(() => null)
  if (!channel) throw new Error('Salon anniversaire introuvable')

  const embed = new EmbedBuilder()
    .setColor(0xFF69B4)
    .setTitle('🎂 ANNIVERSAIRES — DONJON ROUGE')
    .setDescription(
      'Inscris ta date d\'anniversaire pour être fêté par le clan !\n' +
      'Le bot te souhaitera ton anniversaire le jour J à 10h.\n\n' +
      'Clique sur un bouton ci-dessous :'
    )

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('birthday_register').setLabel('🎂 S\'inscrire').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('birthday_unregister').setLabel('❌ Se désinscrire').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('birthday_list').setLabel('👥 Voir les inscrits').setStyle(ButtonStyle.Secondary),
  )

  const { data } = await supabase.from('bot_config').select('value').eq('key', 'birthday_panel_id').maybeSingle()
  if (data?.value) {
    try {
      const existing = await channel.messages.fetch(data.value)
      await existing.delete()
    } catch {}
    await supabase.from('bot_config').delete().eq('key', 'birthday_panel_id')
  }

  const msg = await channel.send({ embeds: [embed], components: [row] })
  await supabase.from('bot_config').upsert({ key: 'birthday_panel_id', value: msg.id, updated_at: new Date().toISOString() })
  console.log(`[BirthdayPanel] Panel créé : ${msg.id}`)
  return msg
}

module.exports = { sendBirthdayPanel }
