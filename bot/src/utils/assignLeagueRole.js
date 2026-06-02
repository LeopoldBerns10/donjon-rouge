const { readFileSync } = require('fs')
const path = require('path')

// Mapping depuis player.leagueTier.name (API COC) → rôle Discord custom
const LEAGUE_MAP = {
  'Skeleton League 1':        'Squelette 1',
  'Skeleton League 2':        'Squelette 2',
  'Skeleton League 3':        'Squelette 3',
  'Barbarian League 4':       'Barbare 4',
  'Barbarian League 5':       'Barbare 5',
  'Barbarian League 6':       'Barbare 6',
  'Archer League 7':          'Archer 7',
  'Archer League 8':          'Archer 8',
  'Archer League 9':          'Archer 9',
  'Wizard League 10':         'Sorcier 10',
  'Wizard League 11':         'Sorcier 11',
  'Wizard League 12':         'Sorcier 12',
  'Valkyrie League 13':       'Valkyrie 13',
  'Valkyrie League 14':       'Valkyrie 14',
  'Valkyrie League 15':       'Valkyrie 15',
  'Witch League 16':          'Sorcière 16',
  'Witch League 17':          'Sorcière 17',
  'Witch League 18':          'Sorcière 18',
  'Golem League 19':          'Golem 19',
  'Golem League 20':          'Golem 20',
  'Golem League 21':          'Golem 21',
  'P.E.K.K.A League 22':      'P.E.K.K.A 22',
  'P.E.K.K.A League 23':      'P.E.K.K.A 23',
  'P.E.K.K.A League 24':      'P.E.K.K.A 24',
  'Titan League 25':          'Electro Titan 25',
  'Titan League 26':          'Electro Titan 26',
  'Titan League 27':          'Electro Titan 27',
  'Dragon League 28':         'Dragon 28',
  'Dragon League 29':         'Dragon 29',
  'Dragon League 30':         'Dragon 30',
  'Electro League 31':        'Electro Dragon 31',
  'Electro League 32':        'Electro Dragon 32',
  'Electro League 33':        'Electro Dragon 33',
  'Legend League':            'Légende',
}

function loadLeagueRoles() {
  try {
    const raw = readFileSync(path.join(__dirname, '../config/leagueRoles.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function assignLeagueRole(member, leagueName) {
  const leagueRoles = loadLeagueRoles()
  if (!leagueRoles || Object.keys(leagueRoles).length === 0) {
    console.warn('leagueRoles.json vide ou absent — lance `npm run setup-roles` d\'abord')
    return
  }

  const allLeagueRoleIds = new Set(Object.values(leagueRoles))

  const toRemove = member.roles.cache.filter(r => allLeagueRoleIds.has(r.id))
  if (toRemove.size > 0) {
    await member.roles.remove([...toRemove.keys()])
  }

  const targetRoleName = LEAGUE_MAP[leagueName]
  if (!targetRoleName) return  // Unranked ou ligue sans mapping

  const targetRoleId = leagueRoles[targetRoleName]
  if (!targetRoleId) return

  await member.roles.add(targetRoleId)
}

module.exports = { assignLeagueRole }
