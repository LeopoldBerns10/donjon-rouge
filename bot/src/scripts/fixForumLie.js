require('dotenv').config()
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js')

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

const GUILD_ID   = '610767309031866371'
const FORUM_CHAN = '1279055712089149440'

const BOT_MEMBER = '1510915723306729574'
const BOT_ROLE   = '1510925894892523610'

const R = {
  everyone:  '610767309031866371',
  dr:        '611125112519000064',
  lie:       '1511096527664320655',
  recruteur: '1421254471391907840',
  adjoint:   '1297318759396278425',
}

const F = PermissionsBitField.Flags

// Permissions nécessaires pour ÉCRIRE dans un salon de type FORUM :
//   CreatePublicThreads  → créer un nouveau post
//   SendMessagesInThreads → répondre dans un fil existant
// SendMessages seul ne suffit pas pour les salons Forum (contrairement aux salons TEXT).

const FORUM_WRITE = [
  F.ViewChannel,
  F.SendMessages,
  F.CreatePublicThreads,
  F.SendMessagesInThreads,
  F.ReadMessageHistory,
  F.EmbedLinks,
  F.AttachFiles,
  F.AddReactions,
  F.UseExternalEmojis,
  F.UseExternalStickers,
]

const FORUM_MOD = [
  ...FORUM_WRITE,
  F.ManageMessages,
  F.ManageThreads,
  F.MentionEveryone,
]

function prot(channel) {
  const out = []
  for (const [, o] of channel.permissionOverwrites.cache) {
    if (
      (o.type === 1 && o.id === BOT_MEMBER) ||
      (o.type === 0 && o.id === BOT_ROLE)
    ) {
      out.push({ id: o.id, type: o.type === 0 ? 'role' : 'member', allow: o.allow, deny: o.deny })
    }
  }
  return out
}

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID)
  await guild.channels.fetch()
  await guild.roles.fetch()

  const ch = guild.channels.cache.get(FORUM_CHAN)
  console.log(`Type du salon : ${ch.type} (15 = FORUM ✓)`)

  console.log('\nAvant :')
  for (const [, o] of ch.permissionOverwrites.cache) {
    const name = o.type === 0 ? (guild.roles.cache.get(o.id)?.name ?? o.id) : `membre:${o.id}`
    const a = new PermissionsBitField(o.allow)
    const d = new PermissionsBitField(o.deny)
    const bits = []
    for (const [k] of Object.entries(PermissionsBitField.Flags)) {
      if (a.has(k)) bits.push(`+${k}`)
      else if (d.has(k)) bits.push(`-${k}`)
    }
    console.log(`  ${name.padEnd(35)} → ${bits.join(', ') || '(neutre)'}`)
  }

  await ch.permissionOverwrites.set([
    ...prot(ch),
    { id: R.everyone,  type: 'role', allow: [], deny: [F.ViewChannel, F.SendMessages] },
    // DR : lecture seule — peut voir les posts mais pas en créer ni répondre
    { id: R.dr,        type: 'role', allow: [F.ViewChannel, F.ReadMessageHistory], deny: [F.SendMessages, F.CreatePublicThreads, F.SendMessagesInThreads] },
    // Lié + Recruteur : écriture complète dans le forum
    { id: R.lie,       type: 'role', allow: FORUM_WRITE, deny: [] },
    { id: R.recruteur, type: 'role', allow: FORUM_WRITE, deny: [] },
    // Chef Adjoint : modération complète
    { id: R.adjoint,   type: 'role', allow: FORUM_MOD,   deny: [] },
  ], 'Fix forum-du-clan : ajout CreatePublicThreads + SendMessagesInThreads pour Lié')

  console.log('\nAprès :')
  for (const [, o] of ch.permissionOverwrites.cache) {
    const name = o.type === 0 ? (guild.roles.cache.get(o.id)?.name ?? o.id) : `membre:${o.id}`
    const a = new PermissionsBitField(o.allow)
    const d = new PermissionsBitField(o.deny)
    const bits = []
    for (const [k] of Object.entries(PermissionsBitField.Flags)) {
      if (a.has(k)) bits.push(`+${k}`)
      else if (d.has(k)) bits.push(`-${k}`)
    }
    console.log(`  ${name.padEnd(35)} → ${bits.join(', ') || '(neutre)'}`)
  }

  console.log('\n✅ Fix appliqué.')
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
