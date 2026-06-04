const { ChannelType, PermissionFlagsBits } = require('discord.js')
const supabase = require('../supabase.js')
const { buildVoiceManageEmbed, buildVoiceManageComponents, LIE_ROLE_ID } = require('../lib/voiceManage.js')

let jtcConfig = null

async function getJtcConfig() {
  if (jtcConfig) return jtcConfig
  const { data } = await supabase
    .from('bot_config')
    .select('key, value')
    .in('key', ['jtc_category_id', 'jtc_trigger_channel_id'])
  if (!data?.length) return null
  const map = {}
  for (const row of data) map[row.key] = row.value
  if (map.jtc_category_id && map.jtc_trigger_channel_id) jtcConfig = map
  return jtcConfig
}

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const config = await getJtcConfig()
    if (!config) return

    const { jtc_trigger_channel_id, jtc_category_id } = config
    const member = newState.member
    const guild  = newState.guild

    // Membre rejoint le salon trigger
    if (newState.channelId === jtc_trigger_channel_id) {
      if (!member.roles.cache.has(LIE_ROLE_ID)) {
        await member.voice.disconnect().catch(() => {})
        return
      }

      // Créer le salon vocal
      const voiceChannel = await guild.channels.create({
        name: `🎮 Salon de ${member.displayName}`,
        type: ChannelType.GuildVoice,
        parent: jtc_category_id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak,
              PermissionFlagsBits.Stream, PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers,
            ],
          },
          {
            id: LIE_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak,
              PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers,
            ],
          },
        ],
      })

      await member.voice.setChannel(voiceChannel).catch(() => {})

      // Créer le salon textuel de gestion
      const textChannel = await guild.channels.create({
        name: `🎮・${member.displayName}-salon`,
        type: ChannelType.GuildText,
        parent: jtc_category_id,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: member.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
          },
          {
            id: client.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      })

      const embed = buildVoiceManageEmbed(voiceChannel.name, member.displayName, false, 0)
      await textChannel.send({ embeds: [embed], components: buildVoiceManageComponents(false) })

      await supabase.from('voice_channels').insert({
        channel_id:      voiceChannel.id,
        owner_id:        member.id,
        text_channel_id: textChannel.id,
        created_at:      new Date().toISOString(),
      })

      console.log(`[JTC] Salon créé pour ${member.displayName} : vocal=${voiceChannel.id} texte=${textChannel.id}`)
    }

    // Membre quitte un salon vocal
    if (oldState.channelId && oldState.channelId !== jtc_trigger_channel_id) {
      const voiceChannel = oldState.channel
      if (!voiceChannel) return

      const { data } = await supabase
        .from('voice_channels')
        .select('channel_id, text_channel_id')
        .eq('channel_id', oldState.channelId)
        .maybeSingle()

      if (!data) return

      if (voiceChannel.members.size === 0) {
        await voiceChannel.delete().catch(() => {})

        if (data.text_channel_id) {
          const textChannel = await guild.channels.fetch(data.text_channel_id).catch(() => null)
          if (textChannel) await textChannel.delete().catch(() => {})
        }

        await supabase.from('voice_channels').delete().eq('channel_id', oldState.channelId)
        console.log(`[JTC] Salon supprimé : ${oldState.channelId}`)
      }
    }
  },
}
