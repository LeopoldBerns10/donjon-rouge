require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs   = require('fs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const DISCORD_IDS = [
  '833418697896755229',
  '470541322206576653',
  '1446206068450529300',
  '1011722146088747051',
  '169141556912062465',
  '1355479601308242071',
]

const LEAGUE_MAP = {
  'Skeleton League 1':   'Squelette 1',
  'Skeleton League 2':   'Squelette 2',
  'Skeleton League 3':   'Squelette 3',
  'Barbarian League 4':  'Barbare 4',
  'Barbarian League 5':  'Barbare 5',
  'Barbarian League 6':  'Barbare 6',
  'Archer League 7':     'Archer 7',
  'Archer League 8':     'Archer 8',
  'Archer League 9':     'Archer 9',
  'Wizard League 10':    'Sorcier 10',
  'Wizard League 11':    'Sorcier 11',
  'Wizard League 12':    'Sorcier 12',
  'Valkyrie League 13':  'Valkyrie 13',
  'Valkyrie League 14':  'Valkyrie 14',
  'Valkyrie League 15':  'Valkyrie 15',
  'Witch League 16':     'Sorcière 16',
  'Witch League 17':     'Sorcière 17',
  'Witch League 18':     'Sorcière 18',
  'Golem League 19':     'Golem 19',
  'Golem League 20':     'Golem 20',
  'Golem League 21':     'Golem 21',
  'P.E.K.K.A League 22': 'P.E.K.K.A 22',
  'P.E.K.K.A League 23': 'P.E.K.K.A 23',
  'P.E.K.K.A League 24': 'P.E.K.K.A 24',
  'Titan League 25':     'Electro Titan 25',
  'Titan League 26':     'Electro Titan 26',
  'Titan League 27':     'Electro Titan 27',
  'Dragon League 28':    'Dragon 28',
  'Dragon League 29':    'Dragon 29',
  'Dragon League 30':    'Dragon 30',
  'Electro League 31':   'Electro Dragon 31',
  'Electro League 32':   'Electro Dragon 32',
  'Electro League 33':   'Electro Dragon 33',
  'Legend League':       'Légende',
}

async function getPlayer(tag) {
  const url = `${process.env.BACKEND_URL}/api/coc/player/${encodeURIComponent(tag)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text()}`)
  return res.json()
}

async function main() {
  const leagueRoles = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../config/leagueRoles.json'), 'utf-8')
  )

  const { data: links, error } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag, coc_name, is_primary')
    .in('discord_id', DISCORD_IDS)

  if (error) { console.error('Supabase error:', error); process.exit(1) }

  const byDiscord = {}
  for (const l of links || []) {
    if (!byDiscord[l.discord_id]) byDiscord[l.discord_id] = []
    byDiscord[l.discord_id].push(l)
  }

  for (const discordId of DISCORD_IDS) {
    const rows = byDiscord[discordId]
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Discord ID : ${discordId}`)

    if (!rows || rows.length === 0) {
      console.log('  ❌ Aucune entrée dans discord_links')
      continue
    }

    const primary = rows.find(r => r.is_primary) || rows[0]
    console.log(`  CoC name  : ${primary.coc_name}`)
    console.log(`  CoC tag   : ${primary.coc_tag}  (is_primary: ${primary.is_primary})`)
    if (rows.length > 1) {
      console.log(`  Comptes secondaires : ${rows.filter(r => !r.is_primary).map(r => r.coc_tag).join(', ')}`)
    }

    try {
      const player = await getPlayer(primary.coc_tag)
      const leagueName = player.leagueTier?.name ?? player.league?.name ?? null
      console.log(`  Ligue API CoC     : ${leagueName ?? '(aucune — non classé)'}`)

      if (!leagueName) {
        console.log('  Mapping LEAGUE_MAP : (vide — non classé, rôle non attribué, pas d\'erreur)')
        console.log('  ➜ VERDICT : Aucune ligue retournée par l\'API → assignLeagueRole retire les rôles existants et s\'arrête. Compté "mis à jour" à tort.')
        continue
      }

      const mappedRole = LEAGUE_MAP[leagueName]
      console.log(`  Mapping LEAGUE_MAP : "${leagueName}" → "${mappedRole ?? '(ABSENT DU MAPPING)'}"`)

      if (!mappedRole) {
        console.log('  ➜ VERDICT : Ligue connue de l\'API CoC mais ABSENTE du LEAGUE_MAP → assignLeagueRole retourne sans rien faire. Faux positif "mis à jour".')
        continue
      }

      const roleId = leagueRoles[mappedRole]
      console.log(`  Role ID Discord    : ${roleId ?? '(ABSENT de leagueRoles.json)'}`)

      if (!roleId) {
        console.log('  ➜ VERDICT : Rôle mappé dans LEAGUE_MAP mais ABSENT de leagueRoles.json → assignLeagueRole retourne sans rien faire. Faux positif "mis à jour".')
        continue
      }

      console.log('  ➜ VERDICT : Mapping et roleId OK — échec probable à l\'attribution Discord (permissions bot ou rôle supprimé côté serveur).')
    } catch (e) {
      console.log(`  ❌ Erreur API CoC : ${e.message}`)
      console.log('  ➜ VERDICT : Erreur lors du getPlayer → compté comme erreur (catch), non comme faux positif.')
    }
  }

  console.log(`\n${'─'.repeat(60)}\nDiagnostic terminé.\n`)
}

main()
