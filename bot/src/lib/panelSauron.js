const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')

const SAURON_CHANNEL_ID = '1512087471373029508'

function buildSauronEmbed() {
  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('👁️ Panel Sauron — Administration Guerre')
    .setDescription('Utilise les boutons ci-dessous pour gérer les embeds et résultats de guerre.')
    .addFields(
      {
        name: '━━━━━━  🔄 Ligne 1  ━━━━━━',
        value: '🔄 Actualiser les embeds infos guerre (sans ping) — Guerre DR1, Guerre DR2, Raid Capital, JDC',
        inline: false,
      },
      {
        name: '━━━━━━  📣 Ligne 2  ━━━━━━',
        value: '📣 Actualiser les rappels (avec ping membres Liés) — DR1, DR2, Raids, JDC',
        inline: false,
      },
      {
        name: '━━━━━━  📊 Lignes 3-4  ━━━━━━',
        value: '📊 Poster manuellement les résultats dans le salon résultats',
        inline: false,
      },
      {
        name: '━━━━━━  📩 Ligne 5  ━━━━━━',
        value: '📩 Envoyer des DMs ciblés aux membres (guerre, raid, JDC, personnalisé, global)',
        inline: false,
      },
    )
    .setFooter({ text: 'Donjon Rouge • Panel Sauron' })
    .setTimestamp()
}

function buildSauronComponents() {
  const btn = (label, id, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style)

  return [
    // Ligne 1 — Actualiser infos en cours
    new ActionRowBuilder().addComponents(
      btn('🔄 Guerre DR1', 'sauron_refresh_war_dr1'),
      btn('🔄 Guerre DR2', 'sauron_refresh_war_dr2'),
      btn('🔄 Raid Capital', 'sauron_refresh_raids'),
      btn('🔄 Jeux des Clans', 'sauron_refresh_jdc'),
    ),
    // Ligne 2 — Actualiser rappels
    new ActionRowBuilder().addComponents(
      btn('📣 Rappel Guerre DR1', 'sauron_rappel_war_dr1', ButtonStyle.Primary),
      btn('📣 Rappel Guerre DR2', 'sauron_rappel_war_dr2', ButtonStyle.Primary),
      btn('📣 Rappel Raids',      'sauron_rappel_raids',   ButtonStyle.Primary),
      btn('📣 Rappel JDC',        'sauron_rappel_jdc',     ButtonStyle.Primary),
    ),
    // Ligne 3 — Résultats (1/2)
    new ActionRowBuilder().addComponents(
      btn('📊 Résultats GDC DR1', 'sauron_resultats_gdc_dr1', ButtonStyle.Danger),
      btn('📊 Résultats GDC DR2', 'sauron_resultats_gdc_dr2', ButtonStyle.Danger),
      btn('📊 Résultats LDC DR1', 'sauron_resultats_ldc_dr1', ButtonStyle.Danger),
    ),
    // Ligne 4 — Résultats (2/2)
    new ActionRowBuilder().addComponents(
      btn('📊 Résultats LDC DR2', 'sauron_resultats_ldc_dr2', ButtonStyle.Danger),
      btn('📊 Résultats Raids',   'sauron_resultats_raids',   ButtonStyle.Danger),
      btn('📊 Résultats JDC',     'sauron_resultats_jdc',     ButtonStyle.Danger),
    ),
    // Ligne 5 — Messagerie DM
    new ActionRowBuilder().addComponents(
      btn('📩 DM Guerre',         'msg_rappel_guerre',       ButtonStyle.Secondary),
      btn('📩 DM Raid',           'msg_rappel_raid',         ButtonStyle.Secondary),
      btn('📩 DM JDC',            'messaging_jdc_reminder',  ButtonStyle.Secondary),
      btn('✏️ Message perso',     'msg_custom',              ButtonStyle.Secondary),
      btn('📢 Message global',    'msg_global',              ButtonStyle.Danger),
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
