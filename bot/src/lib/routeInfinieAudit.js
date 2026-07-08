const supabase = require('../supabase.js')
const { log } = require('./botLogger.js')

const ROUTE_CHANNEL_ID = '1520108333846233098'

async function logMessageEdit(discordId, originalContent, newContent, action) {
  await supabase.from('route_infinie_message_edits').insert({
    discord_id:       discordId,
    original_content: originalContent ?? null,
    new_content:      newContent ?? null,
    action,
  }).catch(() => {})
}

async function handleMessageDelete(message, client) {
  if (message.channelId !== ROUTE_CHANNEL_ID) return
  if (message.author?.bot) return

  const discordId = message.author?.id ?? 'inconnu'
  const pseudo    = message.author?.username ?? 'Inconnu'
  const content   = message.content || null

  await logMessageEdit(discordId, content, null, 'deleted')

  const contentStr = content ? `"${content}"` : '*(contenu non récupérable)*'
  await log(client, 'ROUTE', `TRICHE SUSPECTÉE — **${pseudo}** a supprimé son message : ${contentStr}`, true).catch(() => {})
}

async function handleMessageUpdate(oldMessage, newMessage, client) {
  if (newMessage.channelId !== ROUTE_CHANNEL_ID) return
  if (newMessage.author?.bot) return

  const oldContent = oldMessage.content ?? null
  const newContent = newMessage.content ?? null

  if (oldContent === newContent) return

  const discordId = newMessage.author?.id ?? 'inconnu'
  const pseudo    = newMessage.author?.username ?? 'Inconnu'

  await logMessageEdit(discordId, oldContent, newContent, 'edited')
  await newMessage.delete().catch(() => {})

  const oldStr = oldContent ? `"${oldContent}"` : '*(inconnu)*'
  const newStr = newContent ? `"${newContent}"` : '*(inconnu)*'
  await log(client, 'ROUTE', `TRICHE SUSPECTÉE — **${pseudo}** a modifié son message : ${oldStr} → ${newStr}`, true).catch(() => {})
}

module.exports = { handleMessageDelete, handleMessageUpdate }
