require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const GUILD_ID      = '610767309031866371'
const FLOOD_ID      = '1503680775462064168'
const CAT_CLAN_DR   = '610767309488914443'
const NON_VERIFIE   = '1350801589652422728'
const EVERYONE      = '610767309031866371'

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
    console.log(`  [${o.type === 0 ? 'role' : 'mbr'}] ${name.padEnd(35)} ${bits.join(', ') || '(hérite)'}`)
  }
}

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.channels.fetch()
  await guild.roles.fetch()

  const flood  = guild.channels.cache.get(FLOOD_ID)
  const catDR  = guild.channels.cache.get(CAT_CLAN_DR)

  dump(catDR,  'CATÉGORIE Clan Donjon Rouge')
  dump(flood,  'SALON flood')

  // Simulation manuelle pour le rôle Non vérifié
  console.log('\n── SIMULATION : membre avec uniquement @everyone + Non vérifié ──')
  const everyone = channel => channel.permissionOverwrites.cache.get(EVERYONE)
  const nv       = channel => channel.permissionOverwrites.cache.get(NON_VERIFIE)

  function yesno(ow, perm) {
    if (!ow) return 'hérite'
    const a = new PermissionsBitField(ow.allow)
    const d = new PermissionsBitField(ow.deny)
    if (a.has(perm)) return '✅ ALLOW'
    if (d.has(perm)) return '❌ DENY'
    return 'hérite'
  }

  const P = 'ViewChannel'
  console.log(`  cat @everyone  ViewChannel : ${yesno(everyone(catDR), P)}`)
  console.log(`  cat NonVérifié ViewChannel : ${yesno(nv(catDR), P)}`)
  console.log(`  chn @everyone  ViewChannel : ${yesno(everyone(flood), P)}`)
  console.log(`  chn NonVérifié ViewChannel : ${yesno(nv(flood), P)}`)

  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
