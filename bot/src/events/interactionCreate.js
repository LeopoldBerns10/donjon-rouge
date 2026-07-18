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
  ComponentType,
} = require('discord.js')
const {
  createWarriorSpace,
  buildAccountsEmbed,
  buildAccountsComponents,
  applyPrincipalChange,
  touchWarriorSpace,
} = require('../lib/warriorSpace.js')
const supabase = require('../supabase.js')
const { getClanMembers, getClanMembersDR2, getPlayer } = require('../cocApi.js')
const {
  handleMesPerformances,
  buildPlayerEmbed,
  buildHeroesEmbed,
  buildSpellsEmbed,
  buildTroopesEmbed,
  buildNavComponents,
  resetNavTimer,
  translate,
  SIEGE_MACHINES,
} = require('../utils/performances.js')
const { ROLES, CHANNELS } = require('../config/onboarding.js')
const { TICKET_CHANNEL_ID, ROLES: TICKET_ROLES, VERIFIE } = require('../config/tickets.js')
const { ACCOUNT_CHANNEL_ID } = require('../config/reminders.js')
const { sendWelcomeMessage } = require('../welcome.js')
const {
  handlePanelHome,
  handlePanelMembres, handlePanelMembresNav, handlePanelCsv,
  handlePanelMessages, handlePanelConfig, handlePanelAdmins,
  handlePanelToggleScheduler, handlePanelToggleRappels,
  handlePanelModalReglement, handlePanelModalAdminAdd, handlePanelAdminRemove,
  handlePanelLierMembre,
  handlePanelMembresDR1, handlePanelMembresDR2, handlePanelMembresDRNav,
  handlePanelDelierMembre, handlePanelDelierSelect,
  handlePanelMsgVerification, handlePanelMsgReglement, handlePanelMsgReglementPublic,
  handlePanelMsgMonCompte, handlePanelMsgTickets,
  handlePanelMsgGdcDimanche, handlePanelMsgGdcMardi,
  handlePanelMsgArrivee, handlePanelMsgDepart,
  handleModalPanelReglement, handleModalPanelAdminAdd, handleModalPanelLier, handleModalPanelMsg,
  handleModalPanelMsgGdc,
  handleModalPanelMsgArrivee, handleModalPanelMsgDepart,
  handleAdminRefreshWar, handleAdminRefreshRaid, handleAdminRefreshJdc,
  handleAdminRefreshLeague, handleAdminRefreshStatus, handleAdminRefreshRappel,
  handleAdminCreateEvent,
} = require('../lib/panelHandlers.js')
const { handleJdcRefresh, handleJdcReminderRefresh } = require('../lib/jdcTracker.js')
const { buildReglementEmbed, REGLEMENT_TEXT } = require('../setup/sendReglement.js')
const { PUBLIC_CHANNEL_ID } = require('../setup/sendReglementPublic.js')
const { forceRefresh } = require('../scheduler.js')
const { buildWarEmbed, buildRaidsEmbed, buildJdcEmbed, makeRefreshRow, isChefOrAdjoint } = require('../lib/warEmbeds.js')
const { buildRappelWarEmbed, buildRappelRaidsEmbed, buildRappelJdcEmbed } = require('../lib/rappelEmbeds.js')
const { buildResultatsGdc, buildResultatsLdc, buildResultatsRaids, buildResultatsJdc, postResultats } = require('../lib/resultatsEmbeds.js')
const { replaceEmbed } = require('../lib/eventChannels.js')
const { apiGet, normalizeWar } = require('../cocApi.js')
const { isJdcActive } = require('../lib/jdcTracker.js')
const {
  handleBirthdayRegister, handleBirthdayUnregister, handleBirthdayList,
  handleModalBirthdayRegister,
} = require('../lib/birthdayManager.js')
const {
  handlePollCreate, handlePollEnd, handlePollEndSelect, handlePollVote,
  handleModalPollCreate,
} = require('../lib/pollManager.js')
const { updateEventsMessage } = require('../setup/sendEventsPanel.js')
const { buildVoiceManageEmbed, buildVoiceManageComponents, isVoicePrivate, LIE_ROLE_ID } = require('../lib/voiceManage.js')
const {
  handleMsgRappelGuerre, handleMsgRappelGuerreConfirm,
  handleMsgRappelRaid,   handleMsgRappelRaidConfirm,
  handleMsgRappelCancel,
  handleMsgJdcReminder,  handleMsgJdcReminderConfirm,
  handleMsgCustom, handleModalMsgCustom,
  handleMsgCustomConfirm, handleMsgCustomCancel,
  handleMsgGlobal, handleModalMsgGlobal,
  handleMsgGlobalConfirm, handleMsgGlobalCancel,
  handleDmAck, handleDmReply, handleModalDmReply,
} = require('../lib/messagingHandlers.js')
const {
  handleRouteSetGift, handleRouteView, handleRouteReset,
  handleModalRouteSetGift,
} = require('../lib/routeInfinie.js')
const { handleModalCreateEvent } = require('../lib/discordEvents.js')
const { log } = require('../lib/botLogger.js')
const {
  handleYoutubeAddFollow,
  handleYoutubeRemoveFollow,
  handleYoutubeRemoveSelect,
  handleModalYoutubeAddFollow,
} = require('../lib/youtubePanelHandlers.js')

const CHEF_ROLE_ID = '611123759864348672'

// ─── Bouton refresh_status ────────────────────────────────────────────────────

async function handleRefreshStatus(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await forceRefresh(interaction.client)
  await interaction.editReply('✅ Statut actualisé.')
}

// ─── Bouton refresh_events ────────────────────────────────────────────────────

async function handleRefreshEvents(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await updateEventsMessage(interaction.client)
  await interaction.editReply('✅ Événements actualisés.')
}

// ─── Handlers boutons infos en cours (PARTIE 1) ──────────────────────────────

const DR1_WAR_CH   = '1511988469918994545'
const DR2_WAR_CH   = '1511988535094153286'
const RAIDS_JDC_CH = '1511988581135159376'
const RAPPEL_CH    = '1510972919407317142'

function checkWarRole(interaction) {
  if (!isChefOrAdjoint(interaction.member)) {
    interaction.reply({ content: '❌ Réservé aux Chefs et Chefs Adjoints.', ephemeral: true })
    return false
  }
  return true
}

