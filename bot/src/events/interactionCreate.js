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
const supabase = require('../supabase.js')
const { getClanMembers, getClanMembersDR2, getPlayer } = require('../cocApi.js')
const {
  handleMesPerformances,
  buildPlayerEmbed,
  buildNavComponents,
  resetNavTimer,
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
  handleModalPanelReglement, handleModalPanelAdminAdd, handleModalPanelLier, handleModalPanelMsg,
} = require('../lib/panelHandlers.js')
const { buildReglementEmbed, REGLEMENT_TEXT } = require('../setup/sendReglement.js')
const { PUBLIC_CHANNEL_ID } = require('../setup/sendReglementPublic.js')
const { forceRefresh } = require('../scheduler.js')

const CHEF_ROLE_ID = '611123759864348672'

// ─── Bouton refresh_status ────────────────────────────────────────────────────

async function handleRefreshStatus(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  await forceRefresh(interaction.client)
  await interaction.editReply('✅ Statut actualisé.')
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

// ─── Traductions EN → FR ──────────────────────────────────────────────────────

const TRANSLATIONS = {
  'Barbarian': 'Barbare', 'Archer': 'Archère', 'Goblin': 'Gobelin',
  'Giant': 'Géant', 'Wall Breaker': 'Brise-Murs', 'Balloon': 'Ballon',
  'Wizard': 'Sorcier', 'Healer': 'Guérisseuse', 'Dragon': 'Dragon',
  'P.E.K.K.A': 'P.E.K.K.A', 'Minion': 'Sbire', 'Hog Rider': 'Chevaucheur',
  'Valkyrie': 'Valkyrie', 'Golem': 'Golem', 'Witch': 'Sorcière',
  'Lava Hound': 'Limace de Lave', 'Bowler': 'Lanceur',
  'Baby Dragon': 'Bébé Dragon', 'Miner': 'Mineur', 'Yeti': 'Yéti',
  'Electro Dragon': 'Dragon Électro', 'Electro Titan': 'Titan Électro',
  'Dragon Rider': 'Chevaucheur de Dragon', 'Druid': 'Druide',
  'Headhunter': 'Chasseuse de Têtes', 'Apprentice Warden': 'Gardien Apprenti',
  'Wall Wrecker': 'Bélier', 'Battle Blimp': 'Dirigeable',
  'Stone Slammer': 'Broyeur', 'Siege Barracks': 'Caserne de Siège',
  'Log Launcher': 'Lance-Bûches', 'Flame Flinger': 'Lance-Flammes',
  'Super Barbarian': 'Super Barbare', 'Super Archer': 'Super Archère',
  'Super Wall Breaker': 'Super Brise-Murs', 'Super Giant': 'Super Géant',
  'Sneaky Goblin': 'Gobelin Furtif', 'Inferno Dragon': 'Dragon Infernal',
  'Super Valkyrie': 'Super Valkyrie', 'Super Witch': 'Super Sorcière',
  'Ice Hound': 'Limace Glacée', 'Super Bowler': 'Super Lanceur',
  'Super Dragon': 'Super Dragon', 'Super Miner': 'Super Mineur',
  'Super Hog Rider': 'Super Chevaucheur', 'Super Yeti': 'Super Yéti',
  'Super Minion': 'Super Sbire', 'Super Wizard': 'Super Sorcier',
  'Rocket Balloon': 'Ballon Fusée',
  'Lightning Spell': 'Sort Éclair', 'Healing Spell': 'Sort de Soin',
  'Rage Spell': 'Sort de Rage', 'Jump Spell': 'Sort de Saut',
  'Freeze Spell': 'Sort de Gel', 'Poison Spell': 'Sort de Poison',
  'Earthquake Spell': 'Sort de Tremblement', 'Haste Spell': 'Sort de Célérité',
  'Clone Spell': 'Sort de Clonage', 'Skeleton Spell': 'Sort Squelette',
  'Bat Spell': 'Sort Chauve-Souris', 'Invisibility Spell': "Sort d'Invisibilité",
  'Recall Spell': 'Sort de Rappel', 'Overgrowth Spell': 'Sort de Surcroissance',
  'Ice Block Spell': 'Sort de Bloc de Glace',
  'Barbarian King': 'Roi Barbare', 'Archer Queen': 'Reine Archère',
  'Grand Warden': 'Grand Gardien', 'Royal Champion': 'Champion Royal',
  'Minion Prince': 'Prince Démon',
}

const translate = name => TRANSLATIONS[name] ?? name

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

  const heroes = (player.heroes || []).filter(h => h.village === 'home')

  if (!heroes.length) {
    return interaction.editReply({ content: '😴 Aucun héros débloqué.', embeds: [], components: buildNavComponents(tag, 'heros') })
  }

  const leagueIconHero = player.leagueTier?.iconUrls?.medium ?? player.league?.iconUrls?.medium ?? null

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`⚔️ Héros — ${player.name}`)
    .addFields(heroes.map(h => {
      const filled = Math.round((h.level / h.maxLevel) * 10)
      const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
      return { name: translate(h.name), value: `${h.level}/${h.maxLevel} ${bar}`, inline: true }
    }))
    .setFooter({ text: 'Donjon Rouge • Héros' })
    .setTimestamp()

  if (leagueIconHero) embed.setThumbnail(leagueIconHero)

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

  const spells = (player.spells || []).filter(s => s.village === 'home')

  if (!spells.length) {
    return interaction.editReply({ content: '😴 Aucun sort débloqué.', embeds: [], components: buildNavComponents(tag, 'sorts') })
  }

  const shortSpell = name => translate(name).replace(/^Sort (de |d')?/, '')

  const embed = new EmbedBuilder()
    .setColor(0x7B2FBE)
    .setTitle(`🪄 Sorts — ${player.name}`)
    .addFields(spells.slice(0, 25).map(s => ({
      name: shortSpell(s.name),
      value: `${s.level}/${s.maxLevel}`,
      inline: true,
    })))
    .setFooter({ text: 'Donjon Rouge • Sorts' })
    .setTimestamp()

  await interaction.editReply({ content: '', embeds: [embed], components: buildNavComponents(tag, 'sorts') })
  resetNavTimer(interaction.message)
}

const SIEGE_MACHINES = new Set([
  'Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks',
  'Log Launcher', 'Flame Flinger', 'Battle Drill',
])

async function handleStatsTroupes(interaction, tag) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate()

  let player
  try {
    player = await getPlayer(tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.', embeds: [], components: [] })
  }

  const homeTroops    = (player.troops || []).filter(t => t.village === 'home')
  const regularTroops = homeTroops.filter(t => !SIEGE_MACHINES.has(t.name) && !('superTroopIsActive' in t))
  const siegeMachines = homeTroops.filter(t => SIEGE_MACHINES.has(t.name))

  if (!regularTroops.length && !siegeMachines.length) {
    return interaction.editReply({ content: '😴 Aucune troupe trouvée.', embeds: [], components: buildNavComponents(tag, 'troupes') })
  }

  const fields = regularTroops.slice(0, 24).map(t => ({
    name: translate(t.name),
    value: `${t.level}/${t.maxLevel}`,
    inline: true,
  }))

  if (siegeMachines.length) {
    fields.push({
      name: '🏰 Machines de combat',
      value: siegeMachines.map(t => `**${translate(t.name)}** ${t.level}/${t.maxLevel}`).join('\n'),
      inline: false,
    })
  }

  const embed = new EmbedBuilder()
    .setColor(0x2E7D32)
    .setTitle(`🏹 Troupes — ${player.name}`)
    .addFields(fields)
    .setFooter({ text: 'Donjon Rouge • Troupes' })
    .setTimestamp()

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
  sendWelcomeMessage(member, 'donjon_rouge').catch(err => console.error('[welcome] donjon_rouge:', err))
}

async function handleRoleVisiteur(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true })
  const member = interaction.member
  await member.roles.remove(ROLES.VERIFIE).catch(() => {})
  await member.roles.add(ROLES.VISITEUR)
  await interaction.editReply({ content: '👋 Bienvenue visiteur !' })
  sendWelcomeMessage(member, 'visiteur').catch(err => console.error('[welcome] visiteur:', err))
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

