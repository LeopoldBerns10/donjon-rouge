const { handleRouteMessage } = require('../lib/routeInfinie.js')

const ROUTE_CHANNEL_ID = '1520108333846233098'
const PREFIX = '!'

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return

    if (message.channelId === ROUTE_CHANNEL_ID) {
      await handleRouteMessage(message)
      return
    }

    if (!message.content.startsWith(PREFIX)) return

    const [commandName, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/)
    const command = client.commands.get(commandName.toLowerCase())
    if (!command?.handlePrefix) return

    try {
      await command.handlePrefix(message, args)
    } catch (err) {
      console.error(`Erreur commande !${commandName}:`, err)
      await message.reply('Une erreur est survenue.')
    }
  }
}
