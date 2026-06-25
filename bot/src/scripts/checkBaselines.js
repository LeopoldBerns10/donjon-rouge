require('dotenv').config()
const supabase = require('../supabase.js')

const SEASON = '2026-06'

;(async () => {
  // Compte total des lignes pour la saison
  const { count, error: countErr } = await supabase
    .from('jdc_baselines')
    .select('*', { count: 'exact', head: true })
    .eq('season', SEASON)

  if (countErr) {
    console.error('[checkBaselines] Erreur COUNT :', countErr.message)
    process.exit(1)
  }
  console.log(`[checkBaselines] jdc_baselines WHERE season='${SEASON}' → ${count} ligne(s)`)

  // Détail complet — tag, baseline
  const { data, error: listErr } = await supabase
    .from('jdc_baselines')
    .select('player_tag, baseline_value, created_at')
    .eq('season', SEASON)
    .order('baseline_value', { ascending: false })

  if (listErr) {
    console.error('[checkBaselines] Erreur SELECT :', listErr.message)
    process.exit(1)
  }

  console.log('\n TAG           BASELINE   CREATED_AT')
  console.log(' ' + '─'.repeat(55))
  for (const row of data) {
    const ts = row.created_at ? row.created_at.slice(0, 19).replace('T', ' ') : '—'
    console.log(
      `  ${row.player_tag.padEnd(14)} ${String(row.baseline_value).padStart(8)}   ${ts}`
    )
  }

  // Vérifie les doublons de player_tag (ne devrait plus y en avoir après migration)
  const tagCounts = {}
  for (const row of data) tagCounts[row.player_tag] = (tagCounts[row.player_tag] ?? 0) + 1
  const dupes = Object.entries(tagCounts).filter(([, n]) => n > 1)
  if (dupes.length > 0) {
    console.error('\n[checkBaselines] ⚠️  DOUBLONS DÉTECTÉS :')
    for (const [tag, n] of dupes) console.error(`  ${tag} → ${n} lignes`)
  } else {
    console.log('\n[checkBaselines] ✓ Aucun doublon de player_tag')
  }

  process.exit(0)
})()
