require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const GUILD_ID    = '610767309031866371'
const REGLEMENT   = '1511079308125536386'
const CAT_INTEG   = '1511081858723610684'
const VISITEUR    = '1072532916955009095'
const NON_VERIFIE = '1350801589652422728'
const VERIFIE     = '1511080481108660326'

function yesno(ow, perm) {
  if (!ow) return 'hérite (pas d\'override)'
  const a = new PermissionsBitField(ow.allow)
  const d = new PermissionsBitField(ow.deny)
  if (a.has(perm)) return '✅ ALLOW explicite'
  if (d.has(perm)) return '❌ DENY explicite'
  return '⬜ neutre (override vide)'
}

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.channels.fetch()
  await guild.roles.fetch()

  const cat = guild.channels.cache.get(CAT_INTEG)
  const ch  = guild.channels.cache.get(REGLEMENT)

  console.log('\n── CATÉGORIE Intégration ──')
  for (const [, o] of cat.permissionOverwrites.cache) {
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

  console.log('\n── SALON 2-lis-le-règlement ──')
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

  console.log('\n── SIMULATION ViewChannel pour Visiteur ──')
  console.log(`  cat @everyone  : ${yesno(cat.permissionOverwrites.cache.get(GUILD_ID), 'ViewChannel')}`)
  console.log(`  cat Vérifié    : ${yesno(cat.permissionOverwrites.cache.get(VERIFIE), 'ViewChannel')}`)
  console.log(`  cat NonVérifié : ${yesno(cat.permissionOverwrites.cache.get(NON_VERIFIE), 'ViewChannel')}`)
  console.log(`  cat Visiteur   : ${yesno(cat.permissionOverwrites.cache.get(VISITEUR), 'ViewChannel')}`)
  console.log(`  chn @everyone  : ${yesno(ch.permissionOverwrites.cache.get(GUILD_ID), 'ViewChannel')}`)
  console.log(`  chn Visiteur   : ${yesno(ch.permissionOverwrites.cache.get(VISITEUR), 'ViewChannel')}`)

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
