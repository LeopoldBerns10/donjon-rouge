const { ROLES } = require('../config/onboarding.js')
const { invalidateMembresCache } = require('../lib/panelHandlers.js')
const { resolveVariables } = require('../lib/messageVariables.js')
const supabase = require('../supabase.js')

const WELCOME_DM_DEFAULT = 'Bienvenue sur le serveur {server} ! Rends-toi dans le salon vérification pour accéder au serveur.'

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      await member.roles.add(ROLES.NON_VERIFIE)
    } catch (err) {
      console.error('[guildMemberAdd] Impossible d\'attribuer NON_VERIFIE:', err)
    }

    try {
      const { data } = await supabase.from('bot_config').select('value').eq('key', 'welcome_dm_msg').maybeSingle()
      const raw = data?.value ?? WELCOME_DM_DEFAULT
      await member.send(resolveVariables(raw, member, null))
    } catch {
      // DMs désactivés
    }

    try {
      await supabase.from('discord_member_events').insert({
        event_type: 'join',
        discord_id: member.id,
        username:   member.user.username,
      })
    } catch {}

    invalidateMembresCache()
  },
}
