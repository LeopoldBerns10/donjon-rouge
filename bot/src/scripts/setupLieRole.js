require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  if (!guild) {
    console.error('Guild introuvable. Vérifie DISCORD_GUILD_ID dans .env')
    process.exit(1)
  }

  await guild.roles.fetch()

  // Trouver la position la plus basse parmi les rôles de bots (managed)
  const botRoles = guild.roles.cache.filter(r => r.managed)
  const lowestBotPosition = botRoles.size > 0
    ? Math.min(...botRoles.map(r => r.position))
    : 1

  // Créer le rôle "Lié"
  const role = await guild.roles.create({
    name: 'Lié',
    color: 0x2E7D32,
    permissions: [],
    reason: 'Setup automatique du rôle Lié (compte CoC lié)',
  })

  // Positionner juste en dessous du rôle BOT le plus bas
  await role.setPosition(Math.max(1, lowestBotPosition - 1))

  console.log(`✓ Rôle "Lié" créé → ID : ${role.id} | Position : ${role.position}`)

  // Mettre à jour onboarding.js
  const configPath = path.join(__dirname, '../config/onboarding.js')
  let content = readFileSync(configPath, 'utf-8')

  if (content.includes('LIE:')) {
    content = content.replace(/LIE:\s*'[^']*'/, `LIE: '${role.id}'`)
  } else {
    content = content.replace(
      /^(const ROLES = \{[\s\S]*?)(})/m,
      `$1  LIE: '${role.id}',\n$2`
    )
  }

  writeFileSync(configPath, content, 'utf-8')
  console.log(`✓ ROLES.LIE sauvegardé dans src/config/onboarding.js`)

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
