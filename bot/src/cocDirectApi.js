'use strict'

const supabase = require('./supabase.js')

const COC_BASE = 'https://api.clashofclans.com/v1'
const DR1_TAG  = '#29292QPRC'
const DR2_TAG  = '#2RCGG9YR9'

function cocHeaders() {
  return {
    Authorization: `Bearer ${process.env.COC_API_TOKEN}`,
    Accept: 'application/json',
  }
}

async function cocFetch(path) {
  const res = await fetch(`${COC_BASE}${path}`, { headers: cocHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CoC API ${res.status}: ${text}`)
  }
  return res.json()
}

async function writeCache(key, data) {
  await supabase
    .from('coc_stats_cache')
    .upsert({ coc_tag: key, data, updated_at: new Date().toISOString() }, { onConflict: 'coc_tag' })
}

// Vide les entrées player:* et members:* (utilisé lors du JDC pour forcer un refresh)
async function flushPlayerAndMembersCache() {
  await supabase.from('coc_stats_cache').delete().like('coc_tag', 'player:%')
  await supabase.from('coc_stats_cache').delete().like('coc_tag', 'members:%')
  console.log('[CoC] Cache joueurs et membres vidé (Supabase)')
}

// ─── Fonctions de fetch direct + écriture cache Supabase ─────────────────────

async function getClanInfo(tag) {
  const data = await cocFetch(`/clans/${encodeURIComponent(tag)}`)
  await writeCache(`clan:${tag}`, data)
  return data
}

async function getClanMembers(tag) {
  const data = await cocFetch(`/clans/${encodeURIComponent(tag)}/members`)
  await writeCache(`members:${tag}`, data)
  return data
}

async function getPlayerInfo(tag) {
  const data = await cocFetch(`/players/${encodeURIComponent(tag)}`)
  await writeCache(`player:${tag}`, data)
  return data
}

async function getClanWarLog(tag) {
  const data = await cocFetch(`/clans/${encodeURIComponent(tag)}/warlog`)
  await writeCache(`warlog:${tag}`, data)
  return data
}

async function getCurrentWar(tag) {
  const data = await cocFetch(`/clans/${encodeURIComponent(tag)}/currentwar`)
  await writeCache(`war:${tag}`, data)
  return data
}

async function getClanRaidSeasons(tag) {
  const data = await cocFetch(`/clans/${encodeURIComponent(tag)}/capitalraidseasons?limit=3`)
  await writeCache(`raids:${tag}`, data)
  return data
}

async function getClanLeagueGroup(tag) {
  const data = await cocFetch(`/clans/${encodeURIComponent(tag)}/currentwar/leaguegroup`)
  await writeCache(`ldc:group:${tag}`, data)
  return data
}

async function getLdcWarDetail(warTag) {
  const data = await cocFetch(`/clanwarleagues/wars/${encodeURIComponent(warTag)}`)
  await writeCache(`ldc:war:${warTag}`, data)
  return data
}

// ─── LDC assemblé (miroir exact du contrôleur backend ldcCurrent) ─────────────
// Fetchs le groupe LDC + tous les détails de guerre de chaque round.
// Effet de bord : écrit toutes les clés ldc:group:* et ldc:war:* dans Supabase
// pour que le backend puisse les servir sans appeler l'API CoC.

async function buildLdcAssembled(clanTag) {
  let group
  try {
    group = await getClanLeagueGroup(clanTag)
  } catch {
    return { state: 'notInWar', rounds: [] }
  }

  if (!group?.rounds) return { state: 'notInWar', rounds: [] }

  const rounds = await Promise.all(
    (group.rounds || []).map(async (round, idx) => {
      const tags = (round.warTags || []).filter(t => t !== '#0')
      const wars = await Promise.all(
        tags.map(async (tag) => {
          try { return await getLdcWarDetail(tag) }
          catch { return { warTag: tag, state: 'notStarted' } }
        })
      )
      const ourWar = wars.find(w => w?.clan?.tag === clanTag || w?.opponent?.tag === clanTag)
      return { roundIndex: idx + 1, warTag: ourWar?.tag || tags[0] || null, war: ourWar || null }
    })
  )

  return { ...group, rounds }
}

// ─── Refresh core (appelé par le scheduler toutes les 30 min) ─────────────────
// Hydrate clan info, listes membres, données joueurs et warlogs dans Supabase.
// La guerre / LDC / raids sont déjà pris en charge par fetchWarData() du scheduler.

async function refreshCoreData() {
  for (const tag of [DR1_TAG, DR2_TAG]) {
    try { await getClanInfo(tag) }
    catch (e) { console.error(`[CoC] getClanInfo ${tag}:`, e.message) }

    let members = []
    try {
      const data = await getClanMembers(tag)
      members = data?.items || []
    } catch (e) { console.error(`[CoC] getClanMembers ${tag}:`, e.message) }

    for (const m of members) {
      try { await getPlayerInfo(m.tag) } catch {}
      await new Promise(r => setTimeout(r, 100))
    }

    try { await getClanWarLog(tag) }
    catch (e) { console.error(`[CoC] getWarLog ${tag}:`, e.message) }
  }

  console.log('[CoC] refreshCoreData terminé — cache Supabase hydraté')
}

module.exports = {
  getClanInfo,
  getClanMembers,
  getPlayerInfo,
  getClanWarLog,
  getCurrentWar,
  getClanRaidSeasons,
  getClanLeagueGroup,
  getLdcWarDetail,
  buildLdcAssembled,
  refreshCoreData,
  flushPlayerAndMembersCache,
}
