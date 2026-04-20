const SUPABASE_ASSETS = 'https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets'

const CATEGORY_FOLDER = {
  'heroes':    'heros',
  'troops':    'troupes',
  'spells':    'sorts',
  'siege':     'engins',
  'equipment': 'equipements',
  'pets':      'familiers',
  'super':     'super-troupes',
  'gardien':   'gardien',
  'heros':       'heros',
  'troupes':     'troupes',
  'sorts':       'sorts',
  'engins':      'engins',
  'equipements': 'equipements',
  'familiers':   'familiers',
}

const TROOP_FILE_MAP = {
  // Héros
  'Barbarian King':   'Icon_HV_Hero_Barbarian_King.png',
  'Archer Queen':     'Icon_HV_Hero_Archer_Queen.png',
  'Grand Warden':     'Icon_HV_Hero_Grand_Warden.png',
  'Royal Champion':   'Icon_HV_Hero_Royal_Champion.png',
  'Minion Prince':    'Hero_Minion_Prince_04_noShadow.png',
  'Dragon Duke':      'dd_iconTall_Alt.png',

  // Troupes principales
  'Barbarian':        'Icon_HV_Barbarian.png',
  'Archer':           'Icon_HV_Archer.png',
  'Giant':            'Icon_HV_Giant.png',
  'Goblin':           'Icon_HV_Goblin.png',
  'Wall Breaker':     'Icon_HV_Wall_Breaker.png',
  'Balloon':          'Icon_HV_Balloon.png',
  'Wizard':           'Icon_HV_Wizard.png',
  'Healer':           'Icon_HV_Healer.png',
  'Dragon':           'Icon_HV_Dragon.png',
  'P.E.K.K.A':        'Icon_HV_P.E.K.K.A.png',
  'Baby Dragon':      'Icon_BB_Baby_Dragon.png',
  'Miner':            'Icon_HV_Miner.png',
  'Electro Dragon':   'Icon_HV_Electro_Dragon.png',
  'Yeti':             'Icon_HV_Yeti.png',
  'Dragon Rider':     'Icon_HV_Dragon_Rider.png',
  'Electro Titan':    'Icon_HV_Electro_Titan.png',
  'Root Rider':       'Icon_HV_Root_Rider.png',
  'Golem':            'Icon_HV_Golem.png',
  'Witch':            'Icon_HV_Witch.png',
  'Lava Hound':       'Icon_HV_Lava_Hound.png',
  'Bowler':           'Icon_HV_Bowler.png',
  'Ice Golem':        'Icon_HV_Ice_Golem.png',
  'Headhunter':       'Icon_HV_Headhunter.png',
  'Apprentice Warden':'Icon_HV_Apprentice_Warden.png',
  'Druid':            'Druid_HV_01_Grass.png',
  'Hog Rider':        'Icon_HV_Hog_Rider.png',
  'Valkyrie':         'Icon_HV_Valkyrie.png',
  'Minion':           'Icon_HV_Minion.png',
  'Furnace':          'Icon_HV_Furnace.png',
  'Thrower':          'Thrower_05_grass.png',
  'Meteor Golem':     'MeteoriteGolem_withGrassbase_f61_layered_3k .png',

  // Sorts
  'Lightning Spell':  'Icon_HV_Spell_Lightning_new.png',
  'Healing Spell':    'Icon_HV_Spell_Heal.png',
  'Rage Spell':       'Icon_HV_Spell_Rage.png',
  'Freeze Spell':     'Icon_HV_Spell_Freeze_new.png',
  'Jump Spell':       'Icon_HV_Spell_Jump.png',
  'Clone Spell':      'Icon_HV_Spell_Clone.png',
  'Invisibility Spell': 'Icon_HV_Spell_Invisibility.png',
  'Recall Spell':     'Icon_HV_Spell_Recall.png',
  'Revive Spell':     'Icon_HV_Spell_Revive.png',
  'Bat Spell':        'Icon_HV_Dark_Spell_Bat.png',
  'Skeleton Spell':   'Icon_HV_Dark_Spell_Skeleton.png',
  'Earthquake Spell': 'Icon_HV_Dark_Spell_Earthquake.png',
  'Haste Spell':      'Icon_HV_Dark_Spell_Haste.png',
  'Ice Spell':        'Icon_HV_Dark_Spell_Ice.png',
  'Overgrowth Spell': 'Icon_HV_Dark_Spell_Overgrowth.png',
  'Poison Spell':     'Icon_HV_Dark_Spell_Poison.png',
  'Ice Block Spell':  'Icon_HV_Dark_Spell_Ice_block.png',
  'Totem Spell':      'Icon_HV_Spell_totem.png',

  // Machines de siège
  'Wall Wrecker':     'Siege_Machine_HV_Wall_Wrecker_1.png',
  'Battle Blimp':     'Siege_Machine_HV_Battle_Blimp_3.png',
  'Stone Slammer':    'Siege_Machine_HV_Stone_Slammer_2.png',
  'Siege Barracks':   'Siege_Machine_HV_Siege_Barracks_2.png',
  'Log Launcher':     'Siege_Machine_HV_Log_Launcher_2.png',
  'Flame Flinger':    'Icon_HV_Siege_Machine_Flame_Flinger.png',
  'Battle Drill':     'Siege_Machine_HV_Battle_Drill_2.png',
  'Troop Launcher':   'Troop_Launcher_NoGrass_Shadow.png',

  // Héros MDO
  'Battle Machine':     'Icon_BB_Hero_Battle_Machine.png',
  'Battle Copter':      'Icon_BB_Hero_Battle_Copter.png',

  // Familiers (pets)
  'L.A.S.S.I':        'Icon_HV_Hero_Pets_LASSI.png',
  'Electro Owl':      'Icon_HV_Hero_Pets_Electro_Owl.png',
  'Mighty Yak':       'Icon_HV_Hero_Pets_Mighty_Yak.png',
  'Unicorn':          'Icon_HV_Hero_Pets_Unicorn.png',
  'Phoenix':          'Icon_HV_Hero_Pets_Phoenix.png',
  'Poison Lizard':    'Icon_HV_Hero_Pets_Poison_Lizard.png',
  'Diggy':            'Icon_HV_Hero_Pets_Diggy.png',
  'Frosty':           'Icon_HV_Hero_Pets_Frosty.png',
  'Spirit Fox':       'Hero_Pet_HV_Spirit_Fox.png',
  'Angry Jelly':      'Hero_Pet_HV_Angry_Jelly_02.png',
  'Sneezy':           'Icon_HV_Hero_Pets_Sneezy.png',
  'Greedy Raven':     'pet_Greedy_Raven_2_grass.png',

  // Équipements — Archer Queen
  'Archer Puppet':        'Hero_Equipment_AQ_Archer_Puppet.png',
  'Frozen Arrow':         'Hero_Equipment_AQ_Frozen_Arrow.png',
  'Giant Arrow':          'Hero_Equipment_AQ_Giant_Arrow.png',
  'Healer Puppet':        'Hero_Equipment_AQ_Healer_Puppet.png',
  'Invisibility Vial':    'Hero_Equipment_AQ_Invisibility_Vial.png',
  'Magic Mirror':         'Hero_Equipment_AQ_Magic_Mirror.png',
  'Action Figure':        'Hero_Equipment_AQ_WWEActionFigure.png',
  // Équipements — Barbarian King
  'Barbarian Puppet':     'Hero_Equipment_BK_Barbarian_Puppet.png',
  'Earthquake Boots':     'Hero_Equipment_BK_Earthquake_Boots.png',
  'Rage Vial':            'Hero_Equipment_BK_Rage_Vial.png',
  'Snake Bracelet':       'Hero_Equipment_BK_SnakeBracelet.png',
  'Spiky Ball':           'Hero_Equipment_BK_Spiky_Ball.png',
  'Vampstache':           'Hero_Equipment_BK_Vampstache.png',
  'Stick Horse':          'HeroGear_BK_StickFireHorse.png',
  // Équipements — Royal Champion
  'Giant Gauntlet':       'Hero_Equipment_BQ_Giant_Gauntlet.png',
  'Electro Boots':        'Hero_Equipment_RC_ElectroBoots.png',
  'Frost Flake':          'Hero_Equipment_rc_frost_flake.png',
  'Haste Vial':           'Hero_Equipment_RC_Haste_Vial.png',
  'Hog Rider Puppet':     'Hero_Equipment_RC_Hog_Rider_Doll.png',
  'Royal Gem':            'Hero_Equipment_RC_Royal_Gem.png',
  'Seeking Shield':       'Hero_Equipment_RC_Seeking_Shield.png',
  // Équipements — Grand Warden
  'Eternal Tome':         'Hero_Equipment_GW_Eternal_Tome.png',
  'Fireball':             'Hero_Equipment_GW_Fireball.png',
  'Healing Tome':         'Hero_Equipment_GW_Healing_Tome.png',
  'Life Gem':             'Hero_Equipment_GW_Life_Gem.png',
  'Rage Gem':             'Hero_Equipment_GW_Rage_Gem.png',
  'Lavaloon Puppet':      'icon_gear_GW_LavaloonPuppet.png',
  'Heroic Torch':         'HeroGear_GW_Olympic_Torch_hh0000.png',
  'Dark Crown':           'HeroGear_MP_DarkCrown_2k.png',
  'Rocket Spear':         'HeroGear_RoyalChampion_RocketSpear_Equipment_03.png',
  // Équipements — Minion Prince
  'Dark Orb':             'Hero_Equipment_MP_DarkOrb.png',
  'Henchmen Puppet':      'Hero_Equipment_MP_Henchman.png',
  'Noble Iron':           'Hero_Equipment_MP_PowerPump.png',
  'Metal Pants':          'HeroEquipment_MP_IronPants.png',
  'Flame Blower':         'HG_DD_FlameBreath_Marketing.png',
  'Fire Heart':           'HG_DD_FlameHeart_Marketing.png',
  'Stun Blaster':         'HG_DD_StunBlast_Marketing.png',
  'Meteor Staff':         'HeroGear_MP_MeteoriteSceptre.png',

  // Super Troupes
  'Super Barbarian':      'Icon_HV_Super_Barbarian.png',
  'Super Archer':         'Icon_HV_Super_Archer.png',
  'Super Giant':          'Icon_HV_Super_Giant.png',
  'Sneaky Goblin':        'Icon_HV_Sneaky_Goblin.png',
  'Super Wall Breaker':   'Icon_HV_Super_Wall_Breaker.png',
  'Rocket Balloon':       'Icon_HV_Super_Rocket_Balloon.png',
  'Super Wizard':         'Icon_HV_Super_Wizard.png',
  'Super Dragon':         'Icon_HV_Super_Dragon.png',
  'Inferno Dragon':       'Icon_HV_Super_Inferno_Dragon.png',
  'Super Minion':         'Icon_HV_Super_Minion.png',
  'Super Valkyrie':       'Icon_HV_Super_Valkyrie.png',
  'Super Witch':          'Icon_HV_Super_Witch.png',
  'Ice Hound':            'Icon_HV_Super_Ice_Hound.png',
  'Super Bowler':         'Icon_HV_Super_Bowler.png',
  'Super Miner':          'Icon_HV_Super_Miner.png',
  'Super Hog Rider':      'Icon_HV_Super_Hog_Rider.png',
  'Super Yeti':           'icon_super_yeti.png',
}

