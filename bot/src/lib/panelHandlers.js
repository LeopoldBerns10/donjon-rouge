const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js')
const supabase = require('../supabase.js')
const { isAdmin } = require('./isAdmin.js')
const { BOT_ADMINS, ADMIN_CHANNEL_ID } = require('../config/admin.js')
const { CHANNELS, ROLES } = require('../config/onboarding.js')
const { ACCOUNT_CHANNEL_ID, REMINDER_CHANNEL_ID } = require('../config/reminders.js')
const { TICKET_CHANNEL_ID } = require('../config/tickets.js')
const { buildReglementEmbed, REGLEMENT_TEXT } = require('../setup/sendReglement.js')
const { PUBLIC_CHANNEL_ID } = require('../setup/sendReglementPublic.js')
const { getPlayer, getClanMembers, getClanMembersDR2 } = require('../cocApi.js')
const { updateJdcEmbeds } = require('./jdcTracker.js')
const { updateWarEmbeds, isChefOrAdjoint } = require('./warEmbeds.js')
const { updateRappelEmbeds } = require('./rappelEmbeds.js')
const { assignLeagueRole } = require('../utils/assignLeagueRole.js')
const { assignHdvRole } = require('../utils/assignHdvRole.js')
const { log } = require('./botLogger.js')
const DONJON_ROUGE_ROLE_ID = '611125112519000064'
const LIE_ROLE_ID          = '1511096527664320655'
const { forceRefresh, resetStatus } = require('../scheduler.js')
const { JDC_TRACKING_CHANNEL } = require('../config/jdcConfig.js')

const sleep        = ms => new Promise(r => setTimeout(r, ms))
const bulkDeleteCh = async ch => { try { await ch.bulkDelete(100) } catch {} }
const JDC_EMBED_KEYS = ['jdc_embed_all_id', 'jdc_embed_absent_id']

const PAGE_SIZE = 10

// ─── Cache membres ────────────────────────────────────────────────────────────

let membresCache = null
let membresCacheTime = 0
const CACHE_TTL = 5 * 60 * 1000
function invalidateMembresCache() {
  membresCache = null
  membresCacheTime = 0
}

async function getMembresData(guild) {
  if (membresCache && Date.now() - membresCacheTime < CACHE_TTL) {
    return membresCache
  }

  const { data: links } = await supabase
    .from('discord_links')
    .select('discord_id, coc_name, coc_tag, is_primary')

  const members = [...guild.members.cache.values()]
    .filter(m => !m.user.bot)
    .map(m => {
      const primary = links?.find(l => l.discord_id === m.id && l.is_primary)
        ?? links?.find(l => l.discord_id === m.id)
      return {
        pseudo: m.nickname ?? m.user.displayName ?? m.user.username,
        role:   m.roles.highest?.name ?? 'Aucun',
        coc:    primary ? `${primary.coc_name} (${primary.coc_tag})` : 'Non lié ❌',
      }
    })

  membresCache = members
  membresCacheTime = Date.now()
  return members
}

// ─── Nav rows (toujours présents) ─────────────────────────────────────────────

function buildNavRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_home').setLabel('🏠 Panel').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('panel_membres').setLabel('👥 Membres').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('panel_csv').setLabel('📊 Export CSV').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('panel_messages').setLabel('✉️ Messages').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('panel_config').setLabel('⚙️ Config').setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_admins').setLabel('👑 Admins').setStyle(ButtonStyle.Danger),
    ),
  ]
}

// ─── Onglet Accueil ───────────────────────────────────────────────────────────

async function buildHomePayload() {
  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🏰 Panel Admin — Donjon Rouge')
    .setDescription('Bienvenue dans le panel d\'administration du bot.')
    .addFields(
      { name: '👥 Membres',      value: 'Liste paginée des membres, statut COC lié, lier/délier manuellement', inline: false },
      { name: '📊 Export CSV',   value: 'Télécharger la liste complète des membres', inline: false },
      { name: '✉️ Messages',     value: 'Modifier les messages postés par le bot', inline: false },
      { name: '⚙️ Config',       value: 'Activer/désactiver les vérifications automatiques et rappels de guerre', inline: false },
      { name: '👑 Admins',       value: 'Gérer les administrateurs du bot', inline: false },
    )

  return { embeds: [embed], components: buildNavRows() }
}

// ─── Onglet Membres ───────────────────────────────────────────────────────────

