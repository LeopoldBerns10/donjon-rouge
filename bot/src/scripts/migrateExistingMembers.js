require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')

const ROLE_DONJON_ROUGE = '611125112519000064'
const ROLE_VISITEUR     = '1072532916955009095'
const ROLE_LIE          = '1511096527664320655'

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
})

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  if (!guild) {
    console.error('Guild introuvable. Vérifie DISCORD_GUILD_ID dans .env')
    process.exit(1)
  }

  console.log(`Guild : ${guild.name} — fetch des membres...`)
  const members = await guild.members.fetch()

  let updated = 0

  for (const [, member] of members) {
    const hasDR  = member.roles.cache.has(ROLE_DONJON_ROUGE)
    const hasVis = member.roles.cache.has(ROLE_VISITEUR)
    if (!hasDR && !hasVis) continue

    if (member.roles.cache.has(ROLE_LIE)) continue

    try {
      await member.roles.add(ROLE_LIE)
      console.log(`✅ ${member.user.tag} → rôle Lié attribué`)
      updated++
    } catch (err) {
      console.error(`❌ ${member.user.tag} : ${err.message}`)
    }
  }

  console.log(`\nMigration terminée : ${updated} membres mis à jour`)
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
