require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const { writeFileSync, readFileSync, mkdirSync } = require('fs')
const path = require('path')

const HDV_ROLES = [
  ...Array.from({ length: 13 }, (_, i) => ({ level: i + 1, color: 0x607D8B })),
  { level: 14, color: 0x2E7D32 },
  { level: 15, color: 0x1565C0 },
  { level: 16, color: 0x6A1B9A },
  { level: 17, color: 0xE65100 },
  { level: 18, color: 0xFFD700 },
]

function loadExistingIds() {
  try {
    const raw = readFileSync(path.join(__dirname, '../config/hdvRoles.json'), 'utf-8')
    return Object.values(JSON.parse(raw)).filter(Boolean)
  } catch {
    return []
  }
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
        await guild.roles.delete(id, 'Recréation des rôles HDV')
        process.stdout.write('.')
      } catch (err) {
        if (err.code !== 10011) console.warn(`\n⚠ ID ${id} : ${err.message}`)
      }
    }
    console.log()
  }

  // ── Étape 2 : nettoyage par nom (rôles hors JSON ou créés manuellement) ──
  await guild.roles.fetch()
  const cleanupNames = new Set(HDV_ROLES.map(h => `HDV ${h.level}`))
  const stragglers = guild.roles.cache.filter(r => cleanupNames.has(r.name))
  if (stragglers.size > 0) {
    console.log(`Nettoyage de ${stragglers.size} rôle(s) restant(s) par nom...`)
    for (const [, role] of stragglers) {
      try {
        await role.delete('Recréation des rôles HDV')
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

  for (const hdv of HDV_ROLES) {
    const roleName = `HDV ${hdv.level}`
    try {
      const role = await guild.roles.create({
        name: roleName,
        color: hdv.color,
        reason: 'Setup automatique des rôles HDV',
      })
      result[String(hdv.level)] = role.id
      console.log(`✓ ${roleName.padEnd(8)} → ${role.id}`)
    } catch (err) {
      console.error(`✗ ${roleName} : ${err.message}`)
    }
  }

  // ── Étape 4 : sauvegarde ─────────────────────────────────────────────────
  const configDir = path.join(__dirname, '../config')
  mkdirSync(configDir, { recursive: true })

  const outPath = path.join(configDir, 'hdvRoles.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8')

  console.log(`\n${Object.keys(result).length} rôles sauvegardés dans src/config/hdvRoles.json`)

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
