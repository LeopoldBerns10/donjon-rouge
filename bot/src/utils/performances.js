const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { readFileSync, existsSync } = require('fs')
const path = require('path')
const supabase = require('../supabase.js')
const { getPlayer } = require('../cocApi.js')

// ─── Emojis Discord (chargés depuis cocEmojis.json) ──────────────────────────

const EMOJIS_PATH = path.join(__dirname, '../config/cocEmojis.json')
const COC_EMOJIS = (() => {
  try {
    if (!existsSync(EMOJIS_PATH)) return {}
    const data = JSON.parse(readFileSync(EMOJIS_PATH, 'utf8'))
    return data.emojis ?? data
  } catch { return {} }
})()

const EMOJI_MAP = {
  // Héros
  'Roi Barbare':       'coc_roi_barbare',
  'Reine Archère':     'coc_reine_archere',
  'Grand Gardien':     'coc_grand_gardien',
  'Champion Royal':    'coc_champion_royal',
  'Prince Démon':      'coc_prince_demon',
  'Machine de Combat': 'coc_machine_combat',
  'Hélicoptère':       'coc_helicoptere',
  // Sorts
  'Éclair':           'coc_sort_eclair',
  'Soin':             'coc_sort_soin',
  'Rage':             'coc_sort_rage',
  'Saut':             'coc_sort_saut',
  'Gel':              'coc_sort_gel',
  'Clonage':          'coc_sort_clone',
  'Invisibilité':     'coc_sort_invisibilite',
  'Rappel':           'coc_sort_rappel',
  'Poison':           'coc_sort_poison',
  'Tremblement':      'coc_sort_tremblement',
  'Célérité':         'coc_sort_celerite',
  'Squelette':        'coc_sort_squelette',
  'Chauve-Souris':    'coc_sort_chauvesouris',
  'Surcroissance':    'coc_sort_surcroissance',
  'Bloc de Glace':    'coc_sort_glace',
  // Troupes
  'Barbare':          'coc_barbare',
  'Archère':          'coc_archere',
  'Géant':            'coc_geant',
  'Dragon':           'coc_dragon',
  'Golem':            'coc_golem',
  'Electro Dragon':   'coc_electro_dragon',
  'Electro Titan':    'coc_electro_titan',
  'Chevaucheur':      'coc_chevaucheur',
  'Limace de Lave':   'coc_limace_lave',
  'Guérisseuse':      'coc_guerisseuse',
}

function getEmoji(frName) {
  const key = EMOJI_MAP[frName]
  if (!key) return ''
  const id = COC_EMOJIS[key]
  return id ? `<:${key}:${id}>` : ''
}

// ─── Assets COC (Supabase) ────────────────────────────────────────────────────

const COC_ASSETS_BASE = 'https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets'

const HERO_IMAGES = {
  'Barbarian King': 'heros/Icon_HV_Hero_Barbarian_King.png',
  'Archer Queen':   'heros/Icon_HV_Hero_Archer_Queen.png',
  'Grand Warden':   'heros/Icon_HV_Hero_Grand_Warden.png',
  'Royal Champion': 'heros/Icon_HV_Hero_Royal_Champion.png',
  'Minion Prince':  'heros/Hero_Minion_Prince_04_noShadow.png',
  'Battle Machine': 'heros/Icon_BB_Hero_Battle_Machine.png',
  'Battle Copter':  'heros/Icon_BB_Hero_Battle_Copter.png',
}

