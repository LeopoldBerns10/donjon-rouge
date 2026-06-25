require('dotenv').config()
const supabase = require('../supabase.js')
const { getPlayer, extractClanGamePoints, getClanMembersDR2 } = require('../cocApi.js')

const SEASON = '2026-06'
const sleep  = ms => new Promise(r => setTimeout(r, ms))

// ── DR1 — tags vérifiés via debugBaselines.js ──────────────────────────────
// Pour les membres cross-clan (DR1+DR2), la valeur known est déjà le MAX(DR1, DR2).
const KNOWN_DR1 = [
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
  { tag: '#P22QJVVJY', known: 5000  }, // youles     — max(DR1=0, DR2=5000)
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
  { tag: '#GV02R22CG', known: 10050 }, // Theman6    — DR1=DR2=10050
  { tag: '#GUYP0CPQC', known: 10250 }, // zaabdel
  { tag: '#2QJG0CLVC', known: 5000  }, // ●Savior●   — DR1=DR2=5000
  { tag: '#2UU9CJRL',  known: 0     }, // egane54
  { tag: '#GJV8QG9JL', known: 0     }, // tourtasse
  { tag: '#G9G2L992Y', known: 0     }, // RAPHAËL
  { tag: '#LVLYUC2QG', known: 2150  }, // YOULES2RUSH
  { tag: '#YUQ9UUYV9', known: 5100  }, // 404_mike
  { tag: '#2J2Q8R2R9', known: 6500  }, // Inglo_D    — max(DR1=0, DR2=6500)
  { tag: '#GJP29P8JG', known: 0     }, // KD2L 3rd
  { tag: '#QJJQGC2QC', known: 5450  }, // VORTEX     — max(DR1=300, DR2=5450)
  { tag: '#QPPUVJQGL', known: 5450  }, // RotatoR™   — DR1=DR2=5450
]

// ── DR2-only — known par nom exact (tags récupérés dynamiquement via getClanMembersDR2) ──
// Ne pas lister ici les membres déjà dans KNOWN_DR1 (ils seront ignorés par déduplication).
const DR2_KNOWN_BY_NAME = {
  '꧁ORYX꧂':       800,
  'Dina_Malefika': 10000,
  'Ayreon':        0,
  'Jiraqix':       10100,
  'carla':         3200,
  'DrayZ-2':       5050,
  'KD2L 2nd':      400,
  'Judo Range':    2100,
}

;(async () => {
  // ── Construire la map DR1 ──
  const knownMap = {}
  for (const { tag, known } of KNOWN_DR1) {
    knownMap[tag] = Math.max(knownMap[tag] ?? 0, known)
  }

  // ── Récupérer les membres DR2 via l'API ──
  console.log('[resetBaselinesFix] Récupération des membres DR2...')
  let dr2Members = []
  try {
    const raw = await getClanMembersDR2()
    dr2Members = raw?.items ?? (Array.isArray(raw) ? raw : [])
    console.log(`  ✓ ${dr2Members.length} membres DR2 récupérés`)
  } catch (e) {
    console.error('  ✗ Impossible de récupérer DR2 :', e.message)
    process.exit(1)
  }

  // ── Ajouter les membres DR2 non déjà présents dans DR1 ──
  for (const m of dr2Members) {
    if (knownMap[m.tag] !== undefined) continue // déjà traité via DR1
    const known = DR2_KNOWN_BY_NAME[m.name] ?? 0
    if (!(m.name in DR2_KNOWN_BY_NAME)) {
      console.warn(`  ⚠  DR2 membre absent de DR2_KNOWN_BY_NAME : "${m.name}" (${m.tag}) → known=0`)
    }
    knownMap[m.tag] = known
  }

  const tags = Object.keys(knownMap)
  console.log(`\n[resetBaselinesFix] Saison ${SEASON} — ${tags.length} joueurs uniques (${KNOWN_DR1.length} DR1 + ${tags.length - KNOWN_DR1.length} DR2-only)`)

  // ── Suppression globale pour cette saison ──
  console.log('[resetBaselinesFix] Suppression des baselines existantes...')
  const { error: delErr } = await supabase
    .from('jdc_baselines')
    .delete()
    .eq('season', SEASON)
    .in('player_tag', tags)
  if (delErr) {
    console.error('[resetBaselinesFix] DELETE global échoué :', delErr.message)
    process.exit(1)
  }
  console.log('  ✓ Baselines supprimées\n')

  let ok = 0
  const failedTags = []

  for (const tag of tags) {
    const known = knownMap[tag]
    try {
      const player   = await getPlayer(tag)
      const current  = extractClanGamePoints(player)
      const baseline = Math.max(0, current - known)

      // Suppression individuelle (sécurité si re-run partiel)
      const { error: delOneErr } = await supabase
        .from('jdc_baselines')
        .delete()
        .eq('season', SEASON)
        .eq('player_tag', tag)
      if (delOneErr) throw new Error(`DELETE individuel : ${delOneErr.message} (code ${delOneErr.code})`)

      // INSERT pur (pas d'upsert — on vient de DELETE, pas de conflit possible)
      const { error: insErr } = await supabase
        .from('jdc_baselines')
        .insert({ player_tag: tag, clan_tag: 'all', season: SEASON, baseline_value: baseline })
      if (insErr) throw new Error(`INSERT : ${insErr.message} (code ${insErr.code}, hint: ${insErr.hint ?? '-'})`)

      const name = player.name ?? tag
      console.log(
        `  ✓  ${name.slice(0, 22).padEnd(23)} tag=${tag.padEnd(12)}` +
        `  current=${String(current).padStart(7)}  known=${String(known).padStart(6)}  → baseline=${baseline}`
      )
      ok++
    } catch (e) {
      console.error(`  ✗  ERREUR tag=${tag}  known=${known}`)
      console.error(`       ${e.message}`)
      failedTags.push(tag)
    }

    await sleep(200)
  }

  console.log(`\n[resetBaselinesFix] Terminé — ${ok} insérés, ${failedTags.length} erreurs`)
  if (failedTags.length > 0) {
    console.error('\n[resetBaselinesFix] Tags en erreur :')
    for (const t of failedTags) console.error(`  - ${t}  (known=${knownMap[t]})`)
  }
  process.exit(failedTags.length > 0 ? 1 : 0)
})()