async function handleRefreshWarDr1(interaction) {
  if (!checkWarRole(interaction)) return
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await replaceEmbed(interaction.client, DR1_WAR_CH, 'war_dr1_msg_id', await buildWarEmbed('dr1'), makeRefreshRow('refresh_war_dr1'))
  await interaction.editReply('✅ Guerre DR1 actualisé.')
}

async function handleRefreshWarDr2(interaction) {
  if (!checkWarRole(interaction)) return
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await replaceEmbed(interaction.client, DR2_WAR_CH, 'war_dr2_msg_id', await buildWarEmbed('dr2'), makeRefreshRow('refresh_war_dr2'))
  await interaction.editReply('✅ Guerre DR2 actualisé.')
}

async function handleRefreshRaids(interaction) {
  if (!checkWarRole(interaction)) return
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await replaceEmbed(interaction.client, RAIDS_JDC_CH, 'war_raids_msg_id', await buildRaidsEmbed(), makeRefreshRow('refresh_raids'))
  await interaction.editReply('✅ Raids actualisé.')
}

async function handleRefreshJdc(interaction) {
  if (!checkWarRole(interaction)) return
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await replaceEmbed(interaction.client, RAIDS_JDC_CH, 'war_jdc_msg_id', await buildJdcEmbed(), makeRefreshRow('refresh_jdc'))
  await interaction.editReply('✅ JDC actualisé.')
}

// ─── Handlers boutons rappels (PARTIE 2) ─────────────────────────────────────

async function makeRappelHandler(buildFn, key, btnId) {
  return async function(interaction) {
    if (!checkWarRole(interaction)) return
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
    const embed = await buildFn()
    const row   = [new (require('discord.js').ActionRowBuilder)().addComponents(
      new (require('discord.js').ButtonBuilder)().setCustomId(btnId).setLabel('🔄 Actualiser').setStyle(require('discord.js').ButtonStyle.Secondary)
    )]
    await replaceEmbed(interaction.client, RAPPEL_CH, key, embed, row)
    await interaction.editReply('✅ Rappel actualisé.')
  }
}

let _rappelHandlers = null
function getRappelHandlers() {
  if (_rappelHandlers) return _rappelHandlers
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
  const mkBtn = (id) => [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(id).setLabel('🔄 Actualiser').setStyle(ButtonStyle.Secondary))]
  _rappelHandlers = {
    rappel_refresh_dr1:   async (i) => { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); await replaceEmbed(i.client, RAPPEL_CH, 'rappel_dr1_id', await buildRappelWarEmbed('dr1'), mkBtn('rappel_refresh_dr1')); await i.editReply('✅') },
    rappel_refresh_dr2:   async (i) => { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); await replaceEmbed(i.client, RAPPEL_CH, 'rappel_dr2_id', await buildRappelWarEmbed('dr2'), mkBtn('rappel_refresh_dr2')); await i.editReply('✅') },
    rappel_refresh_raids: async (i) => { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); await replaceEmbed(i.client, RAPPEL_CH, 'rappel_raids_id', await buildRappelRaidsEmbed(), mkBtn('rappel_refresh_raids')); await i.editReply('✅') },
    rappel_refresh_jdc:   async (i) => { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); await replaceEmbed(i.client, RAPPEL_CH, 'rappel_jdc_id', await buildRappelJdcEmbed(), mkBtn('rappel_refresh_jdc')); await i.editReply('✅') },
  }
  return _rappelHandlers
}

// ─── Handlers boutons Sauron (PARTIE 4) ──────────────────────────────────────

async function handleSauronRefreshWarDr1(interaction) { if (!checkWarRole(interaction)) return; await interaction.deferReply({ ephemeral: true }); await replaceEmbed(interaction.client, DR1_WAR_CH, 'war_dr1_msg_id', await buildWarEmbed('dr1'), makeRefreshRow('refresh_war_dr1')); await interaction.editReply('✅ Guerre DR1 actualisé.') }
async function handleSauronRefreshWarDr2(interaction) { if (!checkWarRole(interaction)) return; await interaction.deferReply({ ephemeral: true }); await replaceEmbed(interaction.client, DR2_WAR_CH, 'war_dr2_msg_id', await buildWarEmbed('dr2'), makeRefreshRow('refresh_war_dr2')); await interaction.editReply('✅ Guerre DR2 actualisé.') }
async function handleSauronRefreshRaids(interaction)  { if (!checkWarRole(interaction)) return; await interaction.deferReply({ ephemeral: true }); await replaceEmbed(interaction.client, RAIDS_JDC_CH, 'war_raids_msg_id', await buildRaidsEmbed(), makeRefreshRow('refresh_raids')); await interaction.editReply('✅ Raids actualisé.') }
async function handleSauronRefreshJdc(interaction)    { if (!checkWarRole(interaction)) return; await interaction.deferReply({ ephemeral: true }); await replaceEmbed(interaction.client, RAIDS_JDC_CH, 'war_jdc_msg_id', await buildJdcEmbed(), makeRefreshRow('refresh_jdc')); await interaction.editReply('✅ JDC actualisé.') }

async function handleSauronRappelWarDr1(i) { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); const { ActionRowBuilder: A, ButtonBuilder: B, ButtonStyle: S } = require('discord.js'); const mkBtn = (id) => [new A().addComponents(new B().setCustomId(id).setLabel('🔄 Actualiser').setStyle(S.Secondary))]; await replaceEmbed(i.client, RAPPEL_CH, 'rappel_dr1_id', await buildRappelWarEmbed('dr1'), mkBtn('rappel_refresh_dr1')); await i.editReply('✅ Rappel Guerre DR1 actualisé.') }
async function handleSauronRappelWarDr2(i) { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); const { ActionRowBuilder: A, ButtonBuilder: B, ButtonStyle: S } = require('discord.js'); const mkBtn = (id) => [new A().addComponents(new B().setCustomId(id).setLabel('🔄 Actualiser').setStyle(S.Secondary))]; await replaceEmbed(i.client, RAPPEL_CH, 'rappel_dr2_id', await buildRappelWarEmbed('dr2'), mkBtn('rappel_refresh_dr2')); await i.editReply('✅ Rappel Guerre DR2 actualisé.') }
async function handleSauronRappelRaids(i)  { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); const { ActionRowBuilder: A, ButtonBuilder: B, ButtonStyle: S } = require('discord.js'); const mkBtn = (id) => [new A().addComponents(new B().setCustomId(id).setLabel('🔄 Actualiser').setStyle(S.Secondary))]; await replaceEmbed(i.client, RAPPEL_CH, 'rappel_raids_id', await buildRappelRaidsEmbed(), mkBtn('rappel_refresh_raids')); await i.editReply('✅ Rappel Raids actualisé.') }
async function handleSauronRappelJdc(i)    { if (!checkWarRole(i)) return; await i.deferReply({ ephemeral: true }); const { ActionRowBuilder: A, ButtonBuilder: B, ButtonStyle: S } = require('discord.js'); const mkBtn = (id) => [new A().addComponents(new B().setCustomId(id).setLabel('🔄 Actualiser').setStyle(S.Secondary))]; await replaceEmbed(i.client, RAPPEL_CH, 'rappel_jdc_id', await buildRappelJdcEmbed(), mkBtn('rappel_refresh_jdc')); await i.editReply('✅ Rappel JDC actualisé.') }

