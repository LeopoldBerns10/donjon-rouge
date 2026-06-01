const PREFIX = '!'

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return

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
