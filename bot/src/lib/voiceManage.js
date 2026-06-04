const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js')

const LIE_ROLE_ID = '1511096527664320655'

function buildVoiceManageEmbed(channelName, ownerName, isPrivate, limit) {
  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`🎮 Gestion de ton salon — ${ownerName}`)
    .setDescription('Utilise les boutons ci-dessous pour gérer ton salon vocal !')
    .addFields(
      { name: '🔒 Confidentialité', value: isPrivate ? 'Privé — accès restreint' : 'Public — tout le monde peut rejoindre', inline: true },
      { name: '👥 Limite',          value: limit === 0 ? 'Illimitée' : `${limit} personne(s)`, inline: true },
      { name: '🔊 Salon',           value: channelName, inline: true },
    )
    .setTimestamp()
}

function buildVoiceManageComponents(isPrivate) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('voice_toggle_private')
      .setLabel(isPrivate ? '🔓 Rendre public' : '🔒 Rendre privé')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('voice_set_limit')
      .setLabel('👥 Limite de places')
      .setStyle(ButtonStyle.Primary),
  )
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('voice_kick_member')
      .setLabel('🚪 Expulser un membre')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('voice_mute_member')
      .setLabel('🔇 Muter un membre')
      .setStyle(ButtonStyle.Danger),
  )
  return [row1, row2]
}

function isVoicePrivate(voiceChannel) {
  const overwrite = voiceChannel.permissionOverwrites.cache.get(LIE_ROLE_ID)
  return overwrite ? overwrite.deny.has(PermissionFlagsBits.ViewChannel) : false
}

module.exports = { buildVoiceManageEmbed, buildVoiceManageComponents, isVoicePrivate, LIE_ROLE_ID }