async function handleSauronResultats(interaction, type) {
  if (!checkWarRole(interaction)) return
  await interaction.deferReply({ ephemeral: true })
  try {
    let embed
    const DR1_TAG = '#29292QPRC'
    const DR2_TAG = '#2RCGG9YR9'

    if (type === 'gdc_dr1' || type === 'gdc_dr2') {
      const key = type === 'gdc_dr1' ? 'dr1' : 'dr2'
      const war = await apiGet(`/clan/${key}/war`)
      embed = await buildResultatsGdc(war, key === 'dr1' ? 'DR1' : 'DR2')
    } else if (type === 'ldc_dr1' || type === 'ldc_dr2') {
      const key    = type === 'ldc_dr1' ? 'dr1' : 'dr2'
      const ourTag = type === 'ldc_dr1' ? DR1_TAG : DR2_TAG
      const ldc    = await apiGet(type === 'ldc_dr1' ? '/ldc/current' : '/ldc/dr2/current')
      const last   = ldc?.rounds?.slice().reverse().find(r => r.war?.state === 'warEnded')
      if (!last) { await interaction.editReply('❌ Aucun round terminé.'); return }
      embed = await buildResultatsLdc(normalizeWar(last.war, ourTag), key === 'dr1' ? 'DR1' : 'DR2')
    } else if (type === 'raids') {
      const data  = await apiGet('/clan/raids')
      const raid  = data?.items?.[0]
      if (!raid) { await interaction.editReply('❌ Aucun raid.'); return }
      const [r1, r2] = await Promise.all([apiGet('/clan/dr1/members').catch(() => null), apiGet('/clan/dr2/members').catch(() => null)])
      embed = await buildResultatsRaids(raid, [...(r1?.items || []), ...(r2?.items || [])])
    } else if (type === 'jdc') {
      const active = await isJdcActive()
      if (!active) { await interaction.editReply('❌ Aucun JDC actif.'); return }
      const { fetchAllMembersWithPoints } = require('../lib/jdcTracker.js')
      const season  = new Date().toISOString().slice(0, 7)
      const members = await fetchAllMembersWithPoints(season)
      embed = await buildResultatsJdc({ members, totalPoints: members.reduce((a, m) => a + (m.points ?? 0), 0), target: 50000 })
    }

    await postResultats(interaction.client, embed, null)
    await interaction.editReply('✅ Résultats postés.')
  } catch (e) {
    console.error('[sauronResultats]', e)
    await interaction.editReply('❌ Erreur.')
  }
}

// ─── Bouton open_warrior_space ────────────────────────────────────────────────

async function handleOpenWarriorSpace(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const { data: links } = await supabase
    .from('discord_links')
    .select('coc_tag')
    .eq('discord_id', interaction.user.id)

  if (!links || links.length === 0) {
    return interaction.editReply('❌ Aucun compte lié. Utilise `/lier` pour associer ton compte CoC.')
  }

  const channel = await createWarriorSpace(interaction.member, interaction.client)
  await interaction.editReply(`⚔️ Ton espace guerrier : ${channel}`)
}

// ─── Bouton warrior_change_principal ─────────────────────────────────────────

async function handleWarriorChangePrincipal(interaction, discordId) {
  if (interaction.user.id !== discordId) {
    return interaction.reply({ content: '❌ Ce n\'est pas ton espace guerrier.', ephemeral: true })
  }

  const { data: links } = await supabase
    .from('discord_links')
    .select('coc_tag, coc_name, is_primary')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: true })

  if (!links || links.length <= 1) {
    return interaction.reply({
      content: links?.length === 1 ? 'Tu n\'as qu\'un seul compte lié, il est déjà principal.' : 'Aucun compte lié.',
      ephemeral: true,
    })
  }

  const originalMsg = interaction.message

  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const menu = new StringSelectMenuBuilder()
    .setCustomId('warrior_principal_select')
    .setPlaceholder('Choisis ton compte principal')
    .addOptions(links.map(l =>
      new StringSelectMenuOptionBuilder()
        .setLabel(l.is_primary ? `⭐ ${l.coc_name}` : l.coc_name)
        .setValue(l.coc_tag)
        .setDescription(l.coc_tag)
    ))

  const response = await interaction.editReply({
    content: 'Quel compte veux-tu définir comme principal ?',
    components: [new ActionRowBuilder().addComponents(menu)],
  })

  let collected
  try {
    collected = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === discordId,
      time: 30_000,
    })
  } catch {
    return interaction.editReply({ content: 'Temps écoulé.', components: [] })
  }

  await collected.deferUpdate()

  const selectedTag = collected.values[0]
  const updatedLinks = await applyPrincipalChange(discordId, selectedTag, interaction.member)

  await originalMsg.edit({
    embeds: [buildAccountsEmbed(updatedLinks)],
    components: buildAccountsComponents(discordId),
  }).catch(() => {})

  const selected = links.find(l => l.coc_tag === selectedTag)
  await interaction.editReply({
    content: `✅ Compte principal : **${selected?.coc_name}** (\`${selectedTag}\`)`,
    components: [],
  })
}

// ─── Bouton open_ticket ───────────────────────────────────────────────────────