const SPELL_IMAGES = {
  'Lightning Spell':    'sorts/Icon_HV_Spell_Lightning_new.png',
  'Healing Spell':      'sorts/Icon_HV_Spell_Heal.png',
  'Rage Spell':         'sorts/Icon_HV_Spell_Rage.png',
  'Jump Spell':         'sorts/Icon_HV_Spell_Jump.png',
  'Freeze Spell':       'sorts/Icon_HV_Spell_Freeze_new.png',
  'Clone Spell':        'sorts/Icon_HV_Spell_Clone.png',
  'Invisibility Spell': 'sorts/Icon_HV_Spell_Invisibility.png',
  'Recall Spell':       'sorts/Icon_HV_Spell_Recall.png',
  'Poison Spell':       'sorts/Icon_HV_Dark_Spell_Poison.png',
  'Earthquake Spell':   'sorts/Icon_HV_Dark_Spell_Earthquake.png',
  'Haste Spell':        'sorts/Icon_HV_Dark_Spell_Haste.png',
  'Skeleton Spell':     'sorts/Icon_HV_Dark_Spell_Skeleton.png',
  'Bat Spell':          'sorts/Icon_HV_Dark_Spell_Bat.png',
  'Overgrowth Spell':   'sorts/Icon_HV_Dark_Spell_Overgrowth.png',
  'Ice Block Spell':    'sorts/Icon_HV_Dark_Spell_Ice_block.png',
}

const TROOP_IMAGES = {
  'Barbarian':          'troupes/Icon_HV_Barbarian.png',
  'Archer':             'troupes/Icon_HV_Archer.png',
  'Goblin':             'troupes/Icon_HV_Goblin.png',
  'Giant':              'troupes/Icon_HV_Giant.png',
  'Balloon':            'troupes/Icon_HV_Balloon.png',
  'Dragon':             'troupes/Icon_HV_Dragon.png',
  'Golem':              'troupes/Icon_HV_Golem.png',
  'Healer':             'troupes/Icon_HV_Healer.png',
  'Lava Hound':         'troupes/Icon_HV_Lava_Hound.png',
  'Hog Rider':          'troupes/Icon_HV_Hog_Rider.png',
  'Bowler':             'troupes/Icon_HV_Bowler.png',
  'Electro Dragon':     'troupes/Icon_HV_Electro_Dragon.png',
  'Electro Titan':      'troupes/Icon_HV_Electro_Titan.png',
  'Dragon Rider':       'troupes/Icon_HV_Dragon_Rider.png',
  'Headhunter':         'troupes/Icon_HV_Headhunter.png',
  'Ice Golem':          'troupes/Icon_HV_Ice_Golem.png',
  'Druid':              'troupes/Druid_HV_01_Grass.png',
  'Furnace':            'troupes/Icon_HV_Furnace.png',
  'Apprentice Warden':  'troupes/Icon_HV_Apprentice_Warden.png',
}