export function getTroopImageUrl(name, category = 'troops') {
  const folder = CATEGORY_FOLDER[category] || category

  if (TROOP_FILE_MAP[name]) {
    return `${SUPABASE_ASSETS}/${folder}/${TROOP_FILE_MAP[name]}`
  }

  // Fallback : tentative avec le nom nettoyé
  const clean = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '')
  return `${SUPABASE_ASSETS}/${folder}/Icon_HV_${clean}.png`
}

export function getTownHallImageUrl(level) {
  return `${SUPABASE_ASSETS}/hdv/Building_HV_Town_Hall_level_${level}.png`
}

export function translateRole(role) {
  const roles = {
    leader: 'Chef',
    coLeader: 'Co-Chef',
    admin: 'Aîné',
    member: 'Membre'
  }
  return roles[role] || role
}

export function getRoleColor(role) {
  const colors = {
    leader: 'text-red-500',
    coLeader: 'text-purple-400',
    admin: 'text-blue-400',
    member: 'text-green-400'
  }
  return colors[role] || 'text-gray-400'
}

export function getRoleBadgeClass(role) {
  const badges = {
    leader: 'bg-red-900/50 border border-red-500 text-red-400',
    coLeader: 'bg-purple-900/50 border border-purple-500 text-purple-400',
    admin: 'bg-blue-900/50 border border-blue-500 text-blue-400',
    member: 'bg-green-900/50 border border-green-500 text-green-400'
  }
  return badges[role] || 'bg-gray-800 border border-gray-600 text-gray-400'
}

