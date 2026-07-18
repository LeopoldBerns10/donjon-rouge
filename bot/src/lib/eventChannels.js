const supabase = require('../supabase.js')

async function ensureEmbed(client, channelId, key, embed, components = []) {
  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel) return null

  const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
  if (data?.value) {
    try {
      const msg = await channel.messages.fetch(data.value)
      await msg.edit({ embeds: [embed], components })
      return msg
    } catch (e) {
      if (e.code === 10008 || e.httpStatus === 404) {
        await supabase.from('bot_config').delete().eq('key', key)
      } else {
        return null
      }
    }
  }

  const msg = await channel.send({ embeds: [embed], components })
  await supabase.from('bot_config').upsert({ key, value: msg.id, updated_at: new Date().toISOString() })
  return msg
}

async function replaceEmbed(client, channelId, key, embed, components = []) {
  const channel = await client.channels.fetch(channelId).catch(() => null)
  if (!channel) return null

  const { data } = await supabase.from('bot_config').select('value').eq('key', key).maybeSingle()
  if (data?.value) {
    try {
      const old = await channel.messages.fetch(data.value)
      await old.delete()
    } catch {}
    await supabase.from('bot_config').delete().eq('key', key)
  }

  const msg = await channel.send({ embeds: [embed], components })
  await supabase.from('bot_config').upsert({ key, value: msg.id, updated_at: new Date().toISOString() })
  return msg
}

module.exports = { ensureEmbed, replaceEmbed }