const BUTTON_HANDLERS = {
  refresh_status:    handleRefreshStatus,
  mes_performances:  handleMesPerformances,
  voir_mon_compte:   handleMesPerformances,
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
  panel_delier_membre:     handlePanelDelierMembre,
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const colonIdx = interaction.customId.indexOf(':')
      const prefix   = colonIdx >= 0 ? interaction.customId.slice(0, colonIdx) : interaction.customId
      const argTag   = colonIdx >= 0 ? interaction.customId.slice(colonIdx + 1) : null

      try {
        if (interaction.isButton() && BUTTON_HANDLERS[interaction.customId]) {
          await BUTTON_HANDLERS[interaction.customId](interaction)
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
        } else if (prefix === 'panel_membres_dr1_prev') {
          await handlePanelMembresDRNav(interaction, 'dr1', 'prev', parseInt(argTag))
        } else if (prefix === 'panel_membres_dr1_next') {
          await handlePanelMembresDRNav(interaction, 'dr1', 'next', parseInt(argTag))
        } else if (prefix === 'panel_membres_dr2_prev') {
          await handlePanelMembresDRNav(interaction, 'dr2', 'prev', parseInt(argTag))
        } else if (prefix === 'panel_membres_dr2_next') {
          await handlePanelMembresDRNav(interaction, 'dr2', 'next', parseInt(argTag))
        }
      } catch (err) {
        console.error(`[Button] ${interaction.customId}:`, err)
        const payload = { content: 'Une erreur est survenue.', ephemeral: true }
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload)
        } else {
          await interaction.reply(payload)
        }
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
    } catch (err) {
      console.error(`Erreur commande /${interaction.commandName}:`, err)
      const payload = { content: 'Une erreur est survenue.', ephemeral: true }
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload)
      } else {
        await interaction.reply(payload)
      }
    }
  }
}
