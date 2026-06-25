require('dotenv').config()
const supabase = require('../supabase.js')
const { getClanMembers, getClanMembersDR2, getPlayer, extractClanGamePoints } = require('../cocApi.js')

const SEASON  = '2026-06'
const DR1_TAG = '#29292QPRC'
const DR2_TAG = '#2RCGG9YR9'
const sleep   = ms => new Promise(r => setTimeout(r, ms))

// Points gagnés pendant le JDC 2026-06 (référence manuelle).
// baseline = extractClanGamePoints(joueur) - points_connus
// → delta affiché = actuel - baseline = points_connus (exact)
const KNOWN_DR1 = {
  'CyberAlf':        10050,
  'Peklenc':          5000,
  'Pogeiwa':         10700,
  'zaabdel':         10250,
  'Inglo':           10400,
  'wArmUp':           5100,
  'le gg':           10050,
  'Theman6':             0,
  'RotatoR™':         5450,
  'DrayZ':            5000,
  'jeremie0411':      5000,
  'OryxBattel':       5300,
  '•Savior•':         5000,
  'SkunK':            6500,
  'Didousse':        10000,
  '★ᴮᴼˢˢ...':        4050, // correspondance par préfixe (nom tronqué)
  'toms6o':           4950,
  'Cénation':         5800,
  'team leduc':       3000,
  '404_mike':         5100,
  'TarKhon':          2100,
  'Hisoka':           4600,
  'natou le boss':    2450,
  'YOULES2RUSH':      2150,
  'ABRA':             1000,
  'cookie':            950,
  'KD2L':             3350,
  'Hibou.KD':            0,
  'Barbar':              0,
  'LEGENDASTRONO':       0,
  'San Andreas':         0,
  'youles':              0,
  'un mec qui te b':     0,
  'Axel':                0,
  'Gotenks':             0,
  'Joker':               0,
  'egane54':             0,
  'tourtasse':           0,
  'RAPHAËL':             0,
  'Inglo_D':             0,
  'KD2L 3rd':            0,
  'VORTEX':            300,
  'Starbowtix':        300,
}

const KNOWN_DR2 = {
  'Dina_Malefika': 10000,
  'Jiraqix':       10100,
  'Theman6':       10050,
  'RotatoR™':       5450,
  'DrayZ-2':        5050,
  'youles':         6000,
  'Inglo_D':        6500,
  'VORTEX':         5450,
  '•Savior•':       5000,
  'carla':          3200,
  'Judo Range':     2100,
  'ORYX':            800,
  'KD2L 2nd':        400,
  'Ayreon':            0,
}

function lookupKnown(memberName, knownMap) {
  if (knownMap[memberName] !== undefined) return knownMap[memberName]
  for (const [known, pts] of Object.entries(knownMap)) {
    if (known.endsWith('...') && memberName.startsWith(known.slice(0, -3))) return pts
  }
  return null
}

async function resetClan(clanTag, clanKey, knownMap) {
  const raw     = clanKey === 'dr1' ? await getClanMembers() : await getClanMembersDR2()
  const members = raw?.items ?? (Array.isArray(raw) ? raw : [])

  console.log(`\n── ${clanKey.toUpperCase()} (${clanTag}) — ${members.length} membres ──`)

  let ok = 0, skipped = 0, errors = 0

  for (const m of members) {
    const knownPts = lookupKnown(m.name, knownMap)

    if (knownPts === null) {
      console.log(`  ⚠  ${m.name.padEnd(26)} (${m.tag}) — absent de la liste, ignoré`)
      skipped++
      continue
    }

    try {
      const player   = await getPlayer(m.tag)
      const current  = extractClanGamePoints(player)
      const baseline = Math.max(0, current - knownPts)

      await supabase.from('jdc_baselines').upsert(
        { player_tag: m.tag, clan_tag: clanTag, season: SEASON, baseline_value: baseline },
        { onConflict: 'player_tag,clan_tag,season' }
      )

      console.log(
        `  ✓  ${m.name.padEnd(26)} current=${String(current).padStart(7)}` +
        `  known=${String(knownPts).padStart(6)}  → baseline=${baseline}`
      )
      ok++
    } catch (e) {
      console.error(`  ✗  ${m.name} (${m.tag}):`, e.message)
      errors++
    }

    await sleep(200)
  }

  console.log(`  → ${ok} mis à jour, ${skipped} ignorés, ${errors} erreurs`)
}

;(async () => {
  try {
    console.log(`[resetBaselines] Suppression des baselines existantes (saison ${SEASON})...`)

    const { error: e1 } = await supabase
      .from('jdc_baselines')
      .delete()
      .eq('season', SEASON)
      .eq('clan_tag', DR1_TAG)
    if (e1) throw new Error(`DELETE DR1 : ${e1.message}`)
    console.log(`  ✓ Baselines DR1 supprimées`)

    const { error: e2 } = await supabase
      .from('jdc_baselines')
      .delete()
      .eq('season', SEASON)
      .eq('clan_tag', DR2_TAG)
    if (e2) throw new Error(`DELETE DR2 : ${e2.message}`)
    console.log(`  ✓ Baselines DR2 supprimées`)

    await resetClan(DR1_TAG, 'dr1', KNOWN_DR1)
    await resetClan(DR2_TAG, 'dr2', KNOWN_DR2)

    console.log('\n[resetBaselines] Terminé.')
  } catch (e) {
    console.error('[resetBaselines] Erreur fatale :', e)
  }
  process.exit(0)
})()
