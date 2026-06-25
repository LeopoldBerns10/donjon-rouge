require('dotenv').config()
const supabase = require('../supabase.js')
const { getPlayer, extractClanGamePoints } = require('../cocApi.js')

const SEASON = '2026-06'
const sleep  = ms => new Promise(r => setTimeout(r, ms))

// Points gagnés pendant le JDC 2026-06, identifiés par tag exact (API CoC).
// baseline = extractClanGamePoints(joueur) - known
// Pour les membres dans DR1 ET DR2 (même tag), on prend le MAX des deux entrées.
// Note : Ayreon (#R8QCP2VUU) — 0 pts connus JDC, baseline = valeur actuelle Games Champion.
const KNOWN_RAW = [
  // ── DR1 ──
  { tag: '#YQCULYQ90', known: 10050 }, // CyberAlf
  { tag: '#GPJG9LJCR', known: 5000  }, // Peklenc
  { tag: '#YL2GVUVLC', known: 3350  }, // KD2L
  { tag: '#YPG98U0U9', known: 4050  }, // ★ᴮᴼˢˢ
  { tag: '#99CVVR0QQ', known: 5000  }, // jeremie0411
  { tag: '#88VU8RYR',  known: 10400 }, // Inglo
  { tag: '#2QPP2RQ9J', known: 0     }, // Hibou.KD
  { tag: '#JPJ8L2PG',  known: 6500  }, // SkunK
  { tag: '#LVYRU2LLQ', known: 2100  }, // TarKhon
  { tag: '#YU9CJC08Q', known: 10700 }, // Pogeiwa
  { tag: '#222G00YJP', known: 4600  }, // Hisoka
  { tag: '#LLGY0GY2',  known: 3000  }, // team leduc
  { tag: '#G9CJU9UP0', known: 0     }, // Barbar
  { tag: '#2VR220C8',  known: 10000 }, // Didousse
  { tag: '#YCU2VC9VR', known: 0     }, // LEGENDASTRONO
  { tag: '#G9V9C9088', known: 0     }, // San Andreas
  { tag: '#P22QJVVJY', known: 0     }, // youles (DR1)
  { tag: '#J2222JCU',  known: 5300  }, // OryxBattel
  { tag: '#QGQRPG9LR', known: 0     }, // un mec qui te b
  { tag: '#P9RLU8QGG', known: 10050 }, // le gg
  { tag: '#RGYV02UY',  known: 2450  }, // natou le boss
  { tag: '#808V880CY', known: 4950  }, // toms6o
  { tag: '#YYC2G8R9Q', known: 5100  }, // wArmUp
  { tag: '#CG0RL8QQ',  known: 950   }, // cookie
  { tag: '#20Q9G0RV',  known: 5000  }, // DrayZ
  { tag: '#RVG2G0VQ',  known: 0     }, // Axel
  { tag: '#YUG89VY2C', known: 0     }, // Gotenks
  { tag: '#9YVP0YV',   known: 5800  }, // Cénation
  { tag: '#VUVJVGPY',  known: 300   }, // Starbowtix
  { tag: '#GQPG08YRV', known: 0     }, // Joker
  { tag: '#GV02R22CG', known: 10050 }, // Theman6 (DR1)
  { tag: '#GUYP0CPQC', known: 10250 }, // zaabdel
  { tag: '#2QJG0CLVC', known: 5000  }, // ●Savior● (DR1)
  { tag: '#2UU9CJRL',  known: 0     }, // egane54
  { tag: '#GJV8QG9JL', known: 0     }, // tourtasse
  { tag: '#G9G2L992Y', known: 0     }, // RAPHAËL
  { tag: '#LVLYUC2QG', known: 2150  }, // YOULES2RUSH
  { tag: '#YUQ9UUYV9', known: 5100  }, // 404_mike
  { tag: '#2J2Q8R2R9', known: 0     }, // Inglo_D (DR1)
  { tag: '#GJP29P8JG', known: 0     }, // KD2L 3rd
  { tag: '#QJJQGC2QC', known: 300   }, // VORTEX (DR1)
  { tag: '#QPPUVJQGL', known: 5450  }, // RotatoR™ (DR1)
  // ── DR2 — membres pas déjà dans DR1, ou avec un known plus élevé ──
  { tag: '#YCU8QROXL', known: 800   }, // ꧁ORYX꧂
  { tag: '#2CP089GL0', known: 10000 }, // Dina_Malefika
  { tag: '#GV02R22CG', known: 10050 }, // Theman6 (DR2 — même tag, même known)
  { tag: '#QPPUVJQGL', known: 5450  }, // RotatoR™ (DR2 — même tag)
  { tag: '#P22QJVVJY', known: 5000  }, // youles (DR2 — known plus élevé : 0→5000)
  { tag: '#2J2Q8R2R9', known: 6500  }, // Inglo_D (DR2 — known plus élevé : 0→6500)
  { tag: '#QJJQGC2QC', known: 5450  }, // VORTEX (DR2 — known plus élevé : 300→5450)
  { tag: '#2QJG0CLVC', known: 5000  }, // ●Savior● (DR2 — même known)
  { tag: '#R8QCP2VUU', known: 0     }, // Ayreon — 0 pts JDC connus, baseline = actuel
  { tag: '#GG9YPJ999', known: 10100 }, // Jiraqix
  { tag: '#9YJVV2GLP', known: 3200  }, // carla
  { tag: '#YU9LVPQ2R', known: 5050  }, // DrayZ-2
  { tag: '#GJUP29YLP', known: 400   }, // KD2L 2nd
  { tag: '#2RCPJVULP', known: 2100  }, // Judo Range
]

// Déduplique par tag en prenant le MAX des points connus
function buildKnownMap(raw) {
  const map = {}
  for (const { tag, known } of raw) {
    map[tag] = Math.max(map[tag] ?? 0, known)
  }
  return map
}

;(async () => {
  const knownMap = buildKnownMap(KNOWN_RAW)
  const tags = Object.keys(knownMap)

  console.log(`[resetBaselinesFix] Saison ${SEASON} — ${tags.length} joueurs uniques`)
  console.log('[resetBaselinesFix] Suppression des baselines existantes...')

  const { error: delErr } = await supabase
    .from('jdc_baselines')
    .delete()
    .eq('season', SEASON)
    .in('player_tag', tags)
  if (delErr) {
    console.error('[resetBaselinesFix] DELETE échoué :', delErr.message)
    process.exit(1)
  }
  console.log('  ✓ Baselines supprimées')

  let ok = 0, errors = 0

  for (const tag of tags) {
    const known = knownMap[tag]
    try {
      const player   = await getPlayer(tag)
      const current  = extractClanGamePoints(player)
      const baseline = Math.max(0, current - known)

      await supabase.from('jdc_baselines').upsert(
        { player_tag: tag, season: SEASON, baseline_value: baseline },
        { onConflict: 'player_tag,season' }
      )

      const name = player.name ?? tag
      console.log(
        `  ✓  ${name.slice(0, 22).padEnd(23)} current=${String(current).padStart(7)}` +
        `  known=${String(known).padStart(6)}  → baseline=${baseline}`
      )
      ok++
    } catch (e) {
      console.error(`  ✗  ${tag}:`, e.message)
      errors++
    }

    await sleep(200)
  }

  console.log(`\n[resetBaselinesFix] Terminé — ${ok} mis à jour, ${errors} erreurs`)
  process.exit(0)
})()
