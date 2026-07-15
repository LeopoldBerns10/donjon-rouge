const LOG_CHANNEL_ID = '1522722935918559364'

async function log(client, category, message, isError = false) {
  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const timestamp = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
  const emoji = isError ? '🔴' : getCategoryEmoji(category)

  await channel.send(`${emoji} \`[${timestamp}]\` **${category}** — ${message}`).catch(() => {})
}

function getCategoryEmoji(category) {
  const emojis = {
    'SCHEDULER':    '⚙️',
    'COMMANDE':     '🎮',
    'BOUTON':       '🖱️',
    'ANNIVERSAIRE': '🎂',
    'SONDAGE':      '📊',
    'ROUTE':        '🗺️',
    'GUERRE':       '⚔️',
    'RAID':         '💎',
    'JDC':          '🎮',
    'MEMBRE':       '👤',
    'ERREUR':       '🔴',
    'EVENT':        '📅',
    'GDC':          '✉️',
    'MODERATION':   '🛡️',
  }
  return emojis[category] ?? '📝'
}

module.exports = { log }
