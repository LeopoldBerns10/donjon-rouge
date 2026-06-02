const { EmbedBuilder } = require('discord.js')
const {
  HALL_CHANNEL_ID,
  FLOOD_PRIVE_ID,
  FLOOD_PUBLIC_ID,
  REGLEMENT_ID,
  TICKETS_ID,
  GUIDE_ID,
  SITE_URL,
} = require('./config/welcome.js')

async function sendWelcomeMessage(member, roleType) {
  const channel = await member.client.channels.fetch(HALL_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const createdAt = member.user.createdAt
  const createdStr = createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const floodChannel = roleType === 'donjon_rouge' ? `<#${FLOOD_PRIVE_ID}>` : `<#${FLOOD_PUBLIC_ID}>`

  const fieldValue = [
    `📜 Règlement à lire et valider => <#${REGLEMENT_ID}>`,
    `👋 Présente toi => ${floodChannel}`,
    `❓ Besoin d'autre chose => <#${TICKETS_ID}>`,
    `📖 Guide Discord => <#${GUIDE_ID}>`,
    `🌐 Notre site : ${SITE_URL}`,
  ].join('\n')

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🎉 Ho ! Un nouveau membre !')
    .setDescription(`🎊 Bienvenue ${member} sur le Discord du Donjon Rouge ! 🎊`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields({ name: '⚠️ SUIVRE LES INDICATIONS ⚠️', value: fieldValue })
    .setFooter({ text: `Compte Discord créé le ${createdStr} • Merci & Bonne visite.` })

  await channel.send({ content: '@everyone', embeds: [embed] })
}

module.exports = { sendWelcomeMessage }