function getAssetUrl(map, name) {
  const path = map[name]
  return path ? `${COC_ASSETS_BASE}/${path}` : null
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
  'Battle Drill': 'Foreuse de Combat',
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

// ─── Troupes de siège ─────────────────────────────────────────────────────────

const SIEGE_MACHINES = new Set([
  'Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks',
  'Log Launcher', 'Flame Flinger', 'Battle Drill',
])

// ─── Timer de suppression (navigation) ───────────────────────────────────────

const navTimers = new Map()

function resetNavTimer(message, timeout = 10 * 60 * 1000) {
  const existing = navTimers.get(message.id)
  if (existing) clearTimeout(existing)
  const timer = setTimeout(() => {
    message.delete().catch(() => {})
    navTimers.delete(message.id)
  }, timeout)
  navTimers.set(message.id, timer)
}

// ─── Couleur et formatage ─────────────────────────────────────────────────────

function getLeagueColor(leagueName) {
  if (!leagueName) return 0x8B0000
  const n = leagueName.toLowerCase()
  if (n.includes('legend'))    return 0xFFD700
  if (n.includes('titan'))     return 0xF0A500
  if (n.includes('champion'))  return 0x3498DB
  if (n.includes('master'))    return 0x9B59B6
  if (n.includes('crystal'))   return 0x1ABC9C
  if (n.includes('gold'))      return 0xDAA520
  if (n.includes('silver'))    return 0xAAAAAA
  if (n.includes('bronze'))    return 0xCD7F32
  return 0x8B0000
}

function formatRole(role) {
  const map = { leader: '👑 Chef', coLeader: '⚜️ Co-Chef', admin: '🛡️ Aîné', elder: '🛡️ Aîné', member: '⚔️ Membre' }
  return map[role] ?? role ?? '-'
}

// ─── Embed joueur ─────────────────────────────────────────────────────────────

function buildPlayerEmbed(player, discordId) {
  const leagueName = player.leagueTier?.name ?? player.league?.name ?? 'Aucune ligue'
  const leagueIcon = player.leagueTier?.iconUrls?.small ?? player.leagueTier?.iconUrls?.medium
    ?? player.league?.iconUrls?.small ?? player.league?.iconUrls?.medium ?? null
  const clanName   = player.clan?.name ?? 'Sans clan'
  const clanBadge  = player.clan?.badgeUrls?.small ?? null

  const embed = new EmbedBuilder()
    .setColor(getLeagueColor(leagueName))
    .setTitle(`⚔️ ${player.name}`)
    .setAuthor(clanBadge ? { name: clanName, iconURL: clanBadge } : { name: clanName })
    .addFields(
      { name: '🏰 HDV',               value: String(player.townHallLevel ?? '?'), inline: true },
      { name: '🏅 Ligue',             value: leagueName,                          inline: true },
      { name: '🏆 Trophées',          value: String(player.trophies ?? 0),        inline: true },
      { name: '​',               value: '​',                            inline: false },
      { name: '⭐ Étoiles de guerre',  value: String(player.warStars ?? 0),        inline: true },
      { name: '🎁 Donations',         value: String(player.donations ?? 0),       inline: true },
      { name: '🎖️ Rôle',             value: formatRole(player.role),             inline: true },
      { name: '💬 Discord',           value: discordId ? `<@${discordId}>` : 'Non lié ❌', inline: false },
    )
    .setFooter({ text: 'Donjon Rouge • Profil CoC' })
    .setTimestamp()

  if (leagueIcon) embed.setThumbnail(leagueIcon)

  return embed
}

// ─── Embed héros ──────────────────────────────────────────────────────────────

function buildHeroesEmbed(player) {
  const heroes = (player.heroes || []).filter(h => h.village === 'home')
  if (!heroes.length) return null

  const firstHeroImg = getAssetUrl(HERO_IMAGES, heroes[0].name)

  // Champs 2 par 2 via spacer
  const fields = []
  for (let i = 0; i < heroes.length; i++) {
    const h = heroes[i]
    const frName = translate(h.name)
    const emoji  = getEmoji(frName)
    fields.push({ name: '​', value: `${emoji} **${frName}** — Niv. ${h.level} / ${h.maxLevel}`, inline: true })
    if (i % 2 === 1) fields.push({ name: '​', value: '​', inline: true })
  }

  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`⚔️ Héros — ${player.name}`)
    .addFields(fields)
    .setFooter({ text: 'Donjon Rouge • Héros' })
    .setTimestamp()

  if (firstHeroImg) embed.setThumbnail(firstHeroImg)

  return embed
}

// ─── Embed sorts ──────────────────────────────────────────────────────────────

