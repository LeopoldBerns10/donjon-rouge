const { SlashCommandBuilder } = require('discord.js')
const { handleMsgRappelGuerre } = require('../../lib/messagingHandlers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('msg-rappel-guerre')
    .setDescription('Envoie un rappel DM aux guerriers sans attaque (GDC/LDC)'),

  async execute(interaction) {
    await handleMsgRappelGuerre(interaction)
  },
}