async function handleOpenTicket(interaction) {
  const member = interaction.member

  const DONJON_ROUGE = '611125112519000064'
  const VISITEUR     = '1072532916955009095'

  // Vérifications synchrones avant le defer
  if (!member.roles.cache.has(DONJON_ROUGE) && !member.roles.cache.has(VISITEUR)) {
    return interaction.reply({ content: '❌ Tu dois avoir validé le règlement pour ouvrir un ticket.', ephemeral: true })
  }
  const existing = interaction.guild.channels.cache.find(
    c => c.name === `ticket-${member.user.username.toLowerCase().replace(/\s+/g, '-')}`
  )
  if (existing) {
    return interaction.reply({ content: `❌ Tu as déjà un ticket ouvert : ${existing}`, ephemeral: true })
  }

  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const ticketChannel = await interaction.client.channels.fetch(TICKET_CHANNEL_ID)
  const category = ticketChannel.parentId
  const ticketName = `ticket-${member.user.username.toLowerCase().replace(/\s+/g, '-')}`

  const salon = await interaction.guild.channels.create({
    name: ticketName,
    parent: category,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
      { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      { id: TICKET_ROLES.CHEF,         allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      { id: TICKET_ROLES.CHEF_ADJOINT, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      { id: TICKET_ROLES.ADJOINT,      allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
      { id: interaction.client.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels'] },
    ],
  })

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle(`🎫 Ticket de ${member.user.username}`)
    .setDescription(`Bonjour ${member} ! Explique-nous ton problème et le staff te répondra rapidement.`)

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`close_ticket:${salon.id}`)
      .setLabel('🔒 Clôturer le ticket')
      .setStyle(ButtonStyle.Danger)
  )

  await salon.send({
    content: `<@&${TICKET_ROLES.CHEF}> <@&${TICKET_ROLES.CHEF_ADJOINT}> <@&${TICKET_ROLES.ADJOINT}>`,
    embeds: [embed],
    components: [row],
  })

  await interaction.editReply({ content: `✅ Ton ticket a été créé : ${salon}` })
}

// ─── Bouton close_ticket ──────────────────────────────────────────────────────

async function handleCloseTicket(interaction, channelId) {
  const member = interaction.member

  // Vérifications synchrones avant le defer
  const isStaff = [TICKET_ROLES.CHEF, TICKET_ROLES.CHEF_ADJOINT, TICKET_ROLES.ADJOINT]
    .some(roleId => member.roles.cache.has(roleId))
  const isCreator = interaction.channel?.name === `ticket-${member.user.username.toLowerCase().replace(/\s+/g, '-')}`

  if (!isStaff && !isCreator) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission de clôturer ce ticket.', ephemeral: true })
  }

  if (!interaction.deferred && !interaction.replied) await interaction.deferReply()

  const ticketChannel = await interaction.client.channels.fetch(channelId).catch(() => null)
  if (!ticketChannel) {
    return interaction.editReply({ content: '❌ Salon introuvable.' })
  }

  await interaction.editReply({ content: `🔒 Ticket clôturé par ${member.user.username}` })
  setTimeout(() => ticketChannel.delete().catch(() => {}), 5000)
}

// translate et SIEGE_MACHINES sont importés depuis performances.js

// ─── Bouton lier_compte ───────────────────────────────────────────────────────

async function handleLierCompte(interaction) {
  await interaction.reply({
    content: 'Utilise la commande `/lier tag:#TONTAG` pour lier ton compte !',
    ephemeral: true,
  })
}

// ─── Bouton stats_clan ────────────────────────────────────────────────────────

function buildMembersRow(members, customId, placeholder) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(members.slice(0, 25).map(m =>
        new StringSelectMenuOptionBuilder()
          .setLabel(m.name)
          .setValue(`${m.tag}:${customId}`)
          .setDescription(m.tag)
      ))
  )
}

async function handleStatsClan(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })

  const [resDR1, resDR2] = await Promise.allSettled([getClanMembers(), getClanMembersDR2()])

  const membersDR1 = resDR1.status === 'fulfilled' ? (resDR1.value?.items ?? resDR1.value ?? []) : []
  const membersDR2 = resDR2.status === 'fulfilled' ? (resDR2.value?.items ?? resDR2.value ?? []) : []

  if (!membersDR1.length && !membersDR2.length) {
    return interaction.editReply({ content: '❌ Impossible de récupérer les membres des clans.' })
  }

  const rows = []
  if (membersDR1.length) rows.push(buildMembersRow(membersDR1, 'dr1', '🏰 DR1 — Donjon Rouge'))
  if (membersDR2.length) rows.push(buildMembersRow(membersDR2, 'dr2', '🏰 DR2 — Donjon Rouge II'))

  const response = await interaction.editReply({ content: 'Sélectionne un guerrier :', components: rows })

  let collected
  try {
    collected = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id,
      time: 30_000,
    })
  } catch {
    return interaction.editReply({ content: 'Temps écoulé.', components: [] })
  }

  await collected.deferUpdate()

  const [tag] = collected.values[0].split(':')

  let player
  try {
    player = await getPlayer(tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.', components: [] })
  }

  const { data: link } = await supabase
    .from('discord_links').select('discord_id').eq('coc_tag', tag).maybeSingle()

  const msg = await interaction.editReply({
    content: '',
    embeds: [buildPlayerEmbed(player, link?.discord_id ?? null)],
    components: buildNavComponents(tag, 'profil'),
  })
  resetNavTimer(msg)
}

// ─── Navigation héros / sorts / troupes / profil ──────────────────────────────

async function handleStatsProfil(interaction, tag) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()

  let player
  try {
    player = await getPlayer(tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.', embeds: [], components: [] })
  }

  const { data: link } = await supabase
    .from('discord_links').select('discord_id').eq('coc_tag', tag).maybeSingle()

  await interaction.editReply({
    content: '',
    embeds: [buildPlayerEmbed(player, link?.discord_id ?? null)],
    components: buildNavComponents(tag, 'profil'),
  })
  resetNavTimer(interaction.message)
}

async function handleStatsHeros(interaction, tag) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()

  let player
  try {
    player = await getPlayer(tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.', embeds: [], components: [] })
  }

  const embed = buildHeroesEmbed(player)
  if (!embed) {
    return interaction.editReply({ content: '😴 Aucun héros débloqué.', embeds: [], components: buildNavComponents(tag, 'heros') })
  }

  await interaction.editReply({ content: '', embeds: [embed], components: buildNavComponents(tag, 'heros') })
  resetNavTimer(interaction.message)
}

