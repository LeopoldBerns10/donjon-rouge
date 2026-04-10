import fetch from 'node-fetch'

const BASE_URL = 'https://api.clashofclans.com/v1'

function headers() {
  return {
    Authorization: `Bearer ${process.env.COC_API_TOKEN}`,
    Accept: 'application/json'
  }
}

async function cocFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`CoC API ${res.status}: ${err}`)
  }
  return res.json()
}

export async function getClanInfo(clanTag) {
  return cocFetch(`/clans/${encodeURIComponent(clanTag)}`)
}

export async function getClanMembers(clanTag) {
  return cocFetch(`/clans/${encodeURIComponent(clanTag)}/members`)
}

export async function getPlayerInfo(playerTag) {
  return cocFetch(`/players/${encodeURIComponent(playerTag)}`)
}

export async function getClanWarLog(clanTag) {
  return cocFetch(`/clans/${encodeURIComponent(clanTag)}/warlog`)
}

export async function getCurrentWar(clanTag) {
  return cocFetch(`/clans/${encodeURIComponent(clanTag)}/currentwar`)
}

export async function getClanRaidSeasons(clanTag) {
  return cocFetch(`/clans/${encodeURIComponent(clanTag)}/capitalraidseasons?limit=3`)
}

export async function getClanLeagueGroup(clanTag) {
  return cocFetch(`/clans/${encodeURIComponent(clanTag)}/currentwar/leaguegroup`)
}

export async function getLdcWarDetail(warTag) {
  return cocFetch(`/clanwarleagues/wars/${encodeURIComponent(warTag)}`)
}
