const { handleMessageDelete } = require('../lib/routeInfinieAudit.js')

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    await handleMessageDelete(message, client)
  },
}
