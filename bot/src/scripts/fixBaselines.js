require('dotenv').config()
const supabase = require('../supabase.js')
const { getPlayer, getClanMembers, getClanMembersDR2, extractClanGamePoints } = require('../cocApi.js')

const SEASON = '2026-06'
const sleep  = ms => new Promise(r => setTimeout(r, ms))

// Points gagnés pendant le JDC 2026-06, fournis manuellement.
// baseline_value = extractClanGamePoints(player) - pointsConnus
const KNOWN_DR1 = {
  'CyberAlf':        10050,
  'Peklenc':          5000,
  'Pogeiwa':         10700,
  'zaabdel':         10250,
  'Inglo':           10400,
  'wArmUp':           5100,
  'le gg':           10050,
  'Theman6':         10050,
  'RoтaтoЯ™':         5450,
  'DrayZ':            5000,
  'jeremie0411':      5000,
  'OryxBattel':       4650,
  '●Savior●':         5000,
  'SkunK':            6500,
  'Didousse':        10000,
  '★ᴮᴼˢˢ ᭄HEDAY...': 4050, // nom tronqué — correspondance par préfixe
  'toms6o':           4050,
  'Cénation':         5800,
  'team leduc':       3000,
  '404_mike':         2400,
  'TarKhon':          2100,
  'Hisoka':           1800,
  'natou le boss':    1750,
  'YOULES2RUSH':      1000,
  'ABRA':             1000,
  'cookie':            950,
  'KD2L':                0,
  'Hibou.KD':            0,
  'Barbar':              0,
  'LEGENDASTRONO':       0,
  'San Andreas':         0,
  'un mec qui te b':     0,
  'Axel':                0,
  'Gotenks':             0,
  'Starbowtix':          0,
  'Joker':               0,
  'egane54':             0,
  'tourtasse':           0,
  'RAPHAËL':             0,
  'KD2L 3rd':            0,
  'VO͜͡R͜͡T͜͡E͜͡X':              0,
}

const KNOWN_DR2 = {
  'Dina_Malefika': 10000,
  'Jiraqix':       10100,
  'Theman6':       10050,
  'RotatoR™':       5450,
  'DrayZ-2':        5050,
  'youles':         4050,
  'Inglo_D':        6500,
  'VORTEX':         5450,
  '•Savior•':       5000,
  'carla':          3200,
  'Judo Range':     2100,
  'KD2L 2nd':        400,
  '꧁ORYX꧂':            0,
  'Ayreon':            0,
}

function lookupKnown(memberName, knownMap) {
  if (knownMap[memberName] !== undefined) return knownMap[memberName]
  // Correspondance par préfixe pour les noms tronqués avec '...'
  for (const [known, pts] of Object.entries(knownMap)) {
    if (known.endsWith('...') && memberName.startsWith(known.slice(0, -3))) return pts
  }
  return null
}

async function fixClan(clanTag, clanKey, knownMap) {
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
    await fixClan('#29292QPRC', 'dr1', KNOWN_DR1)
    await fixClan('#2RCGG9YR9', 'dr2', KNOWN_DR2)
    console.log('\n[fixBaselines] Terminé.')
  } catch (e) {
    console.error('[fixBaselines] Erreur fatale :', e)
  }
  process.exit(0)
})()
