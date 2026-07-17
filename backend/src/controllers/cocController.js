import { getCached } from '../services/cacheService.js'

const CLAN_TAG = process.env.COC_CLAN_TAG || '#29292QPRC'

const CLAN_TAGS = {
  dr1: process.env.COC_CLAN_TAG_DR1 || '#29292QPRC',
  dr2: process.env.COC_CLAN_TAG_DR2 || '#2RCGG9YR9',
}

export async function clan(req, res) {
  try {
    const data = await getCached(`clan:${CLAN_TAG}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function members(req, res) {
  try {
    const data = await getCached(`members:${CLAN_TAG}`)
    const memberList = data?.items || data || []
    const enriched = await Promise.all(
      memberList.map(async (m) => {
        try {
          const player = await getCached(`player:${m.tag}`)
          return {
            ...m,
            attackWins: player.attackWins ?? 0,
            defenseWins: player.defenseWins ?? 0,
          }
        } catch {
          return { ...m, attackWins: 0, defenseWins: 0 }
        }
      })
    )
    if (data?.items) {
      res.json({ ...data, items: enriched })
    } else {
      res.json(enriched)
    }
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function war(req, res) {
  try {
    const data = await getCached(`war:${CLAN_TAG}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function warlog(req, res) {
  try {
    const data = await getCached(`warlog:${CLAN_TAG}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function raids(req, res) {
  try {
    const data = await getCached(`raids:${CLAN_TAG}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function cwl(req, res) {
  try {
    const data = await getCached(`cwl:${CLAN_TAG}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function player(req, res) {
  const tag = decodeURIComponent(req.params.tag)
  if (!tag) return res.status(400).json({ error: 'Tag manquant' })
  try {
    const data = await getCached(`player:${tag}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function ldcCurrent(req, res) {
  try {
    const group = await getCached(`ldc:group:${CLAN_TAG}`)

    if (!group || !group.rounds) {
      return res.json({ state: 'notInWar', rounds: [] })
    }

    const rounds = await Promise.all(
      (group.rounds || []).map(async (round, idx) => {
        const tags = (round.warTags || []).filter((t) => t !== '#0')
        const wars = await Promise.all(
          tags.map(async (tag) => {
            try {
              return await getCached(`ldc:war:${tag}`)
            } catch {
              return { warTag: tag, state: 'notStarted' }
            }
          })
        )
        const ourWar = wars.find((w) =>
          w?.clan?.tag === CLAN_TAG || w?.opponent?.tag === CLAN_TAG
        )
        return { roundIndex: idx + 1, warTag: ourWar?.tag || tags[0] || null, war: ourWar || null }
      })
    )

    res.json({ ...group, rounds })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function ldcWar(req, res) {
  const { warTag } = req.params
  try {
    const data = await getCached(`ldc:war:${warTag}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function ldcCurrentDR2(req, res) {
  const DR2_TAG = CLAN_TAGS.dr2
  try {
    const group = await getCached(`ldc:group:${DR2_TAG}`)

    if (!group || !group.rounds) {
      return res.json({ state: 'notInWar', rounds: [] })
    }

    const rounds = await Promise.all(
      (group.rounds || []).map(async (round, idx) => {
        const tags = (round.warTags || []).filter((t) => t !== '#0')
        const wars = await Promise.all(
          tags.map(async (tag) => {
            try {
              return await getCached(`ldc:war:${tag}`)
            } catch {
              return { warTag: tag, state: 'notStarted' }
            }
          })
        )
        const ourWar = wars.find((w) =>
          w?.clan?.tag === DR2_TAG || w?.opponent?.tag === DR2_TAG
        )
        return { roundIndex: idx + 1, warTag: ourWar?.tag || tags[0] || null, war: ourWar || null }
      })
    )

    res.json({ ...group, rounds })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

// ─── Routes dynamiques DR1 / DR2 ─────────────────────────────────────────────

export async function clanByKey(req, res) {
  const tag = CLAN_TAGS[req.params.clanKey]
  if (!tag) return res.status(404).json({ error: 'Clan inconnu' })
  try {
    const data = await getCached(`clan:${tag}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function membersByKey(req, res) {
  const tag = CLAN_TAGS[req.params.clanKey]
  if (!tag) return res.status(404).json({ error: 'Clan inconnu' })
  try {
    const data = await getCached(`members:${tag}`)
    const memberList = data?.items || data || []
    const enriched = await Promise.all(
      memberList.map(async (m) => {
        try {
          const player = await getCached(`player:${m.tag}`)
          return { ...m, attackWins: player.attackWins ?? 0, defenseWins: player.defenseWins ?? 0 }
        } catch {
          return { ...m, attackWins: 0, defenseWins: 0 }
        }
      })
    )
    if (data?.items) {
      res.json({ ...data, items: enriched })
    } else {
      res.json(enriched)
    }
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function warByKey(req, res) {
  const tag = CLAN_TAGS[req.params.clanKey]
  if (!tag) return res.status(404).json({ error: 'Clan inconnu' })
  try {
    const data = await getCached(`war:${tag}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

export async function warlogByKey(req, res) {
  const tag = CLAN_TAGS[req.params.clanKey]
  if (!tag) return res.status(404).json({ error: 'Clan inconnu' })
  try {
    const data = await getCached(`warlog:${tag}`)
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}
