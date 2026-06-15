require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const supabase = require('../supabase.js')
const { getPlayer } = require('../cocApi.js')
const { assignHdvRole } = require('../utils/assignHdvRole.js')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
})

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  if (!guild) {
    console.error('Guild introuvable. Vérifie DISCORD_GUILD_ID dans .env')
    process.exit(1)
  }

  const { data: links, error } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag, coc_name')
    .eq('is_primary', true)

  if (error) {
    console.error('Erreur de récupération des comptes liés:', error)
    process.exit(1)
  }

  console.log(`${links.length} compte(s) principal(aux) à traiter\n`)

  let updated = 0
  let errors = 0

  for (const link of links) {
    try {
      const member = await guild.members.fetch(link.discord_id).catch(() => null)
      if (!member) { errors++; continue }

      const player = await getPlayer(link.coc_tag)
      await assignHdvRole(member, player.townHallLevel)
      console.log(`✅ ${link.coc_name} → HDV ${player.townHallLevel}`)
      updated++
    } catch (err) {
      console.error(`❌ ${link.coc_name} (${link.coc_tag}) : ${err.message}`)
      errors++
    }

    await sleep(500)
  }

  console.log(`\nMigration terminée : ${updated} membre(s) mis à jour, ${errors} erreur(s)`)
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
