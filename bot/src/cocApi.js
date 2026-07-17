'use strict'

const coc = require('./cocDirectApi.js')

const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

// ─── Mapper chemin → appel direct API CoC ────────────────────────────────────
// Reproduit l'ancienne interface apiGet(path) qui appelait le backend,
// mais appelle désormais cocDirectApi directement et écrit dans Supabase.

async function apiGet(path) {
  const playerMatch = path.match(/^\/player\/(.+)$/)
  if (playerMatch) return coc.getPlayerInfo(decodeURIComponent(playerMatch[1]))

  const ldcWarMatch = path.match(/^\/ldc\/war\/(.+)$/)
  if (ldcWarMatch) return coc.getLdcWarDetail(decodeURIComponent(ldcWarMatch[1]))

  switch (path) {
    case '/clan':               return coc.getClanInfo(DR1_TAG)
    case '/clan/members':
    case '/clan/dr1/members':   return coc.getClanMembers(DR1_TAG)
    case '/clan/dr2/members':   return coc.getClanMembers(DR2_TAG)
    case '/clan/war':
    case '/clan/dr1/war':       return coc.getCurrentWar(DR1_TAG)
    case '/clan/dr2/war':       return coc.getCurrentWar(DR2_TAG)
    case '/clan/warlog':        return coc.getClanWarLog(DR1_TAG)
    case '/clan/raids':         return coc.getClanRaidSeasons(DR1_TAG)
    case '/clan/cwl':           return coc.getClanLeagueGroup(DR1_TAG)
    case '/ldc/current':        return coc.buildLdcAssembled(DR1_TAG)
    case '/ldc/dr2/current':    return coc.buildLdcAssembled(DR2_TAG)
    default:
      throw new Error(`apiGet: chemin non supporté — ${path}`)
  }
}

// ─── Exports nommés (compatibilité avec tous les imports existants) ───────────

const getClanInfo       = ()       => coc.getClanInfo(DR1_TAG)
const getClanMembers    = ()       => coc.getClanMembers(DR1_TAG)
const getClanMembersDR2 = ()       => coc.getClanMembers(DR2_TAG)
const getCurrentWar     = ()       => coc.getCurrentWar(DR1_TAG)
const getWarLog         = ()       => coc.getClanWarLog(DR1_TAG)
const getRaidSeasons    = ()       => coc.getClanRaidSeasons(DR1_TAG)
const getCwl            = ()       => coc.getClanLeagueGroup(DR1_TAG)
const getPlayer         = (tag)    => coc.getPlayerInfo(tag)
const getLdcCurrent     = ()       => coc.buildLdcAssembled(DR1_TAG)
const getLdcCurrentDR2  = ()       => coc.buildLdcAssembled(DR2_TAG)
const getLdcWar         = (warTag) => coc.getLdcWarDetail(warTag)
const flushCocCache     = ()       => coc.flushPlayerAndMembersCache()

// ─── Helpers inchangés ────────────────────────────────────────────────────────

function parseWarTime(str) {
  if (!str) return null
  const s = str.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
  return new Date(s)
}

function normalizeWar(war, ourTag) {
  if (!war) return war
  if (war.clan?.tag === ourTag) return war
  if (war.opponent?.tag === ourTag) return { ...war, clan: war.opponent, opponent: war.clan }
  return war
}

function extractClanGamePoints(data) {
  if (data?.clanGamePoints != null) return data.clanGamePoints
  if (data?.clanGames        != null) return data.clanGames
  return data?.achievements?.find(a => a.name === 'Games Champion')?.value ?? 0
}

async function getPlayerClanGamePoints(playerTag) {
  const data = await getPlayer(playerTag)
  if (playerTag === '#YQCULYQ90') {
    console.log('[DEBUG] payload complet :', JSON.stringify(data, null, 2))
    console.log('[DEBUG] clanGamePoints:', data?.clanGamePoints,
                '| clanGames:', data?.clanGames,
                '| Games Champion achievement:', data?.achievements?.find(a => a.name === 'Games Champion'))
  }
  return extractClanGamePoints(data)
}

module.exports = {
  apiGet,
  parseWarTime,
  normalizeWar,
  getClanInfo,
  getClanMembers,
  getClanMembersDR2,
  getCurrentWar,
  getWarLog,
  getRaidSeasons,
  getCwl,
  getPlayer,
  getPlayerClanGamePoints,
  extractClanGamePoints,
  getLdcCurrent,
  getLdcCurrentDR2,
  getLdcWar,
  flushCocCache,
}