async function handleStatsSorts(interaction, tag) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()

  let player
  try {
    player = await getPlayer(tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.', embeds: [], components: [] })
  }

  const embed = buildSpellsEmbed(player)
  if (!embed) {
    return interaction.editReply({ content: '😴 Aucun sort débloqué.', embeds: [], components: buildNavComponents(tag, 'sorts') })
  }

  await interaction.editReply({ content: '', embeds: [embed], components: buildNavComponents(tag, 'sorts') })
  resetNavTimer(interaction.message)
}

async function handleStatsTroupes(interaction, tag) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()

  let player
  try {
    player = await getPlayer(tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.', embeds: [], components: [] })
  }

  const embed = buildTroopesEmbed(player)
  if (!embed) {
    return interaction.editReply({ content: '😴 Aucune troupe trouvée.', embeds: [], components: buildNavComponents(tag, 'troupes') })
  }

  await interaction.editReply({ content: '', embeds: [embed], components: buildNavComponents(tag, 'troupes') })
  resetNavTimer(interaction.message)
}

// ─── Routing ──────────────────────────────────────────────────────────────────

async function handleEditReglement(interaction) {
  if (!interaction.member.roles.cache.has(CHEF_ROLE_ID)) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }

  const currentText = interaction.message.embeds[0]?.description ?? REGLEMENT_TEXT

  const modal = new ModalBuilder()
    .setCustomId(`modal_reglement:${interaction.channelId}:${interaction.message.id}`)
    .setTitle('Modifier le règlement')

  const input = new TextInputBuilder()
    .setCustomId('reglement_content')
    .setLabel('Texte du règlement')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(currentText)
    .setMaxLength(4000)
    .setRequired(true)

  modal.addComponents(new ActionRowBuilder().addComponents(input))
  await interaction.showModal(modal)
}

async function handleRoleDonjonRouge(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  const member = interaction.member
  await member.roles.remove(ROLES.VERIFIE).catch(() => {})
  await member.roles.add(ROLES.DONJON_ROUGE)
  await interaction.editReply({ content: '🏆 Bienvenue guerrier ! Tu as accès au serveur Donjon Rouge.' })
  sendWelcomeMessage(member).catch(err => console.error('[welcome] donjon_rouge:', err))
}

async function handleRoleVisiteur(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  const member = interaction.member
  await member.roles.remove(ROLES.VERIFIE).catch(() => {})
  await member.roles.add(ROLES.VISITEUR)
  await interaction.editReply({ content: '👋 Bienvenue visiteur !' })
  sendWelcomeMessage(member).catch(err => console.error('[welcome] visiteur:', err))
}

async function handleRoleRien(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await interaction.member.roles.remove(ROLES.VERIFIE).catch(() => {})
  await interaction.editReply({ content: 'Ok, tu peux fermer Discord.' })
}

async function handleKaptchaVerify(interaction) {
  const member = interaction.member
  if (!member.roles.cache.has(ROLES.NON_VERIFIE)) {
    return interaction.reply({ content: 'Tu es déjà vérifié.', ephemeral: true })
  }
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await member.roles.remove(ROLES.NON_VERIFIE)
  await member.roles.add(ROLES.VERIFIE)
  await interaction.editReply({ content: '✅ Vérifié ! Rends-toi dans #lit-le-règlement pour continuer.' })
}

// ─── Gestion vocale ───────────────────────────────────────────────────────────

async function getVoiceData(channelId) {
  const { data } = await supabase
    .from('voice_channels')
    .select('channel_id, owner_id')
    .eq('text_channel_id', channelId)
    .maybeSingle()
  return data
}

