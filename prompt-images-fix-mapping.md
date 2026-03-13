# 🏰 Prompt Claude Code — Donjon Rouge
## Correction mapping images manquantes dans `cocHelpers.js`

---

## CONTEXTE

Complète le `TROOP_FILE_MAP` dans `frontend/src/utils/cocHelpers.js` avec les mappings manquants ci-dessous. **Ne touche à rien d'autre dans le fichier.**

---

## MAPPINGS À AJOUTER dans `TROOP_FILE_MAP`

### Héros manquants
```js
'Royal Champion':   'Icon_HV_Hero_Royal_Champion.png',   // dossier heros
'Battle Machine':   'Icon_HV_Hero_Battle_Machine.png',   // dossier heros
'Battle Copter':    'Icon_HV_Hero_Battle_Copter.png',    // dossier heros
'Minion Prince':    'Hero_Minion_Prince_04_noShadow.png', // dossier heros
```

### Familiers (pets) — dossier `familiers`
```js
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
```

### Équipements héros — dossier `equipements`
```js
// Archer Queen (AQ)
'Archer Puppet':        'Hero_Equipment_AQ_Archer_Puppet.png',
'Frozen Arrow':         'Hero_Equipment_AQ_Frozen_Arrow.png',
'Giant Arrow':          'Hero_Equipment_AQ_Giant_Arrow.png',
'Healer Puppet':        'Hero_Equipment_AQ_Healer_Puppet.png',
'Invisibility Vial':    'Hero_Equipment_AQ_Invisibility_Vial.png',
'Magic Mirror':         'Hero_Equipment_AQ_Magic_Mirror.png',
'Action Figure':        'Hero_Equipment_AQ_WWEActionFigure.png',
// Barbarian King (BK)
'Barbarian Puppet':     'Hero_Equipment_BK_Barbarian_Puppet.png',
'Earthquake Boots':     'Hero_Equipment_BK_Earthquake_Boots.png',
'Rage Vial':            'Hero_Equipment_BK_Rage_Vial.png',
'Snake Bracelet':       'Hero_Equipment_BK_SnakeBracelet.png',
'Spiky Ball':           'Hero_Equipment_BK_Spiky_Ball.png',
'Vampstache':           'Hero_Equipment_BK_Vampstache.png',
// Royal Champion (RC)
'Giant Gauntlet':       'Hero_Equipment_RQ_Giant_Gauntlet.png',
'Electro Boots':        'Hero_Equipment_RC_ElectroBoots.png',
'Frost Flake':          'Hero_Equipment_rc_frost_flake.png',
'Haste Vial':           'Hero_Equipment_RC_Haste_Vial.png',
'Hog Rider Doll':       'Hero_Equipment_RC_Hog_Rider_Doll.png',
'Royal Gem':            'Hero_Equipment_RC_Royal_Gem.png',
'Seeking Shield':       'Hero_Equipment_RC_Seeking_Shield.png',
// Grand Warden (GW)
'Eternal Tome':         'Hero_Equipment_GW_Eternal_Tome.png',
'Fireball':             'Hero_Equipment_GW_Fireball.png',
'Healing Tome':         'Hero_Equipment_GW_Healing_Tome.png',
'Life Gem':             'Hero_Equipment_GW_Life_Gem.png',
'Rage Gem':             'Hero_Equipment_GW_Rage_Gem.png',
'Lavaloon Puppet':      'icon_gear_GW_LavaloonPuppet.png',
'Olympic Torch':        'HeroGear_GW_Olympic_Torch_lh0000.png',
'Dark Crown':           'HeroGear_MP_DarkCrown_2k.png',
'Fireside Gauntlet':    'HeroGear_BK_SlickFireHorse.png',
'Rocket Spear':         'HeroGear_RoyalChampion_RocketSpear_Equipment_03.png',
// Minion Prince (MP)
'Dark Orb':             'Hero_Equipment_MP_DarkOrb.png',
'Henchmen Puppet':      'Hero_Equipment_MP_Henchman.png',
'Power Pump':           'Hero_Equipment_MP_PowerPump.png',
'Iron Pants':           'HeroEquipment_MP_IronPants.png',
'Flame Breath':         'HG_DD_FlameBreath_Marketing.png',
'Flame Heart':          'HG_DD_FlameHeart_Marketing.png',
'Stun Blast':           'HG_DD_StunBlast_Marketing.png',
```

### Super Troupes — dossier `super-troupes`
```js
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
```

---

## CORRECTION de `getTroopImageUrl`

La fonction doit chercher dans le bon dossier selon la catégorie. Pour les équipements, le dossier est `equipements`. Voici la version corrigée :

```js
export function getTroopImageUrl(name, category = 'troops') {
  const folder = CATEGORY_FOLDER[category] || category

  if (TROOP_FILE_MAP[name]) {
    return `${SUPABASE_ASSETS}/${folder}/${TROOP_FILE_MAP[name]}`
  }

  // Fallback : tentative avec le nom nettoyé
  const clean = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.]/g, '')
  return `${SUPABASE_ASSETS}/${folder}/Icon_HV_${clean}.png`
}
```

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: complétion mapping images équipements, familiers, super-troupes"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
