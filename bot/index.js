require('dotenv').config()
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js')
const { readdirSync, statSync } = require('fs')
const { join } = require('path')
const { startScheduler } = require('./src/scheduler.js')
const { getOrCreateAccountMessage, getAccountMessageId } = require('./src/accountMessage.js')
const { ACCOUNT_CHANNEL_ID } = require('./src/config/reminders.js')


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel],
})

client.commands = new Collection()

function loadCommands(dirPath) {
  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry)
    if (statSync(full).isDirectory()) {
      loadCommands(full)
    } else if (entry.endsWith('.js')) {
      const command = require(full)
      if (command?.data && command?.execute) {
        client.commands.set(command.data.name, command)
      }
    }
  }
}
loadCommands(join(__dirname, 'src', 'commands'))

const eventsPath = join(__dirname, 'src', 'events')
for (const file of readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(join(eventsPath, file))
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client))
  } else {
    client.on(event.name, (...args) => event.execute(...args, client))
  }
}

client.once('ready', async () => {
  const guild = client.guilds.cache.first()
  if (guild) await guild.members.fetch().catch(e => console.error('[Ready] Erreur fetch membres:', e))

  startScheduler(client)
  getOrCreateAccountMessage(client).catch(e => console.error('[AccountMessage] Erreur démarrage:', e))

  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(ACCOUNT_CHANNEL_ID).catch(() => null)
      if (!channel) return
      const messages = await channel.messages.fetch({ limit: 50 })
      const mainId   = getAccountMessageId()
      const fiveMin  = 5 * 60 * 1000
      for (const msg of messages.values()) {
        if (msg.id === mainId) continue
        if (Date.now() - msg.createdTimestamp > fiveMin) {
          msg.delete().catch(() => {})
        }
      }
    } catch (err) {
      console.error('[Cleanup] Erreur nettoyage salon compte:', err)
    }
  }, 60_000)
})

client.login(process.env.DISCORD_TOKEN)
