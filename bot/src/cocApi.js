const BASE = process.env.BACKEND_URL

async function get(path) {
  const res = await fetch(`${BASE}/api/coc${path}`)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
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

module.exports = { getClanInfo, getClanMembers, getClanMembersDR2, getCurrentWar, getWarLog, getRaidSeasons, getCwl, getPlayer, getLdcCurrent, getLdcCurrentDR2, getLdcWar }
