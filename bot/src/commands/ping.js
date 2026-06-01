const { SlashCommandBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifie si le bot est en ligne'),

  async execute(interaction) {
    const ms = Date.now() - interaction.createdTimestamp
    await interaction.reply(`Pong! \`${ms}ms\``)
  },

  async handlePrefix(message) {
    const ms = Date.now() - message.createdTimestamp
    await message.reply(`Pong! \`${ms}ms\``)
  }
}