async function buildMembresPayload(guild, page = 0) {
  const members = await getMembresData(guild)

  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE))
  page = Math.max(0, Math.min(page, totalPages - 1))
  const slice = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`👥 Membres (${members.length})`)
    .setDescription(slice.map(m => `**${m.pseudo}** — ${m.role} — ${m.coc}`).join('\n') || 'Aucun.')
    .setFooter({ text: `Page ${page + 1}/${totalPages}` })

  const components = [...buildNavRows()]

  if (totalPages > 1) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`panel_membres_prev:${page}`)
        .setLabel('◀ Précédent')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`panel_membres_next:${page}`)
        .setLabel('Suivant ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    ))
  }

  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('panel_lier_membre').setLabel('🔗 Lier').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('panel_delier_membre').setLabel('✂️ Délier').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('panel_membres_dr1').setLabel('🏰 DR1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('panel_membres_dr2').setLabel('🏰 DR2').setStyle(ButtonStyle.Primary),
  ))

  return { embeds: [embed], components }
}

// ─── Onglet Messages ──────────────────────────────────────────────────────────

async function buildMessagesPayload() {
  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('✉️ Messages modifiables')
    .setDescription('Clique sur un bouton pour modifier le message correspondant.')
    .addFields(
      { name: '🔐 Vérification',      value: `<#${CHANNELS.VERIFICATION}>`, inline: true },
      { name: '📜 Règlement',         value: `<#${CHANNELS.REGLEMENT}>`,    inline: true },
      { name: '📜 Règlement Public',  value: `<#768557389154615307>`,       inline: true },
      { name: '🏠 Mon Compte',        value: `<#${ACCOUNT_CHANNEL_ID}>`,    inline: true },
      { name: '🎫 Tickets',           value: `<#${TICKET_CHANNEL_ID}>`,  inline: true },
      { name: '✉️ Dimanche GDC',     value: `<#${GDC_CHANNEL_ID}>`,    inline: true },
      { name: '✉️ Mardi GDC',        value: `<#${GDC_CHANNEL_ID}>`,    inline: true },
      { name: '📨 Msg Arrivée',      value: 'DM envoyé au nouveau membre', inline: true },
      { name: '👋 Msg Départ',       value: 'Embed posté à la sortie',     inline: true },
    )

  return {
    embeds: [embed],
    components: [
      ...buildNavRows(),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('panel_msg_verification').setLabel('🔐 Vérification').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_msg_reglement').setLabel('📜 Règlement').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_msg_reglement_public').setLabel('📜 Règlt Public').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_msg_moncompte').setLabel('🏠 Mon Compte').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_msg_tickets').setLabel('🎫 Tickets').setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('panel_msg_gdc_dimanche').setLabel('✉️ Msg Dimanche GDC').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_msg_gdc_mardi').setLabel('✉️ Msg Mardi GDC').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_msg_arrivee').setLabel('📨 Msg Arrivée').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('panel_msg_depart').setLabel('👋 Msg Départ').setStyle(ButtonStyle.Secondary),
      ),
    ],
  }
}

// ─── Onglet Config ────────────────────────────────────────────────────────────

async function buildConfigPayload() {
  const [s, r] = await Promise.all([
    supabase.from('bot_config').select('value').eq('key', 'scheduler_enabled').maybeSingle(),
    supabase.from('bot_config').select('value').eq('key', 'rappels_enabled').maybeSingle(),
  ])
  const scheduler = s.data?.value !== 'false'
  const rappels   = r.data?.value !== 'false'

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('⚙️ Configuration du bot')
    .addFields(
      { name: '🔄 Vérifications automatiques', value: scheduler ? '✅ Actives'  : '❌ Inactives', inline: true },
      { name: '⚔️ Rappels de guerre',          value: rappels   ? '✅ Actifs'   : '❌ Inactifs',  inline: true },
    )

  return {
    embeds: [embed],
    components: [
      ...buildNavRows(),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('panel_toggle_scheduler')
          .setLabel(scheduler ? 'Désactiver les vérifications' : 'Activer les vérifications')
          .setStyle(scheduler ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('panel_toggle_rappels')
          .setLabel(rappels ? 'Désactiver les rappels' : 'Activer les rappels')
          .setStyle(rappels ? ButtonStyle.Danger : ButtonStyle.Success),
      ),
    ],
  }
}

// ─── Onglet Admins ────────────────────────────────────────────────────────────

async function getDynamicAdmins() {
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'bot_admins').maybeSingle()
  try { return JSON.parse(data?.value ?? '[]') } catch { return [] }
}

async function saveDynamicAdmins(arr) {
  await supabase.from('bot_config').upsert({
    key: 'bot_admins',
    value: JSON.stringify(arr),
    updated_at: new Date().toISOString(),
  })
}

