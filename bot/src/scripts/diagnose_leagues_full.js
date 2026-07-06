/**
 * Diagnostic complet des rôles de ligue Discord.
 * Point 1 : IDs leagueRoles.json vs rôles réels du serveur
 * Point 2 : position du rôle bot vs chaque rôle de ligue (hiérarchie)
 * Point 3 : rôle attendu (API CoC) vs rôle réel de chaque membre lié
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const { Client, GatewayIntentBits } = require('discord.js')
const { createClient } = require('@supabase/supabase-js')
const fs   = require('fs')
const path = require('path')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const GUILD_ID = process.env.DISCORD_GUILD_ID

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
  'Legend I':            'Légende',
  'Legend II':           'Légende',
  'Legend III':          'Légende',
}

const leagueRoles = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../config/leagueRoles.json'), 'utf-8')
)
const allLeagueRoleIds = new Set(Object.values(leagueRoles))

async function getPlayer(tag) {
  const res = await fetch(`${process.env.BACKEND_URL}/api/coc/player/${encodeURIComponent(tag)}`)
  if (!res.ok) throw new Error(`Backend ${res.status}`)
  return res.json()
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Séparateur visuel ────────────────────────────────────────────────────────
const HR  = '─'.repeat(70)
const HR2 = '═'.repeat(70)

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] })

  await client.login(process.env.DISCORD_TOKEN)
  await new Promise(r => client.once('ready', r))

  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.members.fetch()          // charge tous les membres en cache
  const guildRoles = await guild.roles.fetch()

  // ── ID bot ────────────────────────────────────────────────────────────────
  const botMember = guild.members.cache.get(client.user.id)
  const botHighestRole = botMember.roles.highest

  // ═════════════════════════════════════════════════════════════════════════
  console.log(`\n${HR2}`)
  console.log('POINT 1 — IDs leagueRoles.json vs rôles réels du serveur')
  console.log(`${HR2}\n`)

  let idMismatches = 0
  for (const [roleName, roleId] of Object.entries(leagueRoles)) {
    const exists = guildRoles.has(roleId)
    if (!exists) {
      console.log(`  ❌ "${roleName}" (ID ${roleId}) : INTROUVABLE sur le serveur Discord`)
      idMismatches++
    }
  }
  if (idMismatches === 0) {
    console.log(`  ✅ Tous les ${Object.keys(leagueRoles).length} IDs de leagueRoles.json existent sur le serveur.`)
  } else {
    console.log(`\n  → ${idMismatches} rôle(s) introuvable(s). IDs probablement obsolètes (rôle supprimé/recréé).`)
  }

  // ═════════════════════════════════════════════════════════════════════════
  console.log(`\n${HR2}`)
  console.log(`POINT 2 — Hiérarchie : rôle du bot (position ${botHighestRole.position}) vs rôles de ligue`)
  console.log(`${HR2}\n`)
  console.log(`  Rôle bot : "${botHighestRole.name}" (position ${botHighestRole.position})\n`)

  let hierarchyIssues = 0
  const rolesBelowBot = []
  const rolesAboveBot = []

  for (const [roleName, roleId] of Object.entries(leagueRoles)) {
    const discordRole = guildRoles.get(roleId)
    if (!discordRole) continue  // déjà signalé en point 1
    if (discordRole.position >= botHighestRole.position) {
      rolesAboveBot.push({ roleName, pos: discordRole.position })
      hierarchyIssues++
    } else {
      rolesBelowBot.push({ roleName, pos: discordRole.position })
    }
  }

  if (rolesAboveBot.length > 0) {
    console.log('  ❌ Rôles de ligue AU-DESSUS du bot (non assignables) :')
    for (const r of rolesAboveBot.sort((a, b) => b.pos - a.pos)) {
      console.log(`     pos ${r.pos}  "${r.roleName}"`)
    }
  }
  if (rolesBelowBot.length > 0 && rolesAboveBot.length === 0) {
    console.log(`  ✅ Tous les rôles de ligue sont en dessous du rôle bot (position ${botHighestRole.position}).`)
  }
  if (rolesBelowBot.length > 0 && rolesAboveBot.length > 0) {
    console.log(`\n  ✅ Rôles en dessous du bot (${rolesBelowBot.length}) : OK (non listés)`)
  }
  if (hierarchyIssues === 0) {
    // already printed
  }

  // ═════════════════════════════════════════════════════════════════════════
  console.log(`\n${HR2}`)
  console.log('POINT 3 — Rôle attendu vs rôle réel pour tous les membres liés')
  console.log(`${HR2}\n`)

  const { data: links, error } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag, coc_name')
    .eq('is_primary', true)

  if (error) { console.error('Supabase error:', error); process.exit(1) }

  console.log(`  ${links.length} membres liés (is_primary=true) à analyser...\n`)

  let okCount = 0
  const mismatches = []
  const apiErrors  = []
  const notInGuild = []

  for (const link of links) {
    const member = guild.members.cache.get(link.discord_id)
    if (!member) {
      notInGuild.push(link)
      continue
    }

    let expectedRoleName = null
    let expectedRoleId   = null
    let cocLeagueName    = null
    let apiError         = null

    try {
      const player  = await getPlayer(link.coc_tag)
      cocLeagueName = player.leagueTier?.name ?? null

      expectedRoleName = cocLeagueName ? (LEAGUE_MAP[cocLeagueName] ?? null) : null
      expectedRoleId   = expectedRoleName ? (leagueRoles[expectedRoleName] ?? null) : null
    } catch (e) {
      apiError = e.message
      apiErrors.push({ ...link, error: e.message })
      await sleep(500)
      continue
    }

    // Rôles de ligue que le membre a actuellement
    const currentLeagueRoles = member.roles.cache
      .filter(r => allLeagueRoleIds.has(r.id))
      .map(r => r.name)

    const hasCorrectRole = expectedRoleId
      ? member.roles.cache.has(expectedRoleId)
      : currentLeagueRoles.length === 0

    if (hasCorrectRole) {
      okCount++
    } else {
      mismatches.push({
        coc_name:        link.coc_name,
        coc_tag:         link.coc_tag,
        discord_id:      link.discord_id,
        cocLeague:       cocLeagueName ?? '(aucune — non classé)',
        expectedRole:    expectedRoleName ?? '(aucun rôle — non classé)',
        currentRoles:    currentLeagueRoles.length > 0 ? currentLeagueRoles.join(', ') : '(aucun rôle de ligue)',
      })
    }

    await sleep(400)
  }

  // ── Résultats Point 3 ─────────────────────────────────────────────────────
  console.log(`  ✅ ${okCount} membre(s) avec rôle correct.\n`)

  if (notInGuild.length > 0) {
    console.log(`  ⚠️  ${notInGuild.length} membre(s) dans discord_links mais absents du cache Discord :`)
    for (const l of notInGuild) console.log(`     ${l.coc_name} (${l.coc_tag}) — discord_id ${l.discord_id}`)
    console.log()
  }

  if (apiErrors.length > 0) {
    console.log(`  ⚠️  ${apiErrors.length} erreur(s) API CoC (ignorés du comparatif) :`)
    for (const e of apiErrors) console.log(`     ${e.coc_name} (${e.coc_tag}) : ${e.error}`)
    console.log()
  }

  if (mismatches.length === 0) {
    console.log('  ✅ Aucune différence rôle attendu / rôle réel.')
  } else {
    console.log(`  ❌ ${mismatches.length} membre(s) avec rôle incorrect :\n`)
    console.log(`  ${'Nom CoC'.padEnd(22)} ${'Tag'.padEnd(14)} ${'Ligue CoC'.padEnd(22)} ${'Rôle attendu'.padEnd(22)} Rôle(s) actuel(s)`)
    console.log(`  ${HR}`)
    for (const m of mismatches) {
      console.log(
        `  ${m.coc_name.padEnd(22)} ${m.coc_tag.padEnd(14)} ${m.cocLeague.padEnd(22)} ${m.expectedRole.padEnd(22)} ${m.currentRoles}`
      )
    }
  }

  console.log(`\n${HR2}`)
  console.log('Diagnostic terminé.')
  console.log(`${HR2}\n`)

  await client.destroy()
}

main().catch(e => { console.error(e); process.exit(1) })
