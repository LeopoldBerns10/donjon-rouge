# 🏰 Prompt Claude Code — Donjon Rouge
## Remplacement emojis ligues → badges officiels Supabase

---

## CONTEXTE

Les images de ligues sont dans Supabase : `coc-assets/ligues/`
Noms des fichiers disponibles :
```
LB_big_skeleton.png   → Squelette / Bronze / bas
LB_big_barb.png       → Barbare
LB_big_archer.png     → Archer
LB_big_wizard.png     → Sorcier
LB_big_valyrie.png    → Valkyrie
LB_big_witch.png      → Sorcière
LB_big_golem.png      → Golem
LB_big_pekka.png      → P.E.K.K.A
LB_big_titan.png      → Titan
LB_big_dragon1.png    → Dragon (Champion III)
LB_big_dragon2.png    → Dragon (Champion II)
LB_big_dragon3.png    → Dragon (Champion I / Legend)
```

---

## FICHIER 1 — `frontend/src/utils/cocHelpers.js`

Ajoute à la fin du fichier cette fonction :

```js
const LEAGUE_ASSETS = 'https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets/ligues'

const LEAGUE_IMAGE_MAP = {
  // Noms exacts retournés par l'API CoC (league.name ou leagueTier.name)
  'Legend League':        `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'Champion League I':    `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'Champion League II':   `${LEAGUE_ASSETS}/LB_big_dragon2.png`,
  'Champion League III':  `${LEAGUE_ASSETS}/LB_big_dragon1.png`,
  'Titan League I':       `${LEAGUE_ASSETS}/LB_big_titan.png`,
  'Titan League II':      `${LEAGUE_ASSETS}/LB_big_titan.png`,
  'Titan League III':     `${LEAGUE_ASSETS}/LB_big_titan.png`,
  'Master League I':      `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'Master League II':     `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'Master League III':    `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'Crystal League I':     `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'Crystal League II':    `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'Crystal League III':   `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'Gold League I':        `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'Gold League II':       `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'Gold League III':      `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'Silver League I':      `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'Silver League II':     `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'Silver League III':    `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'Bronze League I':      `${LEAGUE_ASSETS}/LB_big_wizard.png`,
  'Bronze League II':     `${LEAGUE_ASSETS}/LB_big_wizard.png`,
  'Bronze League III':    `${LEAGUE_ASSETS}/LB_big_wizard.png`,
  'Warrior League I':     `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'Warrior League II':    `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'Warrior League III':   `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'Barbarian League I':   `${LEAGUE_ASSETS}/LB_big_barb.png`,
  'Barbarian League II':  `${LEAGUE_ASSETS}/LB_big_barb.png`,
  'Barbarian League III': `${LEAGUE_ASSETS}/LB_big_barb.png`,
  'Unranked':             `${LEAGUE_ASSETS}/LB_big_skeleton.png`,
}

export function getLeagueImageUrl(leagueName) {
  if (!leagueName) return null
  return LEAGUE_IMAGE_MAP[leagueName] || `${LEAGUE_ASSETS}/LB_big_skeleton.png`
}

