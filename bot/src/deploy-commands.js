require('dotenv').config()
const { REST, Routes } = require('discord.js')
const { readdirSync, statSync } = require('fs')
const { join } = require('path')

const commands = []
const commandsPath = join(__dirname, 'commands')

function loadCommands(dirPath) {
  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry)
    if (statSync(full).isDirectory()) {
      loadCommands(full)
    } else if (entry.endsWith('.js')) {
      const command = require(full)
      if (command?.data) commands.push(command.data.toJSON())
    }
  }
}
loadCommands(commandsPath)

const rest = new REST().setToken(process.env.DISCORD_TOKEN)
const clientId = process.env.DISCORD_CLIENT_ID
const guildId  = process.env.DISCORD_GUILD_ID

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId)

;(async () => {
  console.log(`Déploiement de ${commands.length} slash commands...`)
  await rest.put(route, { body: commands })
  console.log('Commandes déployées avec succès.')
})()
