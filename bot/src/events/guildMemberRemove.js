const { EmbedBuilder } = require('discord.js')
const { SORTIE_CHANNEL_ID } = require('../config/welcome.js')
const { invalidateMembresCache } = require('../lib/panelHandlers.js')
const { resolveVariables } = require('../lib/messageVariables.js')
const supabase = require('../supabase.js')
const { log } = require('../lib/botLogger.js')

function formatTimeSpent(joinedAt) {
  if (!joinedAt) return null

  const diffMs   = Date.now() - joinedAt.getTime()
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (totalDays < 1) return "moins d'un jour"

  const months = Math.floor(totalDays / 30)
  const days   = totalDays % 30

  if (months > 0) {
    const monthsStr = `${months} mois`
    const daysStr   = days > 0 ? ` et ${days} jour${days > 1 ? 's' : ''}` : ''
    return `${monthsStr}${daysStr}`
  }

  return `${totalDays} jour${totalDays > 1 ? 's' : ''}`
}

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    try {
      const channel = await member.client.channels.fetch(SORTIE_CHANNEL_ID).catch(() => null)
      if (!channel) return

      const [{ data: titleData }, { data: descData }] = await Promise.all([
        supabase.from('bot_config').select('value').eq('key', 'departure_title').maybeSingle(),
        supabase.from('bot_config').select('value').eq('key', 'departure_desc').maybeSingle(),
      ])
      const embedTitle = resolveVariables(titleData?.value ?? '👋 Un guerrier quitte le Donjon...', member, channel)
      const embedDesc  = resolveVariables(descData?.value ?? '**{user.displayname}** a quitté nos rangs.', member, channel)

      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle(embedTitle)
        .setDescription(embedDesc)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))

      const timeSpent = formatTimeSpent(member.joinedAt)
      if (timeSpent) {
        embed.addFields({ name: '⏱️ Temps passé parmi nous', value: timeSpent, inline: false })
      }

      const { data: link } = await supabase
        .from('discord_links')
        .select('coc_tag, coc_name')
        .eq('discord_id', member.id)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (link) {
        embed.addFields({ name: '⚔️ Compte COC', value: `${link.coc_name} ${link.coc_tag}`, inline: false })
      }

      embed.setFooter({ text: 'Donjon Rouge • Bonne continuation !' }).setTimestamp()

      await channel.send({ embeds: [embed] })
    } catch (err) {
      console.error('[guildMemberRemove]', err)
    }

    try {
      await supabase.from('discord_links').delete().eq('discord_id', member.id)
    } catch {}

    try {
      await supabase.from('discord_member_events').insert({
        event_type: 'leave',
        discord_id: member.id,
        username:   member.user.username,
      })
    } catch {}

    log(member.client, 'MEMBRE', `Membre parti : ${member.user.username} a quitté le serveur`).catch(() => {})
    invalidateMembresCache()
  },
}
