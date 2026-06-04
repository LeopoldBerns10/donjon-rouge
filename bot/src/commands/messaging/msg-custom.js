const { SlashCommandBuilder } = require('discord.js')
const { handleMsgCustom } = require('../../lib/messagingHandlers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('msg-custom')
    .setDescription('Envoie un message personnalisé à des membres sélectionnés'),

  async execute(interaction) {
    await handleMsgCustom(interaction)
  },
}
