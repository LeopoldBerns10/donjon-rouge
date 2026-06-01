const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
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
  await interaction.deferReply({ ephemeral: true })

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
  await interaction.deferUpdate()

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
  await interaction.deferUpdate()

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
  await interaction.deferUpdate()

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
  await interaction.deferUpdate()

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

const BUTTON_HANDLERS = {
  mes_performances: handleMesPerformances,
  voir_mon_compte:  handleMesPerformances,
  lier_compte:      handleLierCompte,
  stats_clan:       handleStatsClan,
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isButton()) {
      const colonIdx = interaction.customId.indexOf(':')
      const prefix   = colonIdx >= 0 ? interaction.customId.slice(0, colonIdx) : interaction.customId
      const argTag   = colonIdx >= 0 ? interaction.customId.slice(colonIdx + 1) : null

      try {
        if (BUTTON_HANDLERS[interaction.customId]) {
          await BUTTON_HANDLERS[interaction.customId](interaction)
        } else if (prefix === 'stats_profil'  && argTag) {
          await handleStatsProfil(interaction, argTag)
        } else if (prefix === 'stats_heros'   && argTag) {
          await handleStatsHeros(interaction, argTag)
        } else if (prefix === 'stats_sorts'   && argTag) {
          await handleStatsSorts(interaction, argTag)
        } else if (prefix === 'stats_troupes' && argTag) {
          await handleStatsTroupes(interaction, argTag)
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
