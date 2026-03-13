# 🏰 Prompt Claude Code — Donjon Rouge
## Mise à jour des URLs d'images → Supabase Storage

---

## CONTEXTE

Toutes les images du jeu sont maintenant hébergées sur Supabase Storage.

**Base URL :**
```
https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets
```

**Structure des dossiers dans Supabase :**
```
coc-assets/
├── heros/          → Icon_HV_Hero_Barbarian_King.png, Icon_HV_Hero_Archer_Queen.png...
├── troupes/        → Icon_HV_Barbarian.png, Icon_HV_Archer.png, Icon_HV_Dragon.png...
├── sorts/          → Icon_HV_Spell_Lightning_....png, Icon_HV_Dark_Spell_Bat....png...
├── engins/         → Siege_Machine_HV_Wall_Wrecker_1.png, Icon_HV_Siege_Machine_Flame_Flinger.png...
├── equipements/    → (équipements des héros)
├── familiers/      → (familiers/pets)
├── super-troupes/  → (super troupes)
├── gardien/        → (grand gardien / minion prince)
├── hdv/            → Building_HV_Town_Hall_level_1.png ... level_16.png
├── ligues/         → (icônes de ligues)
├── ligue-icones/   → (icônes de ligues ranked)
├── capital/        → (capital du clan)
└── mdo/            → (base du constructeur)
```

---

## CHANGEMENT — Réécrire `frontend/src/utils/cocHelpers.js`

Remplace la constante `BASE` et les fonctions `getTroopImageUrl` et `getTownHallImageUrl` par ce qui suit :

```js
const SUPABASE_ASSETS = 'https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets'

// Mapping des catégories vers les dossiers Supabase
const CATEGORY_FOLDER = {
  'heroes':    'heros',
  'troops':    'troupes',
  'spells':    'sorts',
  'siege':     'engins',
  'equipment': 'equipements',
  'pets':      'familiers',
  'super':     'super-troupes',
  'gardien':   'gardien',
  // fallbacks directs
  'heros':       'heros',
  'troupes':     'troupes',
  'sorts':       'sorts',
  'engins':      'engins',
  'equipements': 'equipements',
  'familiers':   'familiers',
}

// Mapping des noms de troupes CoC API → nom de fichier Supabase
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
  // Si on a un mapping exact → on l'utilise
  if (TROOP_FILE_MAP[name]) {
    const folder = CATEGORY_FOLDER[category] || category
    return `${SUPABASE_ASSETS}/${folder}/${TROOP_FILE_MAP[name]}`
  }
  // Fallback : tentative avec le nom nettoyé
  const folder = CATEGORY_FOLDER[category] || category
  const clean = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '')
  return `${SUPABASE_ASSETS}/${folder}/Icon_HV_${clean}.png`
}

export function getTownHallImageUrl(level) {
  return `${SUPABASE_ASSETS}/hdv/Building_HV_Town_Hall_level_${level}.png`
}
```

Garde toutes les autres fonctions du fichier (`translateRole`, `getRoleColor`, `getRoleBadgeClass`) **exactement comme elles sont**.

---

## ⚠️ IMPORTANT

Les noms de fichiers dans Supabase ne correspondent pas toujours exactement aux noms retournés par l'API CoC. Le mapping `TROOP_FILE_MAP` gère les cas connus. Le fallback s'occupera des cas non listés — si une image ne charge pas, on ajoutera son mapping plus tard.

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "feat: images troupes via Supabase Storage"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
