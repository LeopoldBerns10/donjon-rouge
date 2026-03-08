import { getCached } from '../services/cacheService.js'
import {
  getClanInfo,
  getClanMembers,
  getPlayerInfo,
  getClanWarLog,
  getCurrentWar,
  getClanRaidSeasons,
  getClanLeagueGroup
} from '../services/cocApiService.js'

const CLAN_TAG = process.env.COC_CLAN_TAG || '#29292QPRC'

export async function clan(req, res) {
  try {
    const data = await getCached(`clan:${CLAN_TAG}`, () => getClanInfo(CLAN_TAG))
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function members(req, res) {
  try {
    const data = await getCached(`members:${CLAN_TAG}`, () => getClanMembers(CLAN_TAG))
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function war(req, res) {
  try {
    const data = await getCached(`war:${CLAN_TAG}`, () => getCurrentWar(CLAN_TAG))
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function warlog(req, res) {
  try {
    const data = await getCached(`warlog:${CLAN_TAG}`, () => getClanWarLog(CLAN_TAG))
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function raids(req, res) {
  try {
    const data = await getCached(`raids:${CLAN_TAG}`, () => getClanRaidSeasons(CLAN_TAG))
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function cwl(req, res) {
  try {
    const data = await getCached(`cwl:${CLAN_TAG}`, () => getClanLeagueGroup(CLAN_TAG))
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function player(req, res) {
  const tag = req.params.tag
  try {
    const data = await getCached(`player:${tag}`, () => getPlayerInfo(tag))
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
