const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const supabase = require('../supabase.js')

const SAURON_CHANNEL_ID = '1512087471373029508'

function buildSauronEmbed() {
  return new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('👁️ Panel Sauron — Administration Guerre')
    .setDescription('Utilise les boutons ci-dessous pour gérer les embeds et résultats.')
    .addFields(
      { name: '🔄 Ligne 1', value: 'Actualiser les embeds infos guerre (sans ping)', inline: false },
      { name: '📣 Ligne 2', value: 'Actualiser les embeds rappels (avec ping membres Liés)', inline: false },
      { name: '📊 Lignes 3-4', value: 'Poster manuellement les résultats dans le salon résultats', inline: false },
    )
    .setFooter({ text: 'Donjon Rouge • Panel Sauron' })
    .setTimestamp()
}

function buildSauronComponents() {
  const btn = (label, id, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style)

  return [
    new ActionRowBuilder().addComponents(
      btn('🔄 Guerre DR1', 'sauron_refresh_war_dr1'),
      btn('🔄 Guerre DR2', 'sauron_refresh_war_dr2'),
      btn('🔄 Raids',      'sauron_refresh_raids'),
      btn('🔄 JDC',        'sauron_refresh_jdc'),
    ),
    new ActionRowBuilder().addComponents(
      btn('📣 Rappel DR1',   'sauron_rappel_war_dr1',  ButtonStyle.Primary),
      btn('📣 Rappel DR2',   'sauron_rappel_war_dr2',  ButtonStyle.Primary),
      btn('📣 Rappel Raids', 'sauron_rappel_raids',    ButtonStyle.Primary),
      btn('📣 Rappel JDC',   'sauron_rappel_jdc',      ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      btn('📊 GDC DR1', 'sauron_resultats_gdc_dr1', ButtonStyle.Danger),
      btn('📊 GDC DR2', 'sauron_resultats_gdc_dr2', ButtonStyle.Danger),
      btn('📊 LDC DR1', 'sauron_resultats_ldc_dr1', ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      btn('📊 LDC DR2', 'sauron_resultats_ldc_dr2', ButtonStyle.Danger),
      btn('📊 Raids',   'sauron_resultats_raids',   ButtonStyle.Danger),
      btn('📊 JDC',     'sauron_resultats_jdc',     ButtonStyle.Danger),
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
