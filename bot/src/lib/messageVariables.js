function fmt(date) {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function resolveVariables(text, member, channel = null) {
  if (!text || typeof text !== 'string') return text ?? ''

  const { user, guild } = member
  const now = new Date()

  const vars = {
    '{user}':                        `<@${user.id}>`,
    '{user.id}':                     user.id,
    '{user.username}':               user.username,
    '{user.nickname}':               member.nickname ?? user.username,
    '{user.globalname}':             user.globalName ?? user.username,
    '{user.tag}':                    user.tag ?? user.username,
    '{user.rolecount}':              String(Math.max(0, member.roles.cache.size - 1)),
    '{user.created_at}':             fmt(user.createdAt),
    '{user.joined_at}':              fmt(member.joinedAt),
    '{server}':                      guild.name,
    '{server.id}':                   guild.id,
    '{server.name}':                 guild.name,
    '{server.membercount}':          String(guild.memberCount),
    '{server.humancount}':           String(guild.members.cache.filter(m => !m.user.bot).size),
    '{server.botcount}':             String(guild.members.cache.filter(m => m.user.bot).size),
    '{server.rolecount}':            String(guild.roles.cache.size),
    '{server.channelcount}':         String(guild.channels.cache.size),
    '{server.boosts.level}':         String(guild.premiumTier),
    '{server.boosts.count}':         String(guild.premiumSubscriptionCount ?? 0),
    '{server.created_at}':           fmt(guild.createdAt),
    '{channel}':                     channel ? `<#${channel.id}>` : '',
    '{channel.id}':                  channel?.id ?? '',
    '{channel.name}':                channel?.name ?? '',
    '{channel.created_at}':          channel ? fmt(channel.createdAt) : '',
    '{channel.parent}':              channel?.parent ? `<#${channel.parent.id}>` : '',
    '{channel.parent.id}':           channel?.parent?.id ?? '',
    '{channel.parent.name}':         channel?.parent?.name ?? '',
    '{channel.parent.created_at}':   channel?.parent ? fmt(channel.parent.createdAt) : '',
    '{date}':                        `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    '{time}':                        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  }

  let result = text
  for (const [k, v] of Object.entries(vars)) {
    result = result.replaceAll(k, v)
  }
  return result
}

module.exports = { resolveVariables }
