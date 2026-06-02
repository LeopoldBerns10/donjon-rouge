const { ROLES } = require('../config/onboarding.js')
const { invalidateMembresCache } = require('../lib/panelHandlers.js')

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      await member.roles.add(ROLES.NON_VERIFIE)
    } catch (err) {
      console.error('[guildMemberAdd] Impossible d\'attribuer NON_VERIFIE:', err)
    }

    try {
      await member.send(
        'Bienvenue sur le serveur Donjon Rouge ! Rends-toi dans le salon vérification pour accéder au serveur.'
      )
    } catch {
      // DMs désactivés
    }

    invalidateMembresCache()
  },
}
