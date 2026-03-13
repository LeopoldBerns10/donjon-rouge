# 🏰 Prompt Claude Code — Donjon Rouge
## Correction catégories troupes dans `PlayerProfile.jsx`

---

## CONTEXTE

Dans l'onglet Troupes du profil joueur, on veut exactement 3 sections de troupes :

1. **Troupes** — troupes normales (élixir ordinaire), village principal
2. **Troupes noires** — troupes élixir noir, village principal
3. **Super Troupes** — versions super des troupes

La MDO (Builder Base) ne doit **pas apparaître** dans les troupes. Seuls Battle Machine et Battle Copter restent dans la section **Héros**.

---

## CHANGEMENT — `frontend/src/pages/PlayerProfile.jsx`

### Étape 1 — Remplace les filtres de troupes

Remplace les lignes actuelles :
```js
const homeTroops = player.troops?.filter((t) => t.village === 'home' && !['Wall Wrecker'...].includes(t.name) && !['L.A.S.S.I'...].includes(t.name)) || []
const darkTroops = player.troops?.filter((t) => t.village === 'builderBase') || []
const superTroops = player.troops?.filter((t) => t.superTroopIsActive !== undefined) || []
```

Par :
```js
// Noms des troupes élixir noir (village principal)
const DARK_TROOP_NAMES = [
  'Minion', 'Hog Rider', 'Valkyrie', 'Golem', 'Witch',
  'Lava Hound', 'Bowler', 'Ice Golem', 'Headhunter',
  'Apprentice Warden', 'Druid', 'Furnace'
]

// Noms des super troupes
const SUPER_TROOP_NAMES = [
  'Super Barbarian', 'Super Archer', 'Super Giant', 'Sneaky Goblin',
  'Super Wall Breaker', 'Rocket Balloon', 'Super Wizard', 'Super Dragon',
  'Inferno Dragon', 'Super Minion', 'Super Valkyrie', 'Super Witch',
  'Ice Hound', 'Super Bowler', 'Super Miner', 'Super Hog Rider', 'Super Yeti'
]

// Noms des machines de siège (inchangé)
const SIEGE_NAMES = ['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill']

// Noms des familiers (inchangé)
const PET_NAMES = ['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Phoenix', 'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly', 'Sneezy']

const pets = player.troops?.filter((t) => PET_NAMES.includes(t.name)) || []
const siegeMachines = player.troops?.filter((t) => SIEGE_NAMES.includes(t.name)) || []
const superTroops = player.troops?.filter((t) => SUPER_TROOP_NAMES.includes(t.name)) || []
const darkTroops = player.troops?.filter((t) =>
  t.village === 'home' &&
  DARK_TROOP_NAMES.includes(t.name)
) || []
const homeTroops = player.troops?.filter((t) =>
  t.village === 'home' &&
  !SIEGE_NAMES.includes(t.name) &&
  !PET_NAMES.includes(t.name) &&
  !DARK_TROOP_NAMES.includes(t.name) &&
  !SUPER_TROOP_NAMES.includes(t.name)
) || []
```

### Étape 2 — Remplace l'affichage des troupes dans le JSX

Remplace les lignes actuelles :
```jsx
<TroopsGrid title="Troupes" items={homeTroops.filter(...)} category="troops" />
<TroopsGrid title="Troupes noires" items={darkTroops} category="troops" />
<TroopsGrid title="Sorts" items={spells} category="spells" />
{superTroops.length > 0 && (
  <TroopsGrid title="Super Troupes" items={superTroops} category="troops" />
)}
```

Par :
```jsx
<TroopsGrid title="Troupes" items={homeTroops} category="troops" />
<TroopsGrid title="Troupes noires" items={darkTroops} category="troops" />
<TroopsGrid title="Sorts" items={spells} category="sorts" />
<TroopsGrid title="Super Troupes" items={superTroops} category="super" />
```

### Étape 3 — Héros : garder Battle Machine et Battle Copter

La ligne actuelle des héros :
```js
const heroes = player.heroes || []
```
C'est correct — l'API CoC retourne Battle Machine et Battle Copter dans `player.heroes` automatiquement, ils apparaîtront donc dans la section Héros sans rien changer.

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: correction catégories troupes - élixir noir, super troupes, suppression MDO"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
