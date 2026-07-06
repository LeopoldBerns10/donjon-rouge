/**
 * Nettoyage initial (one-shot) du salon Logs bot.
 * Supprime TOUS les messages présents depuis le début.
 * À exécuter une seule fois depuis le terminal :
 *   node bot/src/scripts/purgeLogsChannel.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const { Client, GatewayIntentBits } = require('discord.js')

const LOG_CHANNEL_ID  = '1522722935918559364'
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

async function fetchAllMessages(channel) {
  const all = []
  let lastId = null
  while (true) {
    const options = { limit: 100 }
    if (lastId) options.before = lastId
    const batch = await channel.messages.fetch(options)
    if (!batch.size) break
    all.push(...batch.values())
    lastId = batch.last().id
    if (batch.size < 100) break
  }
  return all
}

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] })
  await client.login(process.env.DISCORD_TOKEN)
  await new Promise(r => client.once('clientReady', r))

  const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null)
  if (!channel) { console.error('❌ Salon Logs bot introuvable.'); process.exit(1) }

  console.log('📥 Récupération de tous les messages du salon Logs bot...')
  const all = await fetchAllMessages(channel)
  console.log(`   → ${all.length} message(s) trouvé(s).`)

  const now     = Date.now()
  const recent  = all.filter(m => now - m.createdTimestamp < FOURTEEN_DAYS_MS)
  const ancient = all.filter(m => now - m.createdTimestamp >= FOURTEEN_DAYS_MS)

  let deleted = 0

  // Messages < 14j : bulkDelete par lots de 100 (min 2 requis par Discord)
  for (let i = 0; i < recent.length; i += 100) {
    const batch = recent.slice(i, i + 100)
    if (batch.length >= 2) {
      await channel.bulkDelete(batch.map(m => m.id)).catch(() => {})
    } else {
      await batch[0].delete().catch(() => {})
    }
    deleted += batch.length
    process.stdout.write(`\r   → Supprimés : ${deleted}/${all.length}`)
  }

  // Messages >= 14j : suppression individuelle (hors limite bulkDelete)
  for (const msg of ancient) {
    await msg.delete().catch(() => {})
    deleted++
    process.stdout.write(`\r   → Supprimés : ${deleted}/${all.length}`)
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\n✅ Nettoyage terminé : ${deleted} message(s) supprimé(s).`)
  await client.destroy()
}

main().catch(e => { console.error(e); process.exit(1) })
