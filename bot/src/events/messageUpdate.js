const { handleMessageUpdate } = require('../lib/routeInfinieAudit.js')

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    await handleMessageUpdate(oldMessage, newMessage, client)
  },
}