async function buildAdminsPayload(guild) {
  const dynamic = await getDynamicAdmins()
  const all = [...new Set([...BOT_ADMINS, ...dynamic])]

  const lines = await Promise.all(all.map(async id => {
    let name = id
    try { const m = await guild.members.fetch(id); name = m.user.username } catch {}
    return `${BOT_ADMINS.includes(id) ? '🔒' : '🔓'} **${name}**${BOT_ADMINS.includes(id) ? ' *(fixe)*' : ''}`
  }))

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`👑 Admins bot (${all.length})`)
    .setDescription(lines.join('\n') || 'Aucun admin.')
    .setFooter({ text: '🔒 = fixe | 🔓 = dynamique (retiable)' })

  const components = [
    ...buildNavRows(),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_modal_admin_add')
        .setLabel('➕ Ajouter admin')
        .setStyle(ButtonStyle.Success),
    ),
  ]

  if (dynamic.length > 0) {
    const options = await Promise.all(dynamic.slice(0, 25).map(async id => {
      let label = id
      try { const m = await guild.members.fetch(id); label = m.user.username } catch {}
      return new StringSelectMenuOptionBuilder().setLabel(label).setValue(id)
    }))
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('panel_admin_remove')
        .setPlaceholder('➖ Retirer un admin dynamique')
        .addOptions(options),
    ))
  }

  return { embeds: [embed], components }
}

// ─── Vue délier membre ────────────────────────────────────────────────────────

async function buildDelierPayload(guild) {
  const { data: links } = await supabase
    .from('discord_links')
    .select('discord_id, coc_name, coc_tag')
    .order('created_at', { ascending: true })

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('✂️ Délier un membre')
    .setDescription('Sélectionne le compte à délier.')

  if (!links || links.length === 0) {
    return {
      embeds: [embed.setDescription('Aucun compte lié trouvé.')],
      components: buildNavRows(),
    }
  }

  const options = await Promise.all(links.slice(0, 25).map(async link => {
    let pseudo = link.discord_id
    try { const m = await guild.members.fetch(link.discord_id); pseudo = m.user.username } catch {}
    return new StringSelectMenuOptionBuilder()
      .setLabel(`${pseudo} — ${link.coc_name} ${link.coc_tag}`.slice(0, 100))
      .setValue(`${link.discord_id}:${link.coc_tag}`)
  }))

  return {
    embeds: [embed],
    components: [
      ...buildNavRows(),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('panel_delier_select')
          .setPlaceholder('Sélectionne le lien à supprimer')
          .addOptions(options),
      ),
    ],
  }
}

// ─── Utilitaire : éditer le message panel ─────────────────────────────────────

async function refreshPanelMessage(client, payload) {
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'admin_panel_message_id').maybeSingle()
  if (!data?.value) return
  try {
    const channel = await client.channels.fetch(ADMIN_CHANNEL_ID)
    const msg = await channel.messages.fetch(data.value)
    await msg.edit(payload)
  } catch {}
}

// ─── Handlers boutons panel ───────────────────────────────────────────────────

async function handlePanelHome(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildHomePayload())
}

async function handlePanelMembres(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildMembresPayload(interaction.guild, 0))
}

async function handlePanelMembresNav(interaction, dir, currentPage) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  const nextPage = dir === 'prev' ? currentPage - 1 : currentPage + 1
  await interaction.editReply(await buildMembresPayload(interaction.guild, nextPage))
}

async function handlePanelCsv(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()

  const guildMembers = await interaction.guild.members.fetch()
  const { data: links } = await supabase.from('discord_links').select('*')

  const rows = ['discord_id,pseudo,role,coc_name,coc_tag,lié']
  for (const m of guildMembers.values()) {
    if (m.user.bot) continue
    const role = m.roles.highest?.name ?? ''
    const memberLinks = links?.filter(l => l.discord_id === m.id) ?? []
    if (memberLinks.length === 0) {
      rows.push(`${m.id},"${m.user.username}","${role}","","","non"`)
    } else {
      for (const link of memberLinks) {
        rows.push(`${m.id},"${m.user.username}","${role}","${link.coc_name}","${link.coc_tag}","oui"`)
      }
    }
  }

  await interaction.followUp({
    content: '📊 Export CSV généré.',
    files: [{ attachment: Buffer.from(rows.join('\n'), 'utf-8'), name: `membres_${new Date().toISOString().slice(0, 10)}.csv` }],
    ephemeral: true,
  })
}

async function handlePanelMessages(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildMessagesPayload())
}

async function handlePanelConfig(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildConfigPayload())
}

async function handlePanelAdmins(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildAdminsPayload(interaction.guild))
}

async function handlePanelToggleScheduler(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'scheduler_enabled').maybeSingle()
  const newVal = data?.value === 'false' ? 'true' : 'false'
  await supabase.from('bot_config').upsert({ key: 'scheduler_enabled', value: newVal, updated_at: new Date().toISOString() })
  await interaction.editReply(await buildConfigPayload())
}

async function handlePanelToggleRappels(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'rappels_enabled').maybeSingle()
  const newVal = data?.value === 'false' ? 'true' : 'false'
  await supabase.from('bot_config').upsert({ key: 'rappels_enabled', value: newVal, updated_at: new Date().toISOString() })
  await interaction.editReply(await buildConfigPayload())
}

