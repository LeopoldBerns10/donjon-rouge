const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { TICKET_CHANNEL_ID } = require('../config/tickets.js')
const supabase = require('../supabase.js')

async function sendTicketMessage(client) {
  const channel = await client.channels.fetch(TICKET_CHANNEL_ID)
  if (!channel) throw new Error('Salon tickets introuvable.')

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🎫 Support — Donjon Rouge')
    .setDescription("Tu as un problème, une question ou une demande ? Ouvre un ticket et l'équipe staff te répondra dès que possible.")
    .addFields({
      name: 'Comment ça marche ?',
      value: '1️⃣ Clique sur le bouton ci-dessous\n2️⃣ Un salon privé est créé\n3️⃣ Explique ton problème\n4️⃣ Le staff te répond\n5️⃣ Le ticket est clôturé une fois résolu',
    })

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel('🎫 Ouvrir un ticket')
      .setStyle(ButtonStyle.Success)
  )

  const msg = await channel.send({ embeds: [embed], components: [row] })
  await supabase.from('bot_config').upsert({ key: 'ticket_message_id', value: msg.id, updated_at: new Date().toISOString() })
}

module.exports = { sendTicketMessage }
