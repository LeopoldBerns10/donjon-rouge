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
  'P.E.K.K.A':        'Icon_HV_Pekka.png',
  'Baby Dragon':      'Icon_HV_Baby_Dragon.png',
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

  // Sorts
  'Lightning Spell':  'Icon_HV_Spell_Lightning_Spell.png',
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

  // Machines de siège
  'Wall Wrecker':     'Siege_Machine_HV_Wall_Wrecker_1.png',
  'Battle Blimp':     'Siege_Machine_HV_Battle_Blimp_3.png',
  'Stone Slammer':    'Siege_Machine_HV_Stone_Slammer_2.png',
  'Siege Barracks':   'Siege_Machine_HV_Siege_Barracks_2.png',
  'Log Launcher':     'Siege_Machine_HV_Log_Launcher_2.png',
  'Flame Flinger':    'Icon_HV_Siege_Machine_Flame_Flinger.png',
  'Battle Drill':     'Siege_Machine_HV_Battle_Drill_2.png',
}

export function getTroopImageUrl(name, category = 'troops') {
  if (TROOP_FILE_MAP[name]) {
    const folder = CATEGORY_FOLDER[category] || category
    return `${SUPABASE_ASSETS}/${folder}/${TROOP_FILE_MAP[name]}`
  }
  const folder = CATEGORY_FOLDER[category] || category
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

