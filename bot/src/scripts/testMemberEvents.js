require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')

const DISCORD_ID = '610765755553939456'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
})

client.once('ready', async () => {
  console.log(`[testMemberEvents] Connecté en tant que ${client.user.tag}`)

  const guild = client.guilds.cache.first()
  if (guild) await guild.members.fetch().catch(e => console.warn('[testMemberEvents] fetch membres:', e.message))

  // ── Objet membre fictif ───────────────────────────────────────────────────
  const mockMember = {
    id:   DISCORD_ID,
    user: {
      id:       DISCORD_ID,
      username: 'CyberAlf',
      displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png',
      createdAt: new Date('2019-05-01'),
    },
    client,
    guild,
    roles: {
      add: async (roleId) => console.log(`[mock] roles.add(${roleId}) — ignoré en test`),
    },
    send: async (text) => console.log(`[mock] DM → ${DISCORD_ID} :\n${text}`),
    joinedAt: new Date(Date.now() - 45 * 24 * 3600000), // 45 jours dans le clan
    toString: () => `<@${DISCORD_ID}>`,
  }

  // ── Test arrivée (guildMemberAdd) — DM + log ──────────────────────────────
  console.log('\n=== TEST ARRIVÉE (guildMemberAdd) ===')
  try {
    const guildMemberAdd = require('../events/guildMemberAdd.js')
    await guildMemberAdd.execute(mockMember)
    console.log('[testMemberEvents] guildMemberAdd ✅')
  } catch (e) {
    console.error('[testMemberEvents] guildMemberAdd ❌', e.message)
  }

  // ── Test welcome embed (sendWelcomeMessage) — posté dans HALL_CHANNEL ────
  console.log('\n=== TEST WELCOME (sendWelcomeMessage → #1432155980925239386) ===')
  try {
    const { sendWelcomeMessage } = require('../welcome.js')
    await sendWelcomeMessage(mockMember)
    console.log('[testMemberEvents] sendWelcomeMessage ✅')
  } catch (e) {
    console.error('[testMemberEvents] sendWelcomeMessage ❌', e.message)
  }

  // ── Test départ (guildMemberRemove) — embed posté dans SORTIE_CHANNEL ────
  console.log('\n=== TEST DÉPART (guildMemberRemove → #1473835920787767428) ===')
  try {
    const guildMemberRemove = require('../events/guildMemberRemove.js')
    await guildMemberRemove.execute(mockMember)
    console.log('[testMemberEvents] guildMemberRemove ✅')
  } catch (e) {
    console.error('[testMemberEvents] guildMemberRemove ❌', e.message)
  }

  console.log('\n[testMemberEvents] ✅ Tests terminés.')
  await client.destroy()
  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