export function getLeagueShortName(leagueName) {
  if (!leagueName) return ''
  return leagueName.replace(/ League$/i, '').replace(/ (I{1,3})$/, ' $1')
}
```

---

## FICHIER 2 — `frontend/src/pages/Guilde.jsx`

### Remplace le composant `LeagueBadge`

Ajoute l'import en haut du fichier :
```js
import { getLeagueImageUrl, getLeagueShortName } from '../utils/cocHelpers.js'
```

Remplace le composant `LeagueBadge` par :
```jsx
function LeagueBadge({ member }) {
  const name = getLeagueName(member)
  if (!name) return <span className="text-ash text-xs">—</span>
  const imgUrl = getLeagueImageUrl(name)
  const short = getLeagueShortName(name)
  return (
    <div className="flex items-center justify-center gap-1">
      {imgUrl && (
        <img
          src={imgUrl}
          alt={short}
          className="w-6 h-6 object-contain"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}
      <span className="text-xs text-ash hidden lg:inline">{short}</span>
    </div>
  )
}
```

Supprime les constantes `LEAGUE_EMOJIS` et la fonction `getLeagueEmoji` qui ne servent plus.

---

## FICHIER 3 — `frontend/src/pages/Tracker.jsx`

### Remplace le composant inline de ligue

Ajoute l'import en haut du fichier :
```js
import { getLeagueImageUrl, getLeagueShortName } from '../utils/cocHelpers.js'
```

Dans le tableau `members.map(...)`, remplace le bloc de la colonne Ligue :
```jsx
{leagueName ? (
  <div className="flex items-center justify-center gap-1">
    {leagueEmoji && <span>{leagueEmoji}</span>}
    <span className="text-xs text-ash hidden lg:inline">{leagueShort}</span>
  </div>
) : (
  <span className="text-ash text-xs">—</span>
)}
```

Par :
```jsx
{leagueName ? (
  <div className="flex items-center justify-center gap-1">
    <img
      src={getLeagueImageUrl(leagueName)}
      alt={leagueName}
      className="w-6 h-6 object-contain"
      onError={(e) => { e.target.style.display = 'none' }}
    />
    <span className="text-xs text-ash hidden lg:inline">
      {getLeagueShortName(leagueName)}
    </span>
  </div>
) : (
  <span className="text-ash text-xs">—</span>
)}
```

Supprime les constantes `LEAGUE_EMOJIS`, `getLeagueEmoji` et les variables `leagueEmoji`, `leagueShort` dans le map (remplacées par les fonctions importées).

---

## FICHIER 4 — `frontend/src/pages/PlayerProfile.jsx`

### Remplace l'affichage ligue dans le header

Ajoute `getLeagueImageUrl` dans l'import depuis `cocHelpers.js` :
```js
import { translateRole, getTroopImageUrl, getTownHallImageUrl, getLeagueImageUrl, getLeagueShortName } from '../utils/cocHelpers.js'
```

Dans le header du profil, remplace :
```jsx
{leagueInfo && (
  <span style={{ color: leagueInfo.color }} className="text-sm font-cinzel">
    {leagueInfo.icon} {league?.replace(' League', '')}
  </span>
)}
```

Par :
```jsx
{league && (
  <div className="flex items-center gap-1">
    <img
      src={getLeagueImageUrl(league)}
      alt={league}
      className="w-8 h-8 object-contain"
      onError={(e) => { e.target.style.display = 'none' }}
    />
    <span className="text-sm font-cinzel text-bone">
      {getLeagueShortName(league)}
    </span>
  </div>
)}
```

### Remplace aussi dans l'onglet Ranked

Dans la section "Ligue Ranked actuelle", remplace l'affichage du nom seul par :
```jsx
<div className="flex items-center gap-2 mb-1">
  <img
    src={getLeagueImageUrl(player.leagueTier?.name || player.league?.name)}
    alt=""
    className="w-10 h-10 object-contain"
    onError={(e) => { e.target.style.display = 'none' }}
  />
  <p className="font-bold text-bone font-cinzel text-xl">
    {player.leagueTier?.name || player.league?.name || '—'}
  </p>
</div>
```

### Remplace la progression des ligues 2025

Dans la section "Progression des ligues 2025", remplace l'affichage emoji `{l.icon}` par une image :
```jsx
<img
  src={getLeagueImageUrl(l.name + ' League')}
  alt={l.name}
  className="w-6 h-6 object-contain"
  onError={(e) => { e.target.style.display = 'none' }}
/>
```

---

## FICHIER 5 — `frontend/src/lib/constants.js`

Mets à jour `LEAGUE_INFO` pour retirer les icônes emoji (on garde juste les couleurs) :
```js
export const LEAGUE_INFO = {
  'Legend League':       { color: '#9333ea' },
  'Champion League I':   { color: '#ef4444' },
  'Champion League II':  { color: '#ef4444' },
  'Champion League III': { color: '#ef4444' },
  'Titan League I':      { color: '#6366f1' },
  'Titan League II':     { color: '#6366f1' },
  'Titan League III':    { color: '#6366f1' },
  'Master League I':     { color: '#f59e0b' },
  'Master League II':    { color: '#f59e0b' },
  'Master League III':   { color: '#f59e0b' },
}
```

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "feat: remplacement emojis ligues par badges officiels Supabase"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
