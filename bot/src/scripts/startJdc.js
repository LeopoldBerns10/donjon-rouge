require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const { updateJdcEmbeds } = require('../lib/jdcTracker.js')
const supabase = require('../supabase.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

// JDC Clash of Clans : du 22 au 28 du mois courant à 08:00 UTC
function currentJdcDates() {
  const now = new Date()
  const y   = now.getUTCFullYear()
  const m   = now.getUTCMonth()
  return {
    start: new Date(Date.UTC(y, m, 22, 8, 0, 0)).toISOString(),
    end:   new Date(Date.UTC(y, m, 28, 8, 0, 0)).toISOString(),
  }
}

client.once('ready', async () => {
  console.log(`[startJdc] Connecté en tant que ${client.user.tag}`)

  // ── 1. Lire l'état actuel de bot_config ─────────────────────────────────
  const { data: rows, error: fetchErr } = await supabase
    .from('bot_config')
    .select('key, value')
    .in('key', ['jdc_active', 'jdc_start', 'jdc_end'])

  if (fetchErr) {
    console.error('[startJdc] Lecture bot_config échouée :', fetchErr.message)
    await client.destroy()
    process.exit(1)
  }

  const cfg = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]))

  // ── 2. Upsert uniquement les clés absentes ───────────────────────────────
  const { start, end } = currentJdcDates()
  const toUpsert = []

  if (!cfg['jdc_active']) toUpsert.push({ key: 'jdc_active', value: 'true' })
  if (!cfg['jdc_start'])  toUpsert.push({ key: 'jdc_start',  value: start })
  if (!cfg['jdc_end'])    toUpsert.push({ key: 'jdc_end',    value: end })

  if (toUpsert.length > 0) {
    const { error: upsertErr } = await supabase
      .from('bot_config')
      .upsert(toUpsert, { onConflict: 'key' })
    if (upsertErr) {
      console.error('[startJdc] Écriture bot_config échouée :', upsertErr.message)
      await client.destroy()
      process.exit(1)
    }
    for (const r of toUpsert) console.log(`  ✓ bot_config.${r.key} = ${r.value}`)
  } else {
    console.log('[startJdc] bot_config déjà configuré — aucune modification.')
    console.log(`  jdc_active = ${cfg['jdc_active']}`)
    console.log(`  jdc_start  = ${cfg['jdc_start']}`)
    console.log(`  jdc_end    = ${cfg['jdc_end']}`)
  }

  // ── 3. Créer / mettre à jour l'embed unifié ──────────────────────────────
  try {
    await updateJdcEmbeds(client)
    console.log('[startJdc] Embed JDC créé avec succès.')
  } catch (err) {
    console.error('[startJdc] Erreur updateJdcEmbeds :', err)
  }

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
