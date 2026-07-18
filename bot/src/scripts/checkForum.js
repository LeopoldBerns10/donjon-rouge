require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const GUILD_ID   = '610767309031866371'
const CAT_FORUM  = '1335372304288579654'
const FORUM_CHAN = '1279055712089149440'
const LIE        = '1511096527664320655'

function dump(channel, label) {
  console.log(`\n── ${label} (${channel.id}) ──`)
  const ows = [...channel.permissionOverwrites.cache.values()]
  if (!ows.length) { console.log('  (aucun override)'); return }
  for (const o of ows) {
    const name = o.type === 0
      ? (channel.guild.roles.cache.get(o.id)?.name ?? o.id)
      : `membre:${o.id}`
    const a = new PermissionsBitField(o.allow)
    const d = new PermissionsBitField(o.deny)
    const bits = []
    for (const [k] of Object.entries(PermissionsBitField.Flags)) {
      if (a.has(k)) bits.push(`+${k}`)
      else if (d.has(k)) bits.push(`-${k}`)
    }
    console.log(`  [${o.type === 0 ? 'role' : 'mbr '}] ${name.padEnd(35)} → ${bits.join(', ') || '(neutre)'}`)
  }
}

function check(channel, roleId, perm, label) {
  const ow = channel.permissionOverwrites.cache.get(roleId)
  if (!ow) return `  ${label} : pas d'override`
  const a = new PermissionsBitField(ow.allow)
  const d = new PermissionsBitField(ow.deny)
  if (a.has(perm)) return `  ${label} : ✅ ALLOW`
  if (d.has(perm)) return `  ${label} : ❌ DENY`
  return `  ${label} : ⬜ neutre`
}

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.channels.fetch()
  await guild.roles.fetch()

  const cat = guild.channels.cache.get(CAT_FORUM)
  const ch  = guild.channels.cache.get(FORUM_CHAN)

  dump(cat, 'CATÉGORIE Forum')
  dump(ch,  'SALON forum-du-clan')

  console.log('\n── SendMessages pour Lié ──')
  console.log(check(cat, LIE, 'SendMessages', 'cat Lié'))
  console.log(check(ch,  LIE, 'SendMessages', 'chn Lié'))
  console.log(check(cat, guild.id, 'SendMessages', 'cat @everyone'))
  console.log(check(ch,  guild.id, 'SendMessages', 'chn @everyone'))

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
