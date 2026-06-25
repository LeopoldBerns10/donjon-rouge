const BASE = process.env.BACKEND_URL

async function get(path) {
  const res = await fetch(`${BASE}/api/coc${path}`)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
}

async function flushCocCache() {
  try {
    const res = await fetch(`${BASE}/api/coc/cache/flush`, {
      method: 'POST',
      headers: { 'x-bot-secret': process.env.BOT_SECRET ?? '' },
    })
    if (!res.ok) console.warn('[JDC] flushCocCache HTTP', res.status, await res.text())
  } catch (e) {
    console.warn('[JDC] flushCocCache:', e.message)
  }
}

const getClanInfo    = ()    => get('/clan')
const getClanMembers    = ()    => get('/clan/members')
const getClanMembersDR2 = ()    => get('/clan/dr2/members')
const getCurrentWar  = ()    => get('/clan/war')
const getWarLog      = ()    => get('/clan/warlog')
const getRaidSeasons = ()    => get('/clan/raids')
const getCwl         = ()    => get('/clan/cwl')
const getPlayer      = (tag) => get(`/player/${encodeURIComponent(tag)}`)
const getLdcCurrent    = ()    => get('/ldc/current')
const getLdcCurrentDR2 = ()    => get('/ldc/dr2/current')
const getLdcWar        = (warTag) => get(`/ldc/war/${encodeURIComponent(warTag)}`)

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

module.exports = { getClanInfo, getClanMembers, getClanMembersDR2, getCurrentWar, getWarLog, getRaidSeasons, getCwl, getPlayer, getPlayerClanGamePoints, extractClanGamePoints, getLdcCurrent, getLdcCurrentDR2, getLdcWar, flushCocCache }