async function handlePanelModalReglement(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })

  let currentText = REGLEMENT_TEXT
  try {
    const { data } = await supabase.from('bot_config').select('value').eq('key', 'reglement_message_id').maybeSingle()
    if (data?.value) {
      const channel = await interaction.client.channels.fetch(CHANNELS.REGLEMENT)
      const msg = await channel.messages.fetch(data.value)
      currentText = msg.embeds[0]?.description ?? REGLEMENT_TEXT
    }
  } catch {}

  const modal = new ModalBuilder()
    .setCustomId('modal_panel_reglement')
    .setTitle('Modifier le Règlement')
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('reglement_content')
      .setLabel('Texte du règlement')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(currentText)
      .setMaxLength(4000)
      .setRequired(true),
  ))
  await interaction.showModal(modal)
}

async function handlePanelModalAdminAdd(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })

  const modal = new ModalBuilder()
    .setCustomId('modal_panel_admin_add')
    .setTitle('Ajouter un admin')
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('admin_id')
      .setLabel('ID Discord du membre')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('278245562191577088')
      .setRequired(true),
  ))
  await interaction.showModal(modal)
}

async function handlePanelAdminRemove(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  const removeId = interaction.values[0]
  const dynamic = await getDynamicAdmins()
  await saveDynamicAdmins(dynamic.filter(id => id !== removeId))
  await interaction.editReply(await buildAdminsPayload(interaction.guild))
}

// ─── Onglets DR1 / DR2 ───────────────────────────────────────────────────────

async function buildMembresDRPayload(guild, clan, page = 0) {
  const res = clan === 'dr1'
    ? await getClanMembers().catch(() => null)
    : await getClanMembersDR2().catch(() => null)

  const cocMembers = (res?.items ?? res ?? [])

  const { data: links } = await supabase
    .from('discord_links')
    .select('discord_id, coc_tag')

  const totalPages = Math.max(1, Math.ceil(cocMembers.length / PAGE_SIZE))
  page = Math.max(0, Math.min(page, totalPages - 1))
  const slice = cocMembers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const lines = slice.map(m => {
    const link = links?.find(l => l.coc_tag === m.tag)
    const discord = link
      ? `<@${link.discord_id}>`
      : 'Non lié ❌'
    return `**${m.name}** (${m.tag}) — ${discord}`
  })

  const label = clan === 'dr1' ? 'DR1' : 'DR2'
  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`🏰 Membres ${label} (${cocMembers.length})`)
    .setDescription(lines.join('\n') || 'Aucun membre.')
    .setFooter({ text: `Page ${page + 1}/${totalPages}` })

  const components = [...buildNavRows()]

  if (totalPages > 1) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`panel_membres_${clan}_prev:${page}`)
        .setLabel('◀ Précédent')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`panel_membres_${clan}_next:${page}`)
        .setLabel('Suivant ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    ))
  }

  return { embeds: [embed], components }
}

async function handlePanelMembresDR1(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildMembresDRPayload(interaction.guild, 'dr1', 0))
}

async function handlePanelMembresDR2(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildMembresDRPayload(interaction.guild, 'dr2', 0))
}

async function handlePanelMembresDRNav(interaction, clan, dir, currentPage) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  const nextPage = dir === 'prev' ? currentPage - 1 : currentPage + 1
  await interaction.editReply(await buildMembresDRPayload(interaction.guild, clan, nextPage))
}

// ─── Lier membre — modal simple ───────────────────────────────────────────────

async function handlePanelLierMembre(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })

  const modal = new ModalBuilder()
    .setCustomId('modal_panel_lier')
    .setTitle('Lier un membre')
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('discord_membre')
        .setLabel('Nom COC ou ID Discord')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('ID Discord, @mention ou pseudo')
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('coc_tag')
        .setLabel('Tag CoC (ex: #ABC123)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#ABC123')
        .setRequired(true),
    ),
  )
  await interaction.showModal(modal)
}

async function handlePanelDelierMembre(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })
  await interaction.editReply(await buildDelierPayload(interaction.guild))
}

async function handlePanelDelierSelect(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()
  if (!await isAdmin(interaction.member)) return interaction.followUp({ content: '❌ Accès refusé.', ephemeral: true })

  const [discordId, cocTag] = interaction.values[0].split(':')

  const { data: link } = await supabase
    .from('discord_links')
    .select('coc_name, is_primary')
    .eq('discord_id', discordId)
    .eq('coc_tag', cocTag)
    .maybeSingle()

  if (!link) {
    return interaction.editReply(await buildMembresPayload(interaction.guild, 0))
  }

  await supabase.from('discord_links').delete().eq('discord_id', discordId).eq('coc_tag', cocTag)
  invalidateMembresCache()

  const { data: remaining } = await supabase
    .from('discord_links')
    .select('coc_tag')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: true })

  const target = await interaction.guild.members.fetch(discordId).catch(() => null)
  if (target) {
    if (!remaining || remaining.length === 0) {
      target.roles.remove(ROLES.LIE).catch(() => {})
      assignLeagueRole(target, null).catch(() => {})
    } else if (link.is_primary) {
      await supabase.from('discord_links').update({ is_primary: true }).eq('discord_id', discordId).eq('coc_tag', remaining[0].coc_tag)
    }
  }

  await interaction.editReply(await buildMembresPayload(interaction.guild, 0))
}

