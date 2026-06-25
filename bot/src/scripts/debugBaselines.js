require('dotenv').config()
const supabase               = require('../supabase.js')
const { getClanMembers, getPlayer, extractClanGamePoints } = require('../cocApi.js')
const { CLANS }              = require('../config/jdcConfig.js')

const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  const clan = CLANS.find(c => c.key === 'dr1')

  // Saison depuis bot_config, fallback mois courant
  const { data: startCfg } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', 'jdc_start')
    .maybeSingle()

  const season = startCfg?.value
    ? startCfg.value.slice(0, 7)
    : new Date().toISOString().slice(0, 7)

  console.log(`\n[debugBaselines] Clan : ${clan.name} (${clan.tag})  —  Saison : ${season}\n`)

  // Membres DR1
  const raw     = await getClanMembers()
  const members = raw?.items ?? (Array.isArray(raw) ? raw : [])

  if (!members.length) {
    console.error('[debugBaselines] Aucun membre récupéré depuis l\'API CoC.')
    process.exit(1)
  }

  // Baselines stockées
  const { data: baselines } = await supabase
    .from('jdc_baselines')
    .select('player_tag, baseline_value')
    .eq('season', season)
    .eq('clan_tag', clan.tag)
    .in('player_tag', members.map(m => m.tag))

  const baselineMap = Object.fromEntries(
    (baselines || []).map(b => [b.player_tag, b.baseline_value])
  )

  const MISSING = baselines?.length === 0
    ? ' ⚠  Aucune baseline trouvée pour cette saison !\n'
    : ''
  if (MISSING) console.warn(MISSING)

  // En-tête
  const H = {
    name:     'NOM',
    tag:      'TAG',
    baseline: 'BASELINE',
    current:  'ACTUEL',
    delta:    'DELTA',
  }
  const W = { name: 26, tag: 13, baseline: 9, current: 8, delta: 8 }

  const row = (name, tag, baseline, current, delta) =>
    name.padEnd(W.name) +
    tag.padEnd(W.tag) +
    baseline.padStart(W.baseline) +
    current.padStart(W.current) +
    delta.padStart(W.delta)

  const SEP = '─'.repeat(W.name + W.tag + W.baseline + W.current + W.delta)

  console.log(row(H.name, H.tag, H.baseline, H.current, H.delta))
  console.log(SEP)

  let totalDelta = 0
  let missingCount = 0

  for (const m of members) {
    let current = 0
    try {
      const player = await getPlayer(m.tag)
      current = extractClanGamePoints(player)
    } catch (e) {
      console.error(`  ✗ ${m.name} (${m.tag}): ${e.message}`)
      await sleep(150)
      continue
    }

    const hasBaseline = Object.prototype.hasOwnProperty.call(baselineMap, m.tag)
    const baseline    = hasBaseline ? baselineMap[m.tag] : null
    const delta       = hasBaseline ? Math.max(0, current - baseline) : null

    if (delta !== null) totalDelta += delta
    else missingCount++

    console.log(row(
      m.name.slice(0, W.name - 1),
      m.tag,
      hasBaseline ? String(baseline) : 'N/A',
      String(current),
      delta !== null ? String(delta) : 'N/A',
    ))

    await sleep(150)
  }

  console.log(SEP)
  console.log(row(
    `TOTAL (${members.length - missingCount}/${members.length} membres)`,
    '',
    '',
    '',
    String(totalDelta),
  ))

  if (missingCount > 0) {
    console.log(`\n  ⚠  ${missingCount} membre(s) sans baseline — delta non compté dans le total.`)
  }

  console.log()
  process.exit(0)
})()
