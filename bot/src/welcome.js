const { EmbedBuilder } = require('discord.js')
const {
  HALL_CHANNEL_ID,
  FLOOD_PUBLIC_ID,
  TICKETS_ID,
} = require('./config/welcome.js')

async function sendWelcomeMessage(member) {
  const channel = await member.client.channels.fetch(HALL_CHANNEL_ID).catch(() => null)
  if (!channel) return

  const createdAt = member.user.createdAt
  const createdStr = createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const fieldValue = [
    `👋 Annonce toi => <#${FLOOD_PUBLIC_ID}>`,
    `⚔️ Contact le <@&611123759864348672> ou <@&1297318759396278425> pour rejoindre le jeu`,
    `❓ Besoin d'autre chose => <#${TICKETS_ID}>`,
  ].join('\n')

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🎉 Ho ! Un nouveau membre !')
    .setDescription(`🎊 Bienvenue ${member} sur le Discord du Donjon Rouge ! 🎊`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '⚠️ SUIVRE LES INDICATIONS ⚠️', value: fieldValue },
      { name: '​', value: '​' },
      { name: '​', value: '📖 Lis bien le fonctionnement avant STP.' },
    )
    .setFooter({ text: `Compte Discord créé le ${createdStr} • Merci & Bonne visite.` })

  await channel.send({ content: '@everyone', embeds: [embed] })
}

module.exports = { sendWelcomeMessage }