// ─── Messages modifiables — helpers et handlers ───────────────────────────────

const GDC_CHANNEL_ID           = '1512570321683746926'
const GDC_DEFAULT_DIMANCHE     = "Salut <@&1297318759396278425> Il est l'heure d'envoyer les inscriptions pour la GDC du mardi Chef !"
const GDC_DEFAULT_MARDI        = "Salut <@&1297318759396278425> Il est l'heure de lancer la GDC Chef !"
const WELCOME_DM_DEFAULT       = 'Bienvenue sur le serveur Donjon Rouge ! Rends-toi dans le salon vérification pour accéder au serveur.'
const DEPARTURE_TITLE_DEFAULT  = '👋 Un guerrier quitte le Donjon...'
const DEPARTURE_DESC_DEFAULT   = '{user} a quitté nos rangs.'


async function fetchMsgText(client, channelId, configKey) {
  const { data } = await supabase.from('bot_config').select('value').eq('key', configKey).maybeSingle()
  if (!data?.value) return ''
  try {
    const ch = await client.channels.fetch(channelId)
    const msg = await ch.messages.fetch(data.value)
    return msg.embeds[0]?.description ?? ''
  } catch { return '' }
}

async function editMsgEmbed(client, channelId, configKey, newText) {
  const { data } = await supabase.from('bot_config').select('value').eq('key', configKey).maybeSingle()
  if (!data?.value) throw new Error('ID introuvable dans bot_config.')
  const ch = await client.channels.fetch(channelId)
  const msg = await ch.messages.fetch(data.value)
  const updated = EmbedBuilder.from(msg.embeds[0]).setDescription(newText)
  await msg.edit({ embeds: [updated] })
}

function buildMsgModal(customId, title, currentText) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title)
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('msg_content')
      .setLabel('Nouveau texte')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(currentText)
      .setMaxLength(4000)
      .setRequired(true),
  ))
  return modal
}

async function handlePanelMsgVerification(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const text = await fetchMsgText(interaction.client, CHANNELS.VERIFICATION, 'kaptcha_message_id')
  await interaction.showModal(buildMsgModal('modal_panel_msg_verification', '🔐 Message Vérification', text))
}

async function handlePanelMsgReglement(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const text = await fetchMsgText(interaction.client, CHANNELS.REGLEMENT, 'reglement_message_id')
  await interaction.showModal(buildMsgModal('modal_panel_msg_reglement', '📜 Message Règlement', text))
}

async function handlePanelMsgReglementPublic(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const text = await fetchMsgText(interaction.client, '768557389154615307', 'reglement_public_message_id')
  await interaction.showModal(buildMsgModal('modal_panel_msg_reglement_public', '📜 Règlement Public', text))
}

async function handlePanelMsgMonCompte(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const text = await fetchMsgText(interaction.client, ACCOUNT_CHANNEL_ID, 'account_message_id')
  await interaction.showModal(buildMsgModal('modal_panel_msg_moncompte', '🏠 Message Mon Compte', text))
}

async function handlePanelMsgTickets(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const text = await fetchMsgText(interaction.client, TICKET_CHANNEL_ID, 'ticket_message_id')
  await interaction.showModal(buildMsgModal('modal_panel_msg_tickets', '🎫 Message Tickets', text))
}

async function handlePanelMsgGdcDimanche(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'gdc_msg_dimanche').maybeSingle()
  await interaction.showModal(buildMsgModal('modal_panel_msg_gdc_dimanche', '✉️ Message Dimanche GDC', data?.value ?? GDC_DEFAULT_DIMANCHE))
}

async function handlePanelMsgGdcMardi(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'gdc_msg_mardi').maybeSingle()
  await interaction.showModal(buildMsgModal('modal_panel_msg_gdc_mardi', '✉️ Message Mardi GDC', data?.value ?? GDC_DEFAULT_MARDI))
}

async function handleModalPanelMsgGdc(interaction) {
  const key     = interaction.customId === 'modal_panel_msg_gdc_dimanche' ? 'gdc_msg_dimanche' : 'gdc_msg_mardi'
  const newText = interaction.fields.getTextInputValue('msg_content')
  await supabase.from('bot_config').upsert({ key, value: newText, updated_at: new Date().toISOString() })
  await interaction.reply({ content: '✅ Message GDC mis à jour.', ephemeral: true })
}

