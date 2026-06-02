const { EmbedBuilder } = require('discord.js')
const { SORTIE_CHANNEL_ID } = require('../config/welcome.js')
const { invalidateMembresCache } = require('../lib/panelHandlers.js')

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    try {
      const channel = await member.client.channels.fetch(SORTIE_CHANNEL_ID).catch(() => null)
      if (!channel) return

      let daysStr = ''
      if (member.joinedAt) {
        const days = Math.floor((Date.now() - member.joinedAt.getTime()) / (1000 * 60 * 60 * 24))
        daysStr = days === 0 ? "moins d'un jour" : `${days} jour${days > 1 ? 's' : ''}`
      }

      const embed = new EmbedBuilder()
        .setColor(0x555555)
        .setTitle('😢 Un membre vient de partir...')
        .setDescription(`À bientôt **${member.user.username}**`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: daysStr ? `Avait rejoint le serveur il y a ${daysStr}` : 'Bonne continuation.' })

      await channel.send({ embeds: [embed] })
    } catch (err) {
      console.error('[guildMemberRemove]', err)
    }

    invalidateMembresCache()
  },
}
