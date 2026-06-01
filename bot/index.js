require('dotenv').config()
const { Client, GatewayIntentBits, Collection } = require('discord.js')
const { readdirSync } = require('fs')
const { join } = require('path')
const { startScheduler } = require('./src/scheduler.js')
const { getOrCreateAccountMessage } = require('./src/accountMessage.js')

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

client.once('ready', () => {
  startScheduler(client)
  getOrCreateAccountMessage(client).catch(e => console.error('[AccountMessage] Erreur démarrage:', e))
})

client.login(process.env.DISCORD_TOKEN)
