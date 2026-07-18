require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const GUILD_ID   = '610767309031866371'
const FLOOD_ID   = '1503680775462064168'

const BOT_MEMBER = '1510915723306729574'
const BOT_ROLE   = '1510925894892523610'
const MONDE_ROLE = '1518667690246672456'

const R = {
  everyone:   '610767309031866371',
  nonVerifie: '1350801589652422728',
  visiteur:   '1072532916955009095',
  dr:         '611125112519000064',
}

const F = PermissionsBitField.Flags

function prot(channel) {
  const out = []
  for (const [, o] of channel.permissionOverwrites.cache) {
    if (
      (o.type === 1 && o.id === BOT_MEMBER) ||
      (o.type === 0 && (o.id === BOT_ROLE || o.id === MONDE_ROLE))
    ) {
      out.push({ id: o.id, type: o.type === 0 ? 'role' : 'member', allow: o.allow, deny: o.deny })
    }
  }
  return out
}

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.channels.fetch()

  const flood = guild.channels.cache.get(FLOOD_ID)

  console.log('Overrides actuels de flood :')
  for (const [, o] of flood.permissionOverwrites.cache) {
    const name = o.type === 0 ? (guild.roles.cache.get(o.id)?.name ?? o.id) : `membre:${o.id}`
    console.log(`  [${o.type === 0 ? 'role' : 'mbr'}] ${name} → allow:${o.allow.bitfield} deny:${o.deny.bitfield}`)
  }

  const newOverrides = [
    ...prot(flood),
    // @everyone : explicitement -ViewChannel pour neutraliser l'override vide qui bypasse la catégorie
    { id: R.everyone,   type: 'role', allow: [], deny: [F.ViewChannel] },
    // Non vérifié : -ViewChannel explicite sur le salon
    { id: R.nonVerifie, type: 'role', allow: [], deny: [F.ViewChannel] },
    // Les rôles autorisés
    { id: R.visiteur,   type: 'role', allow: [F.ViewChannel, F.SendMessages], deny: [] },
    { id: R.dr,         type: 'role', allow: [F.ViewChannel, F.SendMessages], deny: [] },
  ]

  await flood.permissionOverwrites.set(newOverrides, 'Fix : Non vérifié ne doit pas voir flood')

  console.log('\nNouvelles overrides appliquées :')
  await flood.permissionOverwrites.fetch()
  for (const [, o] of flood.permissionOverwrites.cache) {
    const name = o.type === 0 ? (guild.roles.cache.get(o.id)?.name ?? o.id) : `membre:${o.id}`
    const a = new PermissionsBitField(o.allow)
    const d = new PermissionsBitField(o.deny)
    const bits = []
    for (const [k] of Object.entries(PermissionsBitField.Flags)) {
      if (a.has(k)) bits.push(`+${k}`)
      else if (d.has(k)) bits.push(`-${k}`)
    }
    console.log(`  [${o.type === 0 ? 'role' : 'mbr'}] ${name.padEnd(30)} ${bits.join(', ') || '(neutre)'}`)
  }

  console.log('\n✅ Fix appliqué.')
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
