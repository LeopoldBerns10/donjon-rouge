# 🏰 Prompt Claude Code — Donjon Rouge
## Correction noms exacts API CoC dans `TROOP_FILE_MAP`

---

## FICHIER — `frontend/src/utils/cocHelpers.js`

Les noms ci-dessous sont les noms **exacts** retournés par l'API CoC (vérifiés au survol dans le navigateur). Mets à jour ou ajoute ces entrées dans `TROOP_FILE_MAP` :

```js
// Héros
'Dragon Duke':        'dd_iconTall_Alt.png',

// Équipements — noms exacts API CoC
'Giant Gauntlet':     'Hero_Equipment_BQ_Giant_Gauntlet.png',
'Heroic Torch':       'HeroGear_GW_Olympic_Torch_hh0000.png',
'Meteor Staff':       'HeroGear_MP_MeteoriteSceptre.png',
'Stick Horse':        'HeroGear_BK_StickFireHorse.png',
'Hog Rider Puppet':   'Hero_Equipment_RC_Hog_Rider_Doll.png',
'Metal Pants':        'HeroEquipment_MP_IronPants.png',
'Noble Iron':         'Hero_Equipment_MP_PowerPump.png',
'Fire Heart':         'HG_DD_FlameHeart_Marketing.png',
'Stun Blaster':       'HG_DD_StunBlast_Marketing.png',
'Flame Blower':       'HG_DD_FlameBreath_Marketing.png',

// Familiers
'Greedy Raven':       'pet_Greedy_Raven_2_grass.png',
```

⚠️ Si des entrées avec les anciens noms incorrects existent déjà (`'Battle Duke'`, `'Olympic Torch'`, `'Fireside Gauntlet'`, `'Iron Pants'`, `'Flame Heart'`...), **supprime-les** pour éviter les doublons.

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: noms exacts API CoC pour équipements héros et Dragon Duke"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
