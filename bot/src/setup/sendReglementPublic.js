const { buildReglementEmbed, REGLEMENT_TEXT } = require('./sendReglement.js')
const supabase = require('../supabase.js')

const PUBLIC_CHANNEL_ID = '768557389154615307'

async function sendReglementPublic(client) {
  const channel = await client.channels.fetch(PUBLIC_CHANNEL_ID)
  if (!channel) throw new Error('Salon règlement public introuvable.')

  const message = await channel.send({ embeds: [buildReglementEmbed(REGLEMENT_TEXT)] })

  await supabase
    .from('bot_config')
    .upsert({ key: 'reglement_public_message_id', value: message.id }, { onConflict: 'key' })
}

module.exports = { sendReglementPublic, PUBLIC_CHANNEL_ID }