async function handleVoiceTogglePrivate(interaction) {
  await interaction.deferUpdate()
  const data = await getVoiceData(interaction.channelId)
  if (!data || data.owner_id !== interaction.user.id) {
    return interaction.followUp({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  const voiceChannel = await interaction.guild.channels.fetch(data.channel_id).catch(() => null)
  if (!voiceChannel) return interaction.followUp({ content: '❌ Salon vocal introuvable.', ephemeral: true })

  const currentlyPrivate = isVoicePrivate(voiceChannel)
  if (currentlyPrivate) {
    await voiceChannel.permissionOverwrites.edit(LIE_ROLE_ID, { ViewChannel: true, Connect: true, Speak: true })
  } else {
    await voiceChannel.permissionOverwrites.edit(LIE_ROLE_ID, { ViewChannel: false, Connect: false, Speak: false })
  }
  const newPrivate = !currentlyPrivate
  const embed = buildVoiceManageEmbed(voiceChannel.name, interaction.member.displayName, newPrivate, voiceChannel.userLimit)
  await interaction.editReply({ embeds: [embed], components: buildVoiceManageComponents(newPrivate) })
}

async function handleVoiceSetLimit(interaction) {
  const data = await getVoiceData(interaction.channelId)
  if (!data || data.owner_id !== interaction.user.id) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  const modal = new ModalBuilder()
    .setCustomId('modal_voice_limit')
    .setTitle('Limite de places')
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('voice_limit_value')
        .setLabel('Nombre de places (0 = illimité, max 10)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2)
        .setPlaceholder('0')
    )
  )
  await interaction.showModal(modal)
}

async function handleVoiceKickMember(interaction) {
  const data = await getVoiceData(interaction.channelId)
  if (!data || data.owner_id !== interaction.user.id) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  const voiceChannel = await interaction.guild.channels.fetch(data.channel_id).catch(() => null)
  if (!voiceChannel) return interaction.reply({ content: '❌ Salon vocal introuvable.', ephemeral: true })

  const members = [...voiceChannel.members.values()].filter(m => m.id !== interaction.user.id)
  if (!members.length) return interaction.reply({ content: '❌ Aucun autre membre dans le salon.', ephemeral: true })

  const select = new StringSelectMenuBuilder()
    .setCustomId('voice_kick_select')
    .setPlaceholder('Sélectionne un membre à expulser')
    .addOptions(members.map(m => new StringSelectMenuOptionBuilder().setLabel(m.displayName).setValue(m.id)))

  await interaction.reply({
    content: 'Sélectionne le membre à expulser :',
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  })
}

async function handleVoiceMuteMember(interaction) {
  const data = await getVoiceData(interaction.channelId)
  if (!data || data.owner_id !== interaction.user.id) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  const voiceChannel = await interaction.guild.channels.fetch(data.channel_id).catch(() => null)
  if (!voiceChannel) return interaction.reply({ content: '❌ Salon vocal introuvable.', ephemeral: true })

  const members = [...voiceChannel.members.values()].filter(m => m.id !== interaction.user.id)
  if (!members.length) return interaction.reply({ content: '❌ Aucun autre membre dans le salon.', ephemeral: true })

  const select = new StringSelectMenuBuilder()
    .setCustomId('voice_mute_select')
    .setPlaceholder('Sélectionne un membre à muter/démuter')
    .addOptions(members.map(m => new StringSelectMenuOptionBuilder()
      .setLabel(m.displayName)
      .setDescription(m.voice.serverMute ? 'Actuellement muté' : 'Non muté')
      .setValue(m.id)
    ))

  await interaction.reply({
    content: 'Sélectionne le membre à muter/démuter :',
    components: [new ActionRowBuilder().addComponents(select)],
    ephemeral: true,
  })
}

async function handleVoiceKickSelect(interaction) {
  await interaction.deferUpdate()
  const target = interaction.guild.members.cache.get(interaction.values[0])
  if (!target?.voice.channel) {
    return interaction.editReply({ content: '❌ Ce membre n\'est plus dans le salon.', components: [] })
  }
  await target.voice.disconnect().catch(() => {})
  await interaction.editReply({ content: `✅ **${target.displayName}** a été expulsé.`, components: [] })
}

async function handleVoiceMuteSelect(interaction) {
  await interaction.deferUpdate()
  const target = interaction.guild.members.cache.get(interaction.values[0])
  if (!target?.voice.channel) {
    return interaction.editReply({ content: '❌ Ce membre n\'est plus dans le salon.', components: [] })
  }
  const isMuted = target.voice.serverMute
  await target.voice.setMute(!isMuted).catch(() => {})
  const msg = isMuted ? `🔊 **${target.displayName}** a été démuté.` : `🔇 **${target.displayName}** a été muté.`
  await interaction.editReply({ content: msg, components: [] })
}

async function handleModalVoiceLimit(interaction) {
  const raw = interaction.fields.getTextInputValue('voice_limit_value')
  const limit = parseInt(raw, 10)
  if (isNaN(limit) || limit < 0 || limit > 10) {
    return interaction.reply({ content: '❌ Valeur invalide. Saisis un nombre entre 0 et 10.', ephemeral: true })
  }
  const data = await getVoiceData(interaction.channelId)
  if (!data || data.owner_id !== interaction.user.id) {
    return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true })
  }
  const voiceChannel = await interaction.guild.channels.fetch(data.channel_id).catch(() => null)
  if (!voiceChannel) return interaction.reply({ content: '❌ Salon vocal introuvable.', ephemeral: true })

  await voiceChannel.setUserLimit(limit)

  const currentlyPrivate = isVoicePrivate(voiceChannel)
  const embed = buildVoiceManageEmbed(voiceChannel.name, interaction.member.displayName, currentlyPrivate, limit)
  const messages = await interaction.channel.messages.fetch({ limit: 10 })
  const mgmtMsg = messages.find(m => m.author.id === interaction.client.user.id && m.embeds.length > 0)
  if (mgmtMsg) await mgmtMsg.edit({ embeds: [embed], components: buildVoiceManageComponents(currentlyPrivate) })

  const txt = limit === 0 ? 'illimitée' : `**${limit}** personne(s)`
  await interaction.reply({ content: `✅ Limite fixée à ${txt}.`, ephemeral: true })
}

