require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const { writeFileSync, readFileSync, mkdirSync } = require('fs')
const path = require('path')

const LEAGUES = [
  { name: 'Squelette',      color: 0x5D6D7E },
  { name: 'Barbare',        color: 0x8B4513 },
  { name: 'Archer',         color: 0x2E7D32 },
  { name: 'Sorcier',        color: 0x1565C0 },
  { name: 'Valkyrie',       color: 0xC62828 },
  { name: 'Sorcière',       color: 0x6A1B9A },
  { name: 'Golem',          color: 0x607D8B },
  { name: 'P.E.K.K.A',      color: 0x0D47A1 },
  { name: 'Electro Titan',  color: 0xF9A825 },
  { name: 'Dragon',         color: 0xE65100 },
  { name: 'Electro Dragon', color: 0x00ACC1 },
  { name: 'Légende',        color: 0xFFD700, single: true },
]

const TIERS = ['I', 'II', 'III']

// Tous les noms complets possibles (anciens + nouveaux) pour le nettoyage par nom
const CLEANUP_NAMES = new Set([
  // anciens
  'Électro I', 'Électro II', 'Électro III',
  'Légende I', 'Légende II', 'Légende III',
  // nouveaux + ceux communs aux deux générations
  ...['Squelette', 'Barbare', 'Archer', 'Sorcier', 'Valkyrie', 'Sorcière',
     'Golem', 'P.E.K.K.A', 'Electro Titan', 'Dragon', 'Electro Dragon']
    .flatMap(n => TIERS.map(t => `${n} ${t}`)),
  'Légende',
])

function loadExistingIds() {
  try {
    const raw = readFileSync(path.join(__dirname, '../config/leagueRoles.json'), 'utf-8')
    return Object.values(JSON.parse(raw)).filter(Boolean)
  } catch {
    return []
  }
}

function getRoleNames(league) {
  return league.single ? [league.name] : TIERS.map(t => `${league.name} ${t}`)
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  if (!guild) {
    console.error('Guild introuvable. Vérifie DISCORD_GUILD_ID dans .env')
    process.exit(1)
  }

  console.log(`Guild : ${guild.name}\n`)

  // ── Étape 1 : suppression par IDs stockés ────────────────────────────────
  const existingIds = loadExistingIds()
  if (existingIds.length > 0) {
    console.log(`Suppression de ${existingIds.length} rôles (par ID)...`)
    for (const id of existingIds) {
      try {
        await guild.roles.delete(id, 'Recréation des rôles de ligue CoC')
        process.stdout.write('.')
      } catch (err) {
        if (err.code !== 10011) console.warn(`\n⚠ ID ${id} : ${err.message}`)
      }
    }
    console.log()
  }

  // ── Étape 2 : nettoyage par nom (rôles hors JSON ou créés manuellement) ──
  await guild.roles.fetch()
  const stragglers = guild.roles.cache.filter(r => CLEANUP_NAMES.has(r.name))
  if (stragglers.size > 0) {
    console.log(`Nettoyage de ${stragglers.size} rôle(s) restant(s) par nom...`)
    for (const [, role] of stragglers) {
      try {
        await role.delete('Recréation des rôles de ligue CoC')
        process.stdout.write('.')
      } catch (err) {
        console.warn(`\n⚠ "${role.name}" : ${err.message}`)
      }
    }
    console.log()
  }

  // ── Étape 3 : création des nouveaux rôles ────────────────────────────────
  console.log('\nCréation des nouveaux rôles...\n')
  const result = {}

  for (const league of LEAGUES) {
    for (const roleName of getRoleNames(league)) {
      try {
        const role = await guild.roles.create({
          name: roleName,
          color: league.color,
          reason: 'Setup automatique des rôles de ligue CoC',
        })
        result[roleName] = role.id
        console.log(`✓ ${roleName.padEnd(20)} → ${role.id}`)
      } catch (err) {
        console.error(`✗ ${roleName} : ${err.message}`)
      }
    }
  }

  // ── Étape 4 : sauvegarde ─────────────────────────────────────────────────
  const configDir = path.join(__dirname, '../config')
  mkdirSync(configDir, { recursive: true })

  const outPath = path.join(configDir, 'leagueRoles.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8')

  console.log(`\n${Object.keys(result).length} rôles sauvegardés dans src/config/leagueRoles.json`)

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
