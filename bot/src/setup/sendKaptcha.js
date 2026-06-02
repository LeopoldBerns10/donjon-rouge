const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { CHANNELS } = require('../config/onboarding.js')
const supabase = require('../supabase.js')

async function sendKaptcha(client) {
  const channel = await client.channels.fetch(CHANNELS.VERIFICATION)
  if (!channel) throw new Error('Salon vérification introuvable.')

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🔐 Vérification — Donjon Rouge')
    .setDescription('Clique sur le bouton ci-dessous pour prouver que tu n\'es pas un robot et accéder au serveur.')

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kaptcha_verify')
      .setLabel('✅ Je ne suis pas un robot')
      .setStyle(ButtonStyle.Success)
  )

  const msg = await channel.send({ embeds: [embed], components: [row] })
  await supabase.from('bot_config').upsert({ key: 'kaptcha_message_id', value: msg.id, updated_at: new Date().toISOString() })
}

module.exports = { sendKaptcha }
