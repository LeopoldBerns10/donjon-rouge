require('dotenv').config()
const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType } = require('discord.js')
const supabase = require('../supabase.js')

const LIE_ROLE_ID = '1511096527664320655'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  if (!guild) {
    console.error('Guild introuvable. Vérifie DISCORD_GUILD_ID dans .env')
    process.exit(1)
  }

  const category = await guild.channels.create({
    name: '🎮 Salons Vocaux',
    type: ChannelType.GuildCategory,
    reason: 'Setup JTC — système de salons vocaux',
  })
  console.log(`✓ Catégorie créée → ID : ${category.id}`)

  const triggerChannel = await guild.channels.create({
    name: '➕ Créer ton salon',
    type: ChannelType.GuildVoice,
    parent: category.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.Speak, PermissionFlagsBits.Stream],
      },
      {
        id: LIE_ROLE_ID,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.MoveMembers,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
        ],
      },
    ],
    reason: 'Setup JTC — salon déclencheur',
  })
  console.log(`✓ Salon trigger créé → ID : ${triggerChannel.id}`)

  await supabase.from('bot_config').upsert([
    { key: 'jtc_category_id',        value: category.id,       updated_at: new Date().toISOString() },
    { key: 'jtc_trigger_channel_id', value: triggerChannel.id, updated_at: new Date().toISOString() },
  ])
  console.log('✓ IDs sauvegardés dans Supabase (jtc_category_id, jtc_trigger_channel_id)')

  await client.destroy()
  console.log('✓ Setup terminé.')
})

client.login(process.env.DISCORD_TOKEN)
