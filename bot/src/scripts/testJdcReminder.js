require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const supabase = require('../supabase.js')
const { sendJdcReminders } = require('../lib/jdcTracker.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  console.log(`[testJdcReminder] Connecté en tant que ${client.user.tag}`)

  const { data } = await supabase.from('bot_config').select('value').eq('key', 'jdc_end').maybeSingle()
  const endStr   = data?.value
  const daysLeft = endStr
    ? Math.max(1, Math.ceil((new Date(endStr).getTime() - Date.now()) / 86400000))
    : 1

  console.log(`[testJdcReminder] jdc_end = ${endStr ?? '(non configuré)'}, daysLeft = ${daysLeft}`)
  console.log('[testJdcReminder] Envoi des rappels…')

  const result = await sendJdcReminders(client, daysLeft)
  if (result) {
    console.log(`[testJdcReminder] ✅ ${result.zero} absent(s), ${result.partial} en cours.`)
  } else {
    console.log('[testJdcReminder] ❌ Erreur lors de l\'envoi.')
  }

  await client.destroy()
  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
