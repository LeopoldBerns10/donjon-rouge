const { SlashCommandBuilder } = require('discord.js')
const { handleMsgRappelRaid } = require('../../lib/messagingHandlers.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('msg-rappel-raid')
    .setDescription('Envoie un rappel DM aux membres sans attaque de raid'),

  async execute(interaction) {
    await handleMsgRappelRaid(interaction)
  },
}
