require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const supabase = require('../supabase.js')
const { ensureNextMonthEvents } = require('../lib/discordEvents.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  console.log(`[testNextMonthEvents] Connecté en tant que ${client.user.tag}`)

  // Calculer le mois cible (mois suivant)
  const now       = new Date()
  const nextDate  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const nextKey   = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}`
  const sentKey   = `next_month_events_${nextKey}`

  console.log(`[testNextMonthEvents] Mois cible : ${nextKey}`)

  // Supprimer la clé anti-doublon pour permettre le test
  const { error: delErr } = await supabase.from('bot_config').delete().eq('key', sentKey)
  if (!delErr) console.log(`[testNextMonthEvents] Clé anti-doublon supprimée : ${sentKey}`)

  console.log('[testNextMonthEvents] Appel de ensureNextMonthEvents…')
  try {
    await ensureNextMonthEvents(client)
    console.log('[testNextMonthEvents] ✅ Terminé.')
  } catch (e) {
    console.error('[testNextMonthEvents] ❌ Erreur :', e)
  }

  await client.destroy()
  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
