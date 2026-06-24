require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const { updateJdcEmbeds } = require('../lib/jdcTracker.js')
const { getClanMembers, getPlayer, extractClanGamePoints } = require('../cocApi.js')
const supabase = require('../supabase.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  console.log(`[startJdc] Connecté en tant que ${client.user.tag}`)

  try {
    await supabase.from('bot_config')
      .delete()
      .in('key', ['jdc_embed_dr1_id', 'jdc_embed_dr2_id'])
    console.log('[startJdc] Anciens messages embed supprimés de bot_config.')
  } catch (err) {
    console.error('[startJdc] Erreur suppression bot_config :', err.message)
  }

  // --- DEBUG baselines DR1 ---
  try {
    const raw     = await getClanMembers()
    const members = (raw?.items ?? (Array.isArray(raw) ? raw : [])).slice(0, 3)
    const tags    = members.map(m => m.tag)

    const { data: baselines } = await supabase
      .from('jdc_baselines')
      .select('player_tag, baseline_value')
      .eq('season', '2026-06')
      .eq('clan_tag', '#29292QPRC')
      .in('player_tag', tags)

    const baselineMap = Object.fromEntries((baselines || []).map(b => [b.player_tag, b.baseline_value]))

    for (const m of members) {
      const player  = await getPlayer(m.tag)
      const current = extractClanGamePoints(player)
      const base    = baselineMap[m.tag] ?? 'ABSENT'
      const delta   = base === 'ABSENT' ? '?' : current - base
      console.log(`[DEBUG] ${m.tag} | current=${current} | baseline=${base} | delta=${delta}`)
    }
  } catch (err) {
    console.error('[DEBUG] baselines DR1 :', err.message)
  }
  // --- FIN DEBUG ---

  try {
    await updateJdcEmbeds(client)
    console.log('[startJdc] Embeds recréés avec succès.')
  } catch (err) {
    console.error('[startJdc] Erreur updateJdcEmbeds :', err)
  }

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