const BUTTON_HANDLERS = {
  refresh_status:       handleRefreshStatus,
  refresh_events:       handleRefreshEvents,
  open_warrior_space:   handleOpenWarriorSpace,
  mes_performances:     handleMesPerformances,
  lier_compte:       handleLierCompte,
  stats_clan:        handleStatsClan,
  kaptcha_verify:    handleKaptchaVerify,
  role_donjon_rouge: handleRoleDonjonRouge,
  role_visiteur:     handleRoleVisiteur,
  role_rien:         handleRoleRien,
  edit_reglement:    handleEditReglement,
  open_ticket:             handleOpenTicket,
  panel_home:              handlePanelHome,
  panel_membres:           handlePanelMembres,
  panel_csv:               handlePanelCsv,
  panel_messages:          handlePanelMessages,
  panel_config:            handlePanelConfig,
  panel_admins:            handlePanelAdmins,
  panel_toggle_scheduler:  handlePanelToggleScheduler,
  panel_toggle_rappels:    handlePanelToggleRappels,
  panel_modal_reglement:   handlePanelModalReglement,
  panel_modal_admin_add:   handlePanelModalAdminAdd,
  panel_lier_membre:          handlePanelLierMembre,
  panel_membres_dr1:          handlePanelMembresDR1,
  panel_membres_dr2:          handlePanelMembresDR2,
  panel_msg_verification:     handlePanelMsgVerification,
  panel_msg_reglement:        handlePanelMsgReglement,
  panel_msg_reglement_public: handlePanelMsgReglementPublic,
  panel_msg_moncompte:        handlePanelMsgMonCompte,
  panel_msg_tickets:          handlePanelMsgTickets,
  panel_msg_gdc_dimanche:     handlePanelMsgGdcDimanche,
  panel_msg_gdc_mardi:        handlePanelMsgGdcMardi,
  panel_msg_arrivee:          handlePanelMsgArrivee,
  panel_msg_depart:           handlePanelMsgDepart,
  panel_delier_membre:     handlePanelDelierMembre,
  voice_toggle_private: handleVoiceTogglePrivate,
  voice_set_limit:      handleVoiceSetLimit,
  voice_kick_member:    handleVoiceKickMember,
  voice_mute_member:    handleVoiceMuteMember,
  msg_rappel_guerre:         handleMsgRappelGuerre,
  msg_rappel_raid:           handleMsgRappelRaid,
  messaging_jdc_reminder:    handleMsgJdcReminder,
  msg_custom:                handleMsgCustom,
  msg_rappel_guerre_confirm: handleMsgRappelGuerreConfirm,
  msg_rappel_raid_confirm:   handleMsgRappelRaidConfirm,
  msg_rappel_cancel:         handleMsgRappelCancel,
  msg_jdc_reminder_confirm:  handleMsgJdcReminderConfirm,
  msg_custom_confirm:        handleMsgCustomConfirm,
  msg_custom_cancel:         handleMsgCustomCancel,
  msg_global:                handleMsgGlobal,
  msg_global_confirm:        handleMsgGlobalConfirm,
  msg_global_cancel:         handleMsgGlobalCancel,
  birthday_register:         handleBirthdayRegister,
  birthday_unregister:       handleBirthdayUnregister,
  birthday_list:             handleBirthdayList,
  poll_create:               handlePollCreate,
  poll_end:                  handlePollEnd,
  jdc_refresh:               handleJdcRefresh,
  jdc_reminder_refresh:      handleJdcReminderRefresh,
  admin_refresh_war:         handleAdminRefreshWar,
  admin_refresh_raid:        handleAdminRefreshRaid,
  admin_refresh_jdc:         handleAdminRefreshJdc,
  admin_refresh_league:      handleAdminRefreshLeague,
  admin_refresh_status:      handleAdminRefreshStatus,
  admin_refresh_rappel:      handleAdminRefreshRappel,
  admin_create_event:        handleAdminCreateEvent,
  route_set_gift:            handleRouteSetGift,
  route_view:                handleRouteView,
  route_reset:               handleRouteReset,
  youtube_add_follow:        handleYoutubeAddFollow,
  youtube_remove_follow:     handleYoutubeRemoveFollow,
  // ── Info embeds (boutons Actualiser sur les embeds en cours) ──
  refresh_war_dr1:           handleRefreshWarDr1,
  refresh_war_dr2:           handleRefreshWarDr2,
  refresh_raids:             handleRefreshRaids,
  refresh_jdc:               handleRefreshJdc,
  // ── Rappel embeds ────────────────────────────────────────────
  rappel_refresh_dr1:        (i) => getRappelHandlers().rappel_refresh_dr1(i),
  rappel_refresh_dr2:        (i) => getRappelHandlers().rappel_refresh_dr2(i),
  rappel_refresh_raids:      (i) => getRappelHandlers().rappel_refresh_raids(i),
  rappel_refresh_jdc:        (i) => getRappelHandlers().rappel_refresh_jdc(i),
  // ── Panel Sauron — Refresh infos ─────────────────────────────
  sauron_refresh_war_dr1:    handleSauronRefreshWarDr1,
  sauron_refresh_war_dr2:    handleSauronRefreshWarDr2,
  sauron_refresh_raids:      handleSauronRefreshRaids,
  sauron_refresh_jdc:        handleSauronRefreshJdc,
  // ── Panel Sauron — Rappels ────────────────────────────────────
  sauron_rappel_war_dr1:     handleSauronRappelWarDr1,
  sauron_rappel_war_dr2:     handleSauronRappelWarDr2,
  sauron_rappel_raids:       handleSauronRappelRaids,
  sauron_rappel_jdc:         handleSauronRappelJdc,
  // ── Panel Sauron — Résultats ──────────────────────────────────
  sauron_resultats_gdc_dr1:  (i) => handleSauronResultats(i, 'gdc_dr1'),
  sauron_resultats_gdc_dr2:  (i) => handleSauronResultats(i, 'gdc_dr2'),
  sauron_resultats_ldc_dr1:  (i) => handleSauronResultats(i, 'ldc_dr1'),
  sauron_resultats_ldc_dr2:  (i) => handleSauronResultats(i, 'ldc_dr2'),
  sauron_resultats_raids:    (i) => handleSauronResultats(i, 'raids'),
  sauron_resultats_jdc:      (i) => handleSauronResultats(i, 'jdc'),
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Réinitialise le timer du warrior space si l'interaction vient de ce salon
    if (interaction.channelId) touchWarriorSpace(interaction.channelId)

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const colonIdx = interaction.customId.indexOf(':')
      const prefix   = colonIdx >= 0 ? interaction.customId.slice(0, colonIdx) : interaction.customId
      const argTag   = colonIdx >= 0 ? interaction.customId.slice(colonIdx + 1) : null

      try {
        if (interaction.isButton() && BUTTON_HANDLERS[interaction.customId]) {
          await BUTTON_HANDLERS[interaction.customId](interaction)
          const buttonLog = {
            'msg_rappel_guerre_confirm': `Rappel guerre envoyé par ${interaction.user.username}`,
            'msg_rappel_raid_confirm':   `Rappel raid envoyé par ${interaction.user.username}`,
            'msg_jdc_reminder_confirm':  `Rappel JDC envoyé par ${interaction.user.username}`,
            'msg_custom_confirm':        `Message custom envoyé par ${interaction.user.username}`,
            'msg_global_confirm':        `Message global envoyé par ${interaction.user.username}`,
          }[interaction.customId]
          if (buttonLog) log(interaction.client, 'BOUTON', buttonLog).catch(() => {})
        } else if (prefix === 'stats_profil'  && argTag) {
          await handleStatsProfil(interaction, argTag)
        } else if (prefix === 'stats_heros'   && argTag) {
          await handleStatsHeros(interaction, argTag)
        } else if (prefix === 'stats_sorts'   && argTag) {
          await handleStatsSorts(interaction, argTag)
        } else if (prefix === 'stats_troupes' && argTag) {
          await handleStatsTroupes(interaction, argTag)
        } else if (prefix === 'close_ticket'        && argTag) {
          await handleCloseTicket(interaction, argTag)
        } else if (prefix === 'panel_membres_prev'  && argTag) {
          await handlePanelMembresNav(interaction, 'prev', parseInt(argTag))
        } else if (prefix === 'panel_membres_next'  && argTag) {
          await handlePanelMembresNav(interaction, 'next', parseInt(argTag))
        } else if (interaction.customId === 'panel_admin_remove') {
          await handlePanelAdminRemove(interaction)
        } else if (interaction.customId === 'panel_delier_select') {
          await handlePanelDelierSelect(interaction)
        } else if (interaction.customId === 'poll_end_select') {
          await handlePollEndSelect(interaction)
        } else if (interaction.customId === 'voice_kick_select') {
          await handleVoiceKickSelect(interaction)
        } else if (interaction.customId === 'voice_mute_select') {
          await handleVoiceMuteSelect(interaction)
        } else if (prefix === 'panel_membres_dr1_prev') {
          await handlePanelMembresDRNav(interaction, 'dr1', 'prev', parseInt(argTag))
        } else if (prefix === 'panel_membres_dr1_next') {
          await handlePanelMembresDRNav(interaction, 'dr1', 'next', parseInt(argTag))
        } else if (prefix === 'panel_membres_dr2_prev') {
          await handlePanelMembresDRNav(interaction, 'dr2', 'prev', parseInt(argTag))
        } else if (prefix === 'panel_membres_dr2_next') {
          await handlePanelMembresDRNav(interaction, 'dr2', 'next', parseInt(argTag))
        } else if (prefix === 'warrior_change_principal' && argTag) {
          await handleWarriorChangePrincipal(interaction, argTag)
        } else if (interaction.customId === 'youtube_remove_select') {
          await handleYoutubeRemoveSelect(interaction)
        } else if (prefix === 'dm_ack' && argTag) {
          await handleDmAck(interaction, argTag)
        } else if (prefix === 'dm_reply' && argTag) {
          await handleDmReply(interaction, argTag)
        } else if (prefix === 'poll_vote' && argTag) {
          const colonIdx2  = argTag.indexOf(':')
          const pollId     = colonIdx2 >= 0 ? argTag.slice(0, colonIdx2) : argTag
          const optionIdx  = colonIdx2 >= 0 ? argTag.slice(colonIdx2 + 1) : '0'
          await handlePollVote(interaction, pollId, optionIdx)
        }
      } catch (err) {
        console.error(`[Button] ${interaction.customId}:`, err)
        log(interaction.client, 'ERREUR', `Button ${interaction.customId}: ${err.message}`, true).catch(() => {})
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'Une erreur est survenue.' })
          } else {
            await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true })
          }
        } catch {}
      }
      return
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_reglement:')) {
      const parts     = interaction.customId.split(':')
      const channelId = parts[1]
      const messageId = parts[2]
      const newText   = interaction.fields.getTextInputValue('reglement_content')

      try {
        const channel = await interaction.client.channels.fetch(channelId)
        const message = await channel.messages.fetch(messageId)
        await message.edit({ embeds: [buildReglementEmbed(newText)] })

        const { data } = await supabase
          .from('bot_config')
          .select('value')
          .eq('key', 'reglement_public_message_id')
          .maybeSingle()

        if (data?.value) {
          try {
            const publicChannel = await interaction.client.channels.fetch(PUBLIC_CHANNEL_ID)
            const publicMessage = await publicChannel.messages.fetch(data.value)
            await publicMessage.edit({ embeds: [buildReglementEmbed(newText)] })
          } catch (syncErr) {
            console.error('[modal_reglement] Sync public échoué:', syncErr)
          }
        }

        await interaction.reply({ content: '✅ Règlement mis à jour.', ephemeral: true })
      } catch (err) {
        console.error('[modal_reglement]', err)
        await interaction.reply({ content: '❌ Impossible de mettre à jour le règlement.', ephemeral: true })
      }
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_panel_reglement') {
      await handleModalPanelReglement(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_panel_admin_add') {
      await handleModalPanelAdminAdd(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_panel_lier') {
      await handleModalPanelLier(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_voice_limit') {
      await handleModalVoiceLimit(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_msg_custom') {
      await handleModalMsgCustom(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_msg_global') {
      await handleModalMsgGlobal(interaction)
      return
    }

    if (interaction.isModalSubmit() && (
      interaction.customId === 'modal_panel_msg_gdc_dimanche' ||
      interaction.customId === 'modal_panel_msg_gdc_mardi'
    )) {
      await handleModalPanelMsgGdc(interaction)
      const gdcType = interaction.customId === 'modal_panel_msg_gdc_dimanche' ? 'dimanche' : 'mardi'
      log(interaction.client, 'GDC', `Message GDC ${gdcType} modifié par ${interaction.user.username}`).catch(() => {})
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_panel_msg_arrivee') {
      await handleModalPanelMsgArrivee(interaction)
      log(interaction.client, 'BOUTON', `Message d'arrivée modifié par ${interaction.user.username}`).catch(() => {})
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_panel_msg_depart') {
      await handleModalPanelMsgDepart(interaction)
      log(interaction.client, 'BOUTON', `Message de départ modifié par ${interaction.user.username}`).catch(() => {})
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_birthday_register') {
      await handleModalBirthdayRegister(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_poll_create') {
      await handleModalPollCreate(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_dm_reply:')) {
      const argTag = interaction.customId.slice('modal_dm_reply:'.length)
      await handleModalDmReply(interaction, argTag)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_route_set_gift') {
      await handleModalRouteSetGift(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_createevent') {
      await handleModalCreateEvent(interaction)
      return
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_youtube_add_follow') {
      await handleModalYoutubeAddFollow(interaction)
      return
    }

    const MSG_MODAL_MAP = {
      modal_panel_msg_verification:     [CHANNELS.VERIFICATION,    'kaptcha_message_id'],
      modal_panel_msg_reglement:        [CHANNELS.REGLEMENT,       'reglement_message_id'],
      modal_panel_msg_reglement_public: ['768557389154615307',     'reglement_public_message_id'],
      modal_panel_msg_moncompte:        [ACCOUNT_CHANNEL_ID,       'account_message_id'],
      modal_panel_msg_tickets:          [TICKET_CHANNEL_ID,        'ticket_message_id'],
    }
    if (interaction.isModalSubmit() && MSG_MODAL_MAP[interaction.customId]) {
      const [channelId, configKey] = MSG_MODAL_MAP[interaction.customId]
      await handleModalPanelMsg(interaction, channelId, configKey)
      return
    }

    if (!interaction.isChatInputCommand()) return

    const command = client.commands.get(interaction.commandName)
    if (!command) return

    try {
      await command.execute(interaction)
      log(interaction.client, 'COMMANDE', `/${interaction.commandName} lancé par ${interaction.user.username}`).catch(() => {})
    } catch (err) {
      console.error(`Erreur commande /${interaction.commandName}:`, err)
      log(interaction.client, 'ERREUR', `/${interaction.commandName}: ${err.message}`, true).catch(() => {})
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'Une erreur est survenue.' })
        } else {
          await interaction.reply({ content: 'Une erreur est survenue.', ephemeral: true })
        }
      } catch {}
    }
  }
}