const LEAGUE_ASSETS = 'https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets/ligues'

const LEAGUE_KEY_IMAGE = {
  // Légende
  'légende':    `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'legend':     `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'ligue':      `${LEAGUE_ASSETS}/LB_big_dragon3.png`,

  // Champion / Electro Dragon
  'champion':   `${LEAGUE_ASSETS}/LB_big_dragon2.png`,
  'electro':    `${LEAGUE_ASSETS}/LB_big_dragon2.png`,

  // Dragon
  'dragon':     `${LEAGUE_ASSETS}/LB_big_dragon1.png`,

  // Titan
  'titan':      `${LEAGUE_ASSETS}/LB_big_titan.png`,

  // P.E.K.K.A / Maître
  'p.e.k.k.a':  `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'maître':     `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'master':     `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'géant':      `${LEAGUE_ASSETS}/LB_big_pekka.png`,

  // Golem / Cristal
  'golem':      `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'cristal':    `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'crystal':    `${LEAGUE_ASSETS}/LB_big_golem.png`,

  // Sorcière / Or
  'sorcière':   `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'witch':      `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'or':         `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'gold':       `${LEAGUE_ASSETS}/LB_big_witch.png`,

  // Sorcier / Bronze
  'sorcier':    `${LEAGUE_ASSETS}/LB_big_wizard.png`,
  'wizard':     `${LEAGUE_ASSETS}/LB_big_wizard.png`,
  'bronze':     `${LEAGUE_ASSETS}/LB_big_wizard.png`,

  // Valkyrie / Argent
  'valkyrie':   `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'argent':     `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'silver':     `${LEAGUE_ASSETS}/LB_big_valyrie.png`,

  // Archer / Guerrier
  'archer':     `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'guerrier':   `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'warrior':    `${LEAGUE_ASSETS}/LB_big_archer.png`,

  // Barbare
  'barbare':    `${LEAGUE_ASSETS}/LB_big_barb.png`,
  'barbarian':  `${LEAGUE_ASSETS}/LB_big_barb.png`,

  // Squelette
  'squelette':  `${LEAGUE_ASSETS}/LB_big_skeleton.png`,
  'skeleton':   `${LEAGUE_ASSETS}/LB_big_skeleton.png`,

  // Unranked → rien
  'unranked':   null,
}