async function handlePanelMsgArrivee(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const { data } = await supabase.from('bot_config').select('value').eq('key', 'welcome_dm_msg').maybeSingle()
  await interaction.showModal(buildMsgModal('modal_panel_msg_arrivee', '📨 Message Arrivée (DM)', data?.value ?? WELCOME_DM_DEFAULT))
}

async function handlePanelMsgDepart(interaction) {
  if (!await isAdmin(interaction.member)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true })
  const [{ data: titleData }, { data: descData }] = await Promise.all([
    supabase.from('bot_config').select('value').eq('key', 'departure_title').maybeSingle(),
    supabase.from('bot_config').select('value').eq('key', 'departure_desc').maybeSingle(),
  ])
  const modal = new ModalBuilder().setCustomId('modal_panel_msg_depart').setTitle('👋 Message Départ')
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('departure_title')
        .setLabel('Titre de l\'embed')
        .setStyle(TextInputStyle.Short)
        .setValue(titleData?.value ?? DEPARTURE_TITLE_DEFAULT)
        .setMaxLength(256)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('departure_desc')
        .setLabel('Description ({user} = mention du membre)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(descData?.value ?? DEPARTURE_DESC_DEFAULT)
        .setMaxLength(2000)
        .setRequired(true),
    ),
  )
  await interaction.showModal(modal)
}

async function handleModalPanelMsgArrivee(interaction) {
  const newText = interaction.fields.getTextInputValue('msg_content')
  await supabase.from('bot_config').upsert({ key: 'welcome_dm_msg', value: newText, updated_at: new Date().toISOString() })
  await interaction.reply({ content: '✅ Message d\'arrivée mis à jour.', ephemeral: true })
}

async function handleModalPanelMsgDepart(interaction) {
  const newTitle = interaction.fields.getTextInputValue('departure_title')
  const newDesc  = interaction.fields.getTextInputValue('departure_desc')
  await Promise.all([
    supabase.from('bot_config').upsert({ key: 'departure_title', value: newTitle, updated_at: new Date().toISOString() }),
    supabase.from('bot_config').upsert({ key: 'departure_desc',  value: newDesc,  updated_at: new Date().toISOString() }),
  ])
  await interaction.reply({ content: '✅ Message de départ mis à jour.', ephemeral: true })
}

async function handleModalPanelMsg(interaction, channelId, configKey) {
  const newText = interaction.fields.getTextInputValue('msg_content')
  try {
    await editMsgEmbed(interaction.client, channelId, configKey, newText)
    await interaction.reply({ content: '✅ Message mis à jour.', ephemeral: true })
  } catch (err) {
    console.error('[modal_panel_msg]', err)
    await interaction.reply({ content: '❌ Impossible de mettre à jour le message. L\'ID est-il bien stocké via /setup ?', ephemeral: true })
  }
}

// ─── Handlers soumission modals ───────────────────────────────────────────────

async function handleModalPanelReglement(interaction) {
  const newText = interaction.fields.getTextInputValue('reglement_content')
  try {
    const { data } = await supabase.from('bot_config').select('value').eq('key', 'reglement_message_id').maybeSingle()
    if (data?.value) {
      const channel = await interaction.client.channels.fetch(CHANNELS.REGLEMENT)
      const msg = await channel.messages.fetch(data.value)
      await msg.edit({ embeds: [buildReglementEmbed(newText)] })
    }
    const { data: pub } = await supabase.from('bot_config').select('value').eq('key', 'reglement_public_message_id').maybeSingle()
    if (pub?.value) {
      try {
        const pubCh = await interaction.client.channels.fetch(PUBLIC_CHANNEL_ID)
        const pubMsg = await pubCh.messages.fetch(pub.value)
        await pubMsg.edit({ embeds: [buildReglementEmbed(newText)] })
      } catch {}
    }
    await interaction.reply({ content: '✅ Règlement mis à jour.', ephemeral: true })
  } catch (err) {
    console.error('[modal_panel_reglement]', err)
    await interaction.reply({ content: '❌ Impossible de mettre à jour le règlement.', ephemeral: true })
  }
}

