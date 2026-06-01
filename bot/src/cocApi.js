const BASE = process.env.BACKEND_URL

async function get(path) {
  const res = await fetch(`${BASE}/api/coc${path}`)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
}

const getClanInfo    = ()    => get('/clan')
const getClanMembers = ()    => get('/clan/members')
const getCurrentWar  = ()    => get('/clan/war')
const getWarLog      = ()    => get('/clan/warlog')
const getRaidSeasons = ()    => get('/clan/raids')
const getCwl         = ()    => get('/clan/cwl')
const getPlayer      = (tag) => get(`/player/${encodeURIComponent(tag)}`)

module.exports = { getClanInfo, getClanMembers, getCurrentWar, getWarLog, getRaidSeasons, getCwl, getPlayer }
