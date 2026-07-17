'use strict'

const { Client } = require('clashofclans.js')
const supabase = require('./supabase.js')

const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'

// Singleton client — géré par clashofclans.js (token + IP automatiques)
const cocClient = new Client()

// ─── Initialisation (à appeler une fois au démarrage avant le scheduler) ───────
// Se connecte au portail developer.clashofclans.com avec les credentials,
// détecte l'IP courante du serveur et crée/met à jour la clé API en conséquence.
// En cas de 403 invalidIp en cours de session, la lib re-valide automatiquement.

async function initialize() {
  if (!process.env.COC_EMAIL || !process.env.COC_PASSWORD) {
    throw new Error('COC_EMAIL et COC_PASSWORD sont requis dans les variables d\'env')
  }
  await cocClient.login({
    email:    process.env.COC_EMAIL,
    password: process.env.COC_PASSWORD,
    keyName:  'donjon-rouge-bot',
    keyCount: 1,
  })
  console.log('[CoC] Connexion developer portal OK — clé API mise à jour avec l\'IP courante')
}

// ─── Cache Supabase ────────────────────────────────────────────────────────────

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

// ─── Appels API via client.rest (JSON brut CoC API, sans transformation) ───────
// client.rest.METHOD() retourne { body: <JSON brut> } — identique à l'ancienne
// cocFetch(), aucun changement de structure pour le reste du code.

async function getClanInfo(tag) {
  const { body } = await cocClient.rest.getClan(tag)
  await writeCache(`clan:${tag}`, body)
  return body
}

async function getClanMembers(tag) {
  const { body } = await cocClient.rest.getClanMembers(tag)
  await writeCache(`members:${tag}`, body)
  return body
}

async function getPlayerInfo(tag) {
  const { body } = await cocClient.rest.getPlayer(tag)
  await writeCache(`player:${tag}`, body)
  return body
}

async function getClanWarLog(tag) {
  const { body } = await cocClient.rest.getClanWarLog(tag)
  await writeCache(`warlog:${tag}`, body)
  return body
}

async function getCurrentWar(tag) {
  const { body } = await cocClient.rest.getCurrentWar(tag)
  await writeCache(`war:${tag}`, body)
  return body
}

async function getClanRaidSeasons(tag) {
  const { body } = await cocClient.rest.getCapitalRaidSeasons(tag, { limit: 3 })
  await writeCache(`raids:${tag}`, body)
  return body
}

async function getClanLeagueGroup(tag) {
  const { body } = await cocClient.rest.getClanWarLeagueGroup(tag)
  await writeCache(`ldc:group:${tag}`, body)
  return body
}

async function getLdcWarDetail(warTag) {
  const { body } = await cocClient.rest.getClanWarLeagueRound(warTag)
  await writeCache(`ldc:war:${warTag}`, body)
  return body
}

// ─── LDC assemblé (miroir exact du contrôleur backend ldcCurrent) ─────────────

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
  initialize,
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