function buildSpellsEmbed(player) {
  const spells = (player.spells || []).filter(s => s.village === 'home')
  if (!spells.length) return null

  const shortSpell = name => translate(name).replace(/^Sort (de |d')?/, '')
  const firstSpellImg = getAssetUrl(SPELL_IMAGES, spells[0].name)

  // Grouper 3 sorts par champ inline
  const fields = []
  for (let i = 0; i < spells.length; i += 3) {
    const chunk = spells.slice(i, i + 3)
    fields.push({
      name: '​',
      value: chunk.map(s => { const n = shortSpell(s.name); return `${getEmoji(n)} **${n}** — Niv. ${s.level} / ${s.maxLevel}` }).join('\n'),
      inline: true,
    })
  }

  const embed = new EmbedBuilder()
    .setColor(0x7B2FBE)
    .setTitle(`🪄 Sorts — ${player.name}`)
    .addFields(fields)
    .setFooter({ text: 'Donjon Rouge • Sorts' })
    .setTimestamp()

  if (firstSpellImg) embed.setThumbnail(firstSpellImg)

  return embed
}

// ─── Embed troupes ────────────────────────────────────────────────────────────

function buildTroopesEmbed(player) {
  const homeTroops    = (player.troops || []).filter(t => t.village === 'home')
  const regularTroops = homeTroops.filter(t => !SIEGE_MACHINES.has(t.name) && !('superTroopIsActive' in t))
  const siegeMachines = homeTroops.filter(t => SIEGE_MACHINES.has(t.name))

  if (!regularTroops.length && !siegeMachines.length) return null

  const firstTroopImg = getAssetUrl(TROOP_IMAGES, regularTroops[0]?.name ?? '')

  // Grouper 3 troupes par champ inline
  const fields = []
  for (let i = 0; i < Math.min(regularTroops.length, 24); i += 3) {
    const chunk = regularTroops.slice(i, i + 3)
    fields.push({
      name: '​',
      value: chunk.map(t => { const n = translate(t.name); return `${getEmoji(n)} **${n}** — Niv. ${t.level} / ${t.maxLevel}` }).join('\n'),
      inline: true,
    })
  }

  if (siegeMachines.length) {
    fields.push({
      name: '🏰 Machines de combat',
      value: siegeMachines.map(t => { const n = translate(t.name); return `${getEmoji(n)} **${n}** — Niv. ${t.level} / ${t.maxLevel}` }).join('\n'),
      inline: false,
    })
  }

  const embed = new EmbedBuilder()
    .setColor(0x2E7D32)
    .setTitle(`🏹 Troupes — ${player.name}`)
    .addFields(fields)
    .setFooter({ text: 'Donjon Rouge • Troupes' })
    .setTimestamp()

  if (firstTroopImg) embed.setThumbnail(firstTroopImg)

  return embed
}

// ─── Boutons de navigation ────────────────────────────────────────────────────

function buildNavComponents(tag, current) {
  const mk = (customId, label, style) => new ButtonBuilder()
    .setCustomId(customId).setLabel(label).setStyle(style)
  const buttons = []
  if (current !== 'heros')   buttons.push(mk(`stats_heros:${tag}`,   '⚔️ Héros',    ButtonStyle.Danger))
  if (current !== 'sorts')   buttons.push(mk(`stats_sorts:${tag}`,   '🪄 Sorts',    ButtonStyle.Primary))
  if (current !== 'troupes') buttons.push(mk(`stats_troupes:${tag}`, '🏹 Troupes',  ButtonStyle.Success))
  if (current !== 'profil')  buttons.push(mk(`stats_profil:${tag}`,  '↩️ Retour',   ButtonStyle.Secondary))
  return [new ActionRowBuilder().addComponents(buttons)]
}

// ─── Handler mes_performances ─────────────────────────────────────────────────

async function handleMesPerformances(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply()

  const { data: links } = await supabase
    .from('discord_links')
    .select('coc_tag, coc_name, is_primary')
    .eq('discord_id', interaction.user.id)
    .order('created_at', { ascending: true })

  if (!links || links.length === 0) {
    return interaction.editReply({ content: '❌ Aucun compte lié. Utilise `/lier` pour associer ton compte COC.' })
  }

  const primary = links.find(l => l.is_primary) ?? links[0]

  let player
  try {
    player = await getPlayer(primary.coc_tag)
  } catch {
    return interaction.editReply({ content: '❌ Impossible de récupérer les données du joueur.' })
  }

  const msg = await interaction.editReply({
    embeds: [buildPlayerEmbed(player, interaction.user.id)],
    components: buildNavComponents(player.tag, 'profil'),
  })
  resetNavTimer(msg)
}

module.exports = {
  buildPlayerEmbed, buildHeroesEmbed, buildSpellsEmbed, buildTroopesEmbed,
  buildNavComponents, resetNavTimer, handleMesPerformances,
  translate, SIEGE_MACHINES, HERO_IMAGES, SPELL_IMAGES, TROOP_IMAGES, COC_ASSETS_BASE,
}
