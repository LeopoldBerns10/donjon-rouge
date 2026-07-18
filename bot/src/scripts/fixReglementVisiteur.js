require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const GUILD_ID    = '610767309031866371'
const REGLEMENT   = '1511079308125536386'

const BOT_MEMBER  = '1510915723306729574'
const BOT_ROLE    = '1510925894892523610'
const MONDE_ROLE  = '1518667690246672456'

const R = {
  everyone:   '610767309031866371',
  nonVerifie: '1350801589652422728',
  verifie:    '1511080481108660326',
  // Visiteur retiré intentionnellement : ne doit plus voir ce salon après son choix
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

  const ch = guild.channels.cache.get(REGLEMENT)

  const newOverrides = [
    ...prot(ch),
    { id: R.everyone,   type: 'role', allow: [], deny: [F.ViewChannel] },
    { id: R.nonVerifie, type: 'role', allow: [F.ViewChannel], deny: [F.SendMessages] },
    { id: R.verifie,    type: 'role', allow: [F.ViewChannel], deny: [] },
    // Visiteur : aucun override → hérite du -ViewChannel de @everyone → ne voit plus le salon
  ]

  await ch.permissionOverwrites.set(newOverrides, 'Fix : Visiteur ne doit plus voir 2-lis-le-règlement après son choix')

  console.log('Overrides appliqués sur 2-lis-le-règlement :')
  for (const [, o] of ch.permissionOverwrites.cache) {
    const name = o.type === 0 ? (guild.roles.cache.get(o.id)?.name ?? o.id) : `membre:${o.id}`
    const a = new PermissionsBitField(o.allow)
    const d = new PermissionsBitField(o.deny)
    const bits = []
    for (const [k] of Object.entries(PermissionsBitField.Flags)) {
      if (a.has(k)) bits.push(`+${k}`)
      else if (d.has(k)) bits.push(`-${k}`)
    }
    console.log(`  ${name.padEnd(35)} → ${bits.join(', ') || '(hérite)'}`)
  }

  console.log('\n✅ Fix appliqué — Visiteur retiré des overrides du salon règlement.')
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