async function handleModalPanelLier(interaction) {
  const rawMembre = interaction.fields.getTextInputValue('discord_membre').trim()
  const rawTag    = interaction.fields.getTextInputValue('coc_tag').trim().toUpperCase()
  const tag = rawTag.startsWith('#') ? rawTag : `#${rawTag}`

  // Chercher le membre Discord : ID/mention → cache, sinon Supabase par coc_name
  const cleanId = rawMembre.replace(/[<@!>]/g, '')
  let target = interaction.guild.members.cache.get(cleanId)
    ?? interaction.guild.members.cache.find(m => m.user.username.toLowerCase() === cleanId.toLowerCase())

  if (!target) {
    const { data: found } = await supabase
      .from('discord_links')
      .select('discord_id')
      .ilike('coc_name', cleanId)
      .maybeSingle()
    if (found?.discord_id) target = interaction.guild.members.cache.get(found.discord_id)
  }

  if (!target) {
    return interaction.reply({ content: `❌ Membre introuvable : \`${rawMembre}\`.`, ephemeral: true })
  }

  try {
    const player = await getPlayer(tag)

    const { data: existing } = await supabase
      .from('discord_links')
      .select('id')
      .eq('discord_id', target.id)
      .eq('coc_tag', player.tag)
      .maybeSingle()

    if (existing) {
      return interaction.reply({ content: `⚠️ Ce compte est déjà lié à **${target.user.username}**.`, ephemeral: true })
    }

    const { count } = await supabase
      .from('discord_links')
      .select('id', { count: 'exact', head: true })
      .eq('discord_id', target.id)

    const isPrimary = count === 0

    await supabase.from('discord_links').insert({
      discord_id: target.id,
      coc_tag:    player.tag,
      coc_name:   player.name,
      is_primary: isPrimary,
    })
    invalidateMembresCache()

    if (isPrimary && player.leagueTier?.name) assignLeagueRole(target, player.leagueTier.name).catch(() => {})
    if (ROLES.LIE) target.roles.add(ROLES.LIE).catch(() => {})

    await refreshPanelMessage(interaction.client, await buildMembresPayload(interaction.guild, 0))
    await interaction.reply({
      content: `✅ **${player.name}** (${player.tag}) lié à **${target.user.username}**${isPrimary ? ' *(principal)*' : ''}.`,
      ephemeral: true,
    })
  } catch (err) {
    console.error('[modal_panel_lier]', err)
    await interaction.reply({ content: `❌ Tag introuvable : \`${tag}\`.`, ephemeral: true })
  }
}

async function handleModalPanelAdminAdd(interaction) {
  const newId = interaction.fields.getTextInputValue('admin_id').trim()
  const dynamic = await getDynamicAdmins()
  if (!dynamic.includes(newId) && !BOT_ADMINS.includes(newId)) {
    dynamic.push(newId)
    await saveDynamicAdmins(dynamic)
  }
  await refreshPanelMessage(interaction.client, await buildAdminsPayload(interaction.guild))
  await interaction.reply({ content: `✅ <@${newId}> ajouté comme admin.`, ephemeral: true })
}


// ─── Handlers boutons admin refresh ──────────────────────────────────────────

async function handleAdminRefreshWar(interaction) {
  if (!(await isAdmin(interaction.member))) return interaction.reply({ content: '❌ Accès réservé aux administrateurs.', ephemeral: true })
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  try {
    await updateWarEmbeds(interaction.client)
    await interaction.editReply('✅ Salons de guerre actualisés.')
  } catch (e) { console.error('[adminRefreshWar]', e); await interaction.editReply('❌ Erreur lors du refresh.') }
}

async function handleAdminRefreshRaid(interaction) {
  if (!(await isAdmin(interaction.member))) return interaction.reply({ content: '❌ Accès réservé aux administrateurs.', ephemeral: true })
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  try {
    const { buildRaidsEmbed, makeRefreshRow } = require('./warEmbeds.js')
    const { replaceEmbed } = require('./eventChannels.js')
    const embed = await buildRaidsEmbed()
    await replaceEmbed(interaction.client, '1511988581135159376', 'war_raids_msg_id', embed, makeRefreshRow('refresh_raids'))
    await interaction.editReply('✅ Embed Raid Capital actualisé.')
  } catch (e) { console.error('[adminRefreshRaid]', e); await interaction.editReply('❌ Erreur lors du refresh.') }
}

async function handleAdminRefreshJdc(interaction) {
  if (!(await isAdmin(interaction.member))) return interaction.reply({ content: '❌ Accès réservé aux administrateurs.', ephemeral: true })
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  try {
    const { data: rows } = await supabase.from('bot_config').select('key, value').in('key', JDC_EMBED_KEYS)
    const embedIds = Object.fromEntries((rows ?? []).map(r => [r.key, r.value]))
    const ch = await interaction.client.channels.fetch(JDC_TRACKING_CHANNEL).catch(() => null)
    if (ch) {
      for (const key of JDC_EMBED_KEYS) {
        const id = embedIds[key]
        if (id) { try { await (await ch.messages.fetch(id)).delete() } catch {} }
      }
    }
    await supabase.from('bot_config').delete().in('key', JDC_EMBED_KEYS)
    await updateJdcEmbeds(interaction.client)
    await interaction.editReply('✅ Embeds JDC recréés.')
  } catch (e) { console.error('[adminRefreshJdc]', e); await interaction.editReply('❌ Erreur lors du refresh.') }
}

