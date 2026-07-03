require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })

const BASE = process.env.BACKEND_URL

async function main() {
  if (!BASE) {
    console.error('BACKEND_URL non défini dans .env')
    process.exit(1)
  }

  const url = `${BASE}/api/coc/clan/raids`
  console.log(`Appel : ${url}\n`)

  const res = await fetch(url)
  if (!res.ok) {
    console.error(`Erreur HTTP ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const data = await res.json()
  const items = data?.items || []

  if (!items.length) {
    console.log('Aucune saison de raid retournée.')
    return
  }

  console.log(`${items.length} saison(s) retournée(s) :\n`)
  for (const [i, season] of items.entries()) {
    console.log(`— Saison ${i + 1}`)
    console.log(`  state     : ${season.state}`)
    console.log(`  startTime : ${season.startTime}`)
    console.log(`  endTime   : ${season.endTime}`)
    console.log(`  members   : ${season.members?.length ?? 0}`)
    console.log(`  attacks   : ${season.totalAttacks ?? '—'}`)
    console.log(`  loot      : ${season.capitalTotalLoot ?? '—'}`)
    console.log()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
