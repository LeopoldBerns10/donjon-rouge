require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

function permString(allow, deny) {
  const parts = []
  const a = new PermissionsBitField(allow)
  const d = new PermissionsBitField(deny)
  for (const [name] of Object.entries(PermissionsBitField.Flags)) {
    if (a.has(name)) parts.push(`+${name}`)
    else if (d.has(name)) parts.push(`-${name}`)
  }
  return parts.length ? parts.join(', ') : 'hérite'
}

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  if (!guild) { console.error('Guild introuvable'); process.exit(1) }

  await guild.roles.fetch()
  await guild.channels.fetch()

  // ── ROLES ──────────────────────────────────────────────────────────────────
  const roles = [...guild.roles.cache.values()]
    .sort((a, b) => b.position - a.position)

  console.log('\n══════════════════════════════════════════════════════════════')
  console.log('  RÔLES (du plus haut au plus bas dans la hiérarchie)')
  console.log('══════════════════════════════════════════════════════════════')
  console.log(`${'Pos'.padEnd(5)} ${'ID'.padEnd(20)} Nom`)
  console.log('─'.repeat(70))
  for (const r of roles) {
    const color = r.hexColor !== '#000000' ? ` [${r.hexColor}]` : ''
    const managed = r.managed ? ' [BOT]' : ''
    const hoist = r.hoist ? ' [affiché séparément]' : ''
    const mention = r.mentionable ? ' [@mentionnable]' : ''
    console.log(`${String(r.position).padEnd(5)} ${r.id.padEnd(20)} ${r.name}${color}${managed}${hoist}${mention}`)
  }

  // ── CHANNELS & CATÉGORIES ─────────────────────────────────────────────────
  const categories = [...guild.channels.cache.values()]
    .filter(c => c.type === 4) // CategoryChannel
    .sort((a, b) => a.rawPosition - b.rawPosition)

  const noCategory = [...guild.channels.cache.values()]
    .filter(c => c.type !== 4 && !c.parentId)
    .sort((a, b) => a.rawPosition - b.rawPosition)

  const TYPE_LABEL = { 0: 'TEXT', 2: 'VOICE', 4: 'CATÉGORIE', 5: 'NEWS', 13: 'STAGE', 15: 'FORUM', 16: 'MEDIA' }

  function printChannel(ch, indent = '') {
    const type = TYPE_LABEL[ch.type] ?? `type${ch.type}`
    console.log(`\n${indent}┌─ [${type}] ${ch.name} (ID: ${ch.id})`)
    const overrides = [...ch.permissionOverwrites.cache.values()]
    if (overrides.length === 0) {
      console.log(`${indent}│  (aucune permission spécifique — hérite entièrement)`)
    } else {
      for (const ow of overrides) {
        const label = ow.type === 0
          ? `Rôle  ${(guild.roles.cache.get(ow.id)?.name ?? ow.id).padEnd(30)} (${ow.id})`
          : `Membre ${ow.id}`
        console.log(`${indent}│  ${label} → ${permString(ow.allow, ow.deny)}`)
      }
    }
  }

  console.log('\n\n══════════════════════════════════════════════════════════════')
  console.log('  CATÉGORIES & SALONS')
  console.log('══════════════════════════════════════════════════════════════')

  // Salons sans catégorie
  if (noCategory.length > 0) {
    console.log('\n[Sans catégorie]')
    for (const ch of noCategory) printChannel(ch, '  ')
  }

  for (const cat of categories) {
    console.log('\n')
    printChannel(cat)
    const children = [...guild.channels.cache.values()]
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => a.rawPosition - b.rawPosition)
    for (const ch of children) printChannel(ch, '  ')
  }

  console.log('\n\n══ FIN ══\n')
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
