const BASE = process.env.BACKEND_URL

async function apiGet(path) {
  const res = await fetch(`${BASE}/api/coc${path}`)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
}

async function flushCocCache() {
  try {
    const res = await fetch(`${BASE}/api/cache/flush/players`, {
      method: 'POST',
      headers: { 'x-bot-secret': process.env.BOT_SECRET ?? '' },
    })
    if (!res.ok) console.warn('[JDC] flushCocCache HTTP', res.status, await res.text())
  } catch (e) {
    console.warn('[JDC] flushCocCache:', e.message)
  }
}

const getClanInfo    = ()    => apiGet('/clan')
const getClanMembers    = ()    => apiGet('/clan/members')
const getClanMembersDR2 = ()    => apiGet('/clan/dr2/members')
const getCurrentWar  = ()    => apiGet('/clan/war')
const getWarLog      = ()    => apiGet('/clan/warlog')
const getRaidSeasons = ()    => apiGet('/clan/raids')
const getCwl         = ()    => apiGet('/clan/cwl')
const getPlayer      = (tag) => apiGet(`/player/${encodeURIComponent(tag)}`)
const getLdcCurrent    = ()    => apiGet('/ldc/current')
const getLdcCurrentDR2 = ()    => apiGet('/ldc/dr2/current')
const getLdcWar        = (warTag) => apiGet(`/ldc/war/${encodeURIComponent(warTag)}`)

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

module.exports = { apiGet, parseWarTime, normalizeWar, getClanInfo, getClanMembers, getClanMembersDR2, getCurrentWar, getWarLog, getRaidSeasons, getCwl, getPlayer, getPlayerClanGamePoints, extractClanGamePoints, getLdcCurrent, getLdcCurrentDR2, getLdcWar, flushCocCache }
