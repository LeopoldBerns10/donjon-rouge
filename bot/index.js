require('dotenv').config()
const { Client, GatewayIntentBits, Collection } = require('discord.js')
const { readdirSync } = require('fs')
const { join } = require('path')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
})

client.commands = new Collection()

const commandsPath = join(__dirname, 'src', 'commands')
for (const file of readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(join(commandsPath, file))
  if (command?.data && command?.execute) {
    client.commands.set(command.data.name, command)
  }
}

const eventsPath = join(__dirname, 'src', 'events')
for (const file of readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(join(eventsPath, file))
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client))
  } else {
    client.on(event.name, (...args) => event.execute(...args, client))
  }
}

client.login(process.env.DISCORD_TOKEN)
