const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')

const SAURON_CHANNEL_ID = '1512087471373029508'

function buildSauronEmbed() {
  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('👁️ Panel Sauron — Administration')
    .setDescription('Panneau de contrôle unifié — guerre, rappels, résultats, messagerie DM, admin.')
    .addFields(
      { name: '━━━━━━  🔄 Ligne 1  ━━━━━━', value: '🔄 Actualiser les embeds infos guerre (sans ping) — DR1, DR2, Raids, JDC', inline: false },
      { name: '━━━━━━  📣 Ligne 2  ━━━━━━', value: '📣 Actualiser les embeds rappels (avec ping membres Liés) — DR1, DR2, Raids, JDC', inline: false },
      { name: '━━━━━━  📊 Ligne 3  ━━━━━━', value: '📊 Poster les résultats (GDC ou LDC auto-détecté) — DR1, DR2, Raids, JDC', inline: false },
      { name: '━━━━━━  📩 Ligne 4  ━━━━━━', value: '📩 Envoyer des DMs ciblés — Guerre, Raids, JDC, Message perso, Message global', inline: false },
      { name: '━━━━━━  ⚙️ Ligne 5  ━━━━━━', value: '⚙️ Actions admin — Actualisation Ligue, Actualisation Statut, Créer un événement Discord', inline: false },
    )
    .setFooter({ text: 'Donjon Rouge • Panel Sauron' })
    .setTimestamp()
}

function buildSauronComponents() {
  const btn = (label, id, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style)

  return [
    // Ligne 1 — Actualiser embeds infos
    new ActionRowBuilder().addComponents(
      btn('🔄 Guerre DR1', 'sauron_refresh_war_dr1'),
      btn('🔄 Guerre DR2', 'sauron_refresh_war_dr2'),
      btn('🔄 Raids',      'sauron_refresh_raids'),
      btn('🔄 JDC',        'sauron_refresh_jdc'),
    ),
    // Ligne 2 — Actualiser rappels
    new ActionRowBuilder().addComponents(
      btn('📣 Rapp. DR1',   'sauron_rappel_war_dr1', ButtonStyle.Primary),
      btn('📣 Rapp. DR2',   'sauron_rappel_war_dr2', ButtonStyle.Primary),
      btn('📣 Rapp. Raids', 'sauron_rappel_raids',   ButtonStyle.Primary),
      btn('📣 Rapp. JDC',   'sauron_rappel_jdc',     ButtonStyle.Primary),
    ),
    // Ligne 3 — Résultats (GDC/LDC auto-détecté)
    new ActionRowBuilder().addComponents(
      btn('📊 Résultats DR1',  'sauron_resultats_war_dr1',  ButtonStyle.Danger),
      btn('📊 Résultats DR2',  'sauron_resultats_war_dr2',  ButtonStyle.Danger),
      btn('📊 Résultats Raids', 'sauron_resultats_raids',   ButtonStyle.Danger),
      btn('📊 Résultats JDC',  'sauron_resultats_jdc',      ButtonStyle.Danger),
    ),
    // Ligne 4 — Messagerie DM (5 boutons max)
    new ActionRowBuilder().addComponents(
      btn('📩 DM-Guerre', 'msg_rappel_guerre',      ButtonStyle.Secondary),
      btn('📩 DM-Raids',  'msg_rappel_raid',         ButtonStyle.Secondary),
      btn('📩 DM-JDC',    'messaging_jdc_reminder',  ButtonStyle.Secondary),
      btn('✏️ DM-Perso',  'msg_custom',              ButtonStyle.Secondary),
      btn('📢 DM-Global', 'msg_global',              ButtonStyle.Danger),
    ),
    // Ligne 5 — Admin
    new ActionRowBuilder().addComponents(
      btn('🔄 Ligue',           'admin_refresh_league', ButtonStyle.Secondary),
      btn('🔄 Statut',          'admin_refresh_status', ButtonStyle.Secondary),
      btn('📅 Créer événement', 'admin_create_event',   ButtonStyle.Success),
    ),
  ]
}

async function postSauronPanel(client) {
  const channel = await client.channels.fetch(SAURON_CHANNEL_ID).catch(() => null)
  if (!channel) return null

  const { data } = await supabase.from('bot_config').select('value').eq('key', 'sauron_panel_msg_id').maybeSingle()
  if (data?.value) {
    try { await (await channel.messages.fetch(data.value)).delete() } catch {}
    await supabase.from('bot_config').delete().eq('key', 'sauron_panel_msg_id')
  }

  const msg = await channel.send({ embeds: [buildSauronEmbed()], components: buildSauronComponents() })
  await supabase.from('bot_config').upsert({ key: 'sauron_panel_msg_id', value: msg.id, updated_at: new Date().toISOString() })
  return msg
}

module.exports = { buildSauronEmbed, buildSauronComponents, postSauronPanel }
