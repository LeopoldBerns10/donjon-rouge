# 🏰 Prompt Claude Code — Donjon Rouge
## Correction finale mapping images + réorganisation troupes

---

## FICHIER 1 — `frontend/src/utils/cocHelpers.js`

### Corrections dans `TROOP_FILE_MAP`

Mets à jour ou ajoute ces entrées :

```js
// Héros MDO
'Battle Machine':     'Icon_BB_Hero_Battle_Machine.png',
'Battle Copter':      'Icon_BB_Hero_Battle_Copter.png',

// Troupes corrigées
'P.E.K.K.A':          'Icon_HV_P.E.K.K.A.png',
'Baby Dragon':        'Icon_BB_Baby_Dragon.png',
'Thrower':            'Thrower_05_grass.png',
'Meteor Golem':       'MeteoriteGolem_withGrassbase_f61_layered_3k .png',

// Sorts corrigés
'Lightning Spell':    'Icon_HV_Spell_Lightning_new.png',
'Ice Block Spell':    'Icon_HV_Dark_Spell_Ice_block.png',
'Totem Spell':        'Icon_HV_Spell_totem.png',

// Familiers corrigés
'Greedy Raven':       'pet_Greedy_Raven_2_grass.png',
```

### Correction du dossier pour les héros MDO dans `CATEGORY_FOLDER`

Les héros Battle Machine et Battle Copter sont dans le dossier `heros` sur Supabase. Rien à changer ici — ils utilisent déjà `category="heroes"` → dossier `heros`. ✅

---

## FICHIER 2 — `frontend/src/pages/PlayerProfile.jsx`

### Problème 1 — Supprimer Troop Launcher des troupes

Troop Launcher est une machine de siège, pas une troupe. Ajoute `'Troop Launcher'` dans la liste `SIEGE_NAMES` :

```js
const SIEGE_NAMES = [
  'Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks',
  'Log Launcher', 'Flame Flinger', 'Battle Drill', 'Troop Launcher'
]
```

Et ajoute le mapping dans `cocHelpers.js` :
```js
'Troop Launcher': 'Troop_Launcher_NoGrass_Shadow.png',
```

### Problème 2 — Greedy Raven est un familier, pas une troupe

Ajoute `'Greedy Raven'` dans la liste `PET_NAMES` :

```js
const PET_NAMES = [
  'L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Phoenix',
  'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly',
  'Sneezy', 'Greedy Raven'
]
```

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: correction finale images troupes, sorts, héros MDO, Greedy Raven familier"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
