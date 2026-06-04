const { EmbedBuilder } = require('discord.js')
const supabase = require('../supabase.js')

const COMMANDS_CHANNEL_ID = '1510927063891316827'

async function sendCommandsPanel(client) {
  const channel = await client.channels.fetch(COMMANDS_CHANNEL_ID)
  if (!channel) throw new Error('Salon des commandes introuvable.')

  const { data: existing } = await supabase
    .from('bot_config').select('value').eq('key', 'commands_panel_id').maybeSingle()

  if (existing?.value) {
    await channel.messages.fetch(existing.value).then(m => m.delete()).catch(() => {})
  }

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('📋 Commandes — Donjon Rouge BOT')
    .addFields(
      {
        name: '👤 Commandes membres',
        value: [
          '`/lier` — Associe ton tag CoC à Discord',
          '`/delier` — Supprime un compte lié',
          '`/principal` — Change ton compte principal',
          '`/profil` — Affiche ton profil CoC',
          '`/ping` — Vérifie si le bot est en ligne',
          '`/events` — Affiche les prochains événements COC',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🎮 Commandes vocales',
        value: [
          '`/vocal-prive` — Rend ton salon privé',
          '`/vocal-public` — Rend ton salon public',
          '`/vocal-limite` — Fixe le nombre de places',
          '`/vocal-kick` — Expulse un membre',
          '`/vocal-mute` — Mute/démute un membre',
        ].join('\n'),
        inline: false,
      },
      {
        name: '👑 Commandes admin — Général',
        value: [
          '`/panel` — Panel d\'administration complet',
          '`/refreshleagues` — Met à jour les rôles ligue',
          '`/refreshstatus` — Actualise le statut des combats',
          '`/refreshwar` — Actualise les salons de guerre',
          '`/refreshrappel` — Actualise les rappels',
          '`/resetstatus` — Recrée le message de statut',
          '`/resetwar` — Recrée les messages de guerre',
          '`/reset` — Recrée le message du salon actuel',
          '`/clear` — Supprime X messages du salon',
          '`/setupkaptcha` — Recrée le message vérification',
          '`/setupreglement` — Recrée le règlement',
          '`/setupreglementpublic` — Recrée le règlement public',
          '`/setupticket` — Recrée le message tickets',
          '`/setupmessaging` — Recrée le panel messagerie',
          '`/setupevents` — Recrée le panel événements',
        ].join('\n'),
        inline: false,
      },
      {
        name: '👑 Commandes admin — Membres',
        value: [
          '`/lier-admin` — Lie un compte manuellement',
          '`/delier-admin` — Délie un compte manuellement',
          '`/role-admin` — Attribue/retire un rôle',
          '`/profil-admin` — Voir le profil d\'un membre',
          '`/msg-rappel-guerre` — Envoie rappel guerre en DM',
          '`/msg-rappel-raid` — Envoie rappel raid en DM',
          '`/msg-custom` — Envoie message personnalisé en DM',
          '`/guerre` — Affiche la guerre en cours',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🔮 Commandes à venir',
        value: [
          '`/proposer-guerre` — Proposer une GDC amicale',
          '`/classement` — Top joueurs étoiles/donations',
          '`/sondage` — Créer un vote pour le clan',
        ].join('\n'),
        inline: false,
      },
    )
    .setTimestamp()

  const msg = await channel.send({ embeds: [embed] })
  await supabase.from('bot_config').upsert({ key: 'commands_panel_id', value: msg.id, updated_at: new Date().toISOString() })
  console.log(`[Commands] Message créé : ${msg.id}`)
  return msg
}

module.exports = { sendCommandsPanel, COMMANDS_CHANNEL_ID }
