const { readFileSync } = require('fs')
const path = require('path')

// Mapping depuis player.leagueTier.name (API COC) → rôle Discord custom
// Les numéros sont globaux et continus : Skeleton 1-3, Barbarian 4-6, … Legend sans numéro
// Confirmation API : "P.E.K.K.A League 23" = 8e groupe → (8-1)*3 + 2 = 23
// Dans chaque groupe : n+0 = faible (I), n+1 = moyen (II), n+2 = fort (III)
const LEAGUE_MAP = {
  'Skeleton League 1':        'Squelette I',
  'Skeleton League 2':        'Squelette II',
  'Skeleton League 3':        'Squelette III',
  'Barbarian League 4':       'Barbare I',
  'Barbarian League 5':       'Barbare II',
  'Barbarian League 6':       'Barbare III',
  'Archer League 7':          'Archer I',
  'Archer League 8':          'Archer II',
  'Archer League 9':          'Archer III',
  'Wizard League 10':         'Sorcier I',
  'Wizard League 11':         'Sorcier II',
  'Wizard League 12':         'Sorcier III',
  'Valkyrie League 13':       'Valkyrie I',
  'Valkyrie League 14':       'Valkyrie II',
  'Valkyrie League 15':       'Valkyrie III',
  'Witch League 16':          'Sorcière I',
  'Witch League 17':          'Sorcière II',
  'Witch League 18':          'Sorcière III',
  'Golem League 19':          'Golem I',
  'Golem League 20':          'Golem II',
  'Golem League 21':          'Golem III',
  'P.E.K.K.A League 22':      'P.E.K.K.A I',
  'P.E.K.K.A League 23':      'P.E.K.K.A II',
  'P.E.K.K.A League 24':      'P.E.K.K.A III',
  'Electro Titan League 25':  'Electro Titan I',
  'Electro Titan League 26':  'Electro Titan II',
  'Electro Titan League 27':  'Electro Titan III',
  'Dragon League 28':         'Dragon I',
  'Dragon League 29':         'Dragon II',
  'Dragon League 30':         'Dragon III',
  'Electro Dragon League 31': 'Electro Dragon I',
  'Electro Dragon League 32': 'Electro Dragon II',
  'Electro Dragon League 33': 'Electro Dragon III',
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