async function handleAdminRefreshLeague(interaction) {
  if (!(await isAdmin(interaction.member))) return interaction.reply({ content: '❌ Accès réservé aux administrateurs.', ephemeral: true })
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  try {
    const { data: links } = await supabase.from('discord_links').select('discord_id, coc_tag, coc_name').eq('is_primary', true)
    if (!links?.length) return interaction.editReply('Aucun compte principal lié trouvé.')
    let updated = 0, errors = 0
    for (const link of links) {
      try {
        const member = await interaction.guild.members.fetch(link.discord_id).catch(() => null)
        if (!member) {
          errors++
          log(interaction.client, 'ERREUR', `Refresh ligue — **${link.coc_name}** (\`${link.coc_tag}\`) : membre Discord introuvable (quitté le serveur ?)`, true).catch(() => {})
          continue
        }
        if (!member.roles.cache.has(DONJON_ROUGE_ROLE_ID) || !member.roles.cache.has(LIE_ROLE_ID)) {
          await assignLeagueRole(member, null).catch(() => {})
          continue
        }
        const player = await getPlayer(link.coc_tag)
        await assignLeagueRole(member, player.leagueTier?.name ?? null)
        await assignHdvRole(member, player.townHallLevel)
        updated++
      } catch (err) {
        console.error(`[adminRefreshLeague] ${link.coc_name}:`, err.message)
        errors++
        log(interaction.client, 'ERREUR', `Refresh ligue — **${link.coc_name}** (\`${link.coc_tag}\`) : ${err.message}`, true).catch(() => {})
      }
      await sleep(500)
    }
    await interaction.editReply(`✅ ${updated} mis à jour, ${errors} erreur(s).`)
  } catch (e) { console.error('[adminRefreshLeague]', e); await interaction.editReply('❌ Erreur lors du refresh.') }
}

async function handleAdminCreateEvent(interaction) {
  if (!(await isAdmin(interaction.member))) return interaction.reply({ content: '❌ Accès réservé aux administrateurs.', ephemeral: true })

  const modal = new ModalBuilder()
    .setCustomId('modal_createevent')
    .setTitle('Créer un événement Discord')

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_title')
        .setLabel('Titre')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_description')
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_start')
        .setLabel('Date début (JJ/MM/YYYY HH:MM)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('01/07/2026 18:00')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_end')
        .setLabel('Date fin (JJ/MM/YYYY HH:MM)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('01/07/2026 20:00')
    ),
  )

  await interaction.showModal(modal)
}

async function handleAdminRefreshStatus(interaction) {
  if (!(await isAdmin(interaction.member))) return interaction.reply({ content: '❌ Accès réservé aux administrateurs.', ephemeral: true })
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  try {
    await forceRefresh(interaction.client)
    await interaction.editReply('✅ Statut mis à jour.')
  } catch (e) { console.error('[adminRefreshStatus]', e); await interaction.editReply('❌ Erreur lors du refresh.') }
}

async function handleAdminRefreshRappel(interaction) {
  if (!(await isAdmin(interaction.member))) return interaction.reply({ content: '❌ Accès réservé aux administrateurs.', ephemeral: true })
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  try {
    await updateRappelEmbeds(interaction.client)
    await interaction.editReply('✅ Rappels actualisés.')
  } catch (e) { console.error('[adminRefreshRappel]', e); await interaction.editReply('❌ Erreur lors du refresh.') }
}

module.exports = {
  buildMembresPayload,
  buildHomePayload,
  invalidateMembresCache,
  buildAdminsPayload,
  getDynamicAdmins,
  saveDynamicAdmins,
  refreshPanelMessage,
  // Handlers boutons
  handlePanelHome,
  handlePanelMembres,
  handlePanelMembresNav,
  handlePanelCsv,
  handlePanelMessages,
  handlePanelConfig,
  handlePanelAdmins,
  handlePanelToggleScheduler,
  handlePanelToggleRappels,
  handlePanelModalReglement,
  handlePanelModalAdminAdd,
  handlePanelMsgVerification,
  handlePanelMsgReglement,
  handlePanelMsgReglementPublic,
  handlePanelMsgMonCompte,
  handlePanelMsgTickets,
  handlePanelMsgGdcDimanche,
  handlePanelMsgGdcMardi,
  handlePanelMsgArrivee,
  handlePanelMsgDepart,
  handlePanelAdminRemove,
  handlePanelLierMembre,
  handlePanelMembresDR1,
  handlePanelMembresDR2,
  handlePanelMembresDRNav,
  handlePanelDelierMembre,
  handlePanelDelierSelect,
  // Handlers modals
  handleModalPanelReglement,
  handleModalPanelAdminAdd,
  handleModalPanelLier,
  handleModalPanelMsg,
  handleModalPanelMsgGdc,
  handleModalPanelMsgArrivee,
  handleModalPanelMsgDepart,
  // Admin actions
  handleAdminCreateEvent,
  // Admin refresh
  handleAdminRefreshWar,
  handleAdminRefreshRaid,
  handleAdminRefreshJdc,
  handleAdminRefreshLeague,
  handleAdminRefreshStatus,
  handleAdminRefreshRappel,
}
