require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const supabase = require('../supabase.js')
const { fetchSupercellEvents } = require('../lib/discordEvents.js')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildScheduledEvents,
  ],
})

client.once('ready', async () => {
  console.log(`[testSupercellEvents] Connecté en tant que ${client.user.tag}`)

  // Supprimer la clé anti-doublon du jour pour forcer l'exécution
  const now   = new Date()
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  const sentKey = `supercell_events_fetched_${today}`

  const { error: delErr } = await supabase.from('bot_config').delete().eq('key', sentKey)
  if (!delErr) console.log(`[testSupercellEvents] Clé anti-doublon supprimée : ${sentKey}`)

  console.log('[testSupercellEvents] Appel de fetchSupercellEvents...')
  try {
    await fetchSupercellEvents(client)
    console.log('[testSupercellEvents] ✅ Terminé.')
  } catch (e) {
    console.error('[testSupercellEvents] ❌ Erreur :', e)
  }

  await client.destroy()
  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