export function getLeagueImageUrl(leagueName) {
  if (!leagueName) return null
  const key = leagueName.toLowerCase().split(' ')[0]
  if (!(key in LEAGUE_KEY_IMAGE)) return null
  return LEAGUE_KEY_IMAGE[key]
}

export function getLeagueShortName(leagueName) {
  if (!leagueName) return ''
  return leagueName.replace(/ League$/i, '').replace(/Ligue /i, '')
}

export function getCWLLeagueIcon(leagueName) {
  if (!leagueName) return null
  const name = leagueName.toLowerCase()
  if (name.includes('bronze'))   return `${SUPABASE_ASSETS}/ligue-icones/Icon_HV_CWL_Bronze_1.png`
  if (name.includes('silver'))   return `${SUPABASE_ASSETS}/ligue-icones/Icon_HV_CWL_Silver_1.png`
  if (name.includes('gold'))     return `${SUPABASE_ASSETS}/ligue-icones/Icon_HV_CWL_Gold_1.png`
  if (name.includes('crystal'))  return `${SUPABASE_ASSETS}/ligue-icones/Icon_HV_CWL_Crystal_1.png`
  if (name.includes('master'))   return `${SUPABASE_ASSETS}/ligue-icones/Icon_HV_CWL_Master_1.png`
  if (name.includes('champion')) return `${SUPABASE_ASSETS}/ligue-icones/Icon_HV_CWL_Champion_1.png`
  return null
}

export function getCapitalHallIcon() {
  return `${SUPABASE_ASSETS}/capital/Building_CC_Capital_Hall_level_10.png`
}

export function getCapitalLeagueIcon(leagueName) {
  if (!leagueName) return null
  const name = leagueName.toLowerCase()
  if (name.includes('champion'))
    return `${SUPABASE_ASSETS}/capital/Icon_HV_League_Champion.png`
  return null
}

