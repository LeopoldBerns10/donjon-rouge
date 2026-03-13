# 🏰 Prompt Claude Code — Donjon Rouge
## Fix ligues + affichage HDV uniforme dans Tracker

---

## FICHIER 1 — `frontend/src/utils/cocHelpers.js`

### Correction du mapping des ligues

Remplace entièrement `LEAGUE_KEY_IMAGE` par :

```js
const LEAGUE_KEY_IMAGE = {
  // Légende
  'légende':    `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'legend':     `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'ligue':      `${LEAGUE_ASSETS}/LB_big_dragon3.png`,

  // Champion / Electro Dragon (niveaux 31-33)
  'champion':   `${LEAGUE_ASSETS}/LB_big_dragon2.png`,
  'electro':    `${LEAGUE_ASSETS}/LB_big_dragon2.png`,

  // Dragon (niveaux 28-30)
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

  // Sorcière / Or (niveaux 16-18) — LB_big_witch
  'sorcière':   `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'or':         `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'gold':       `${LEAGUE_ASSETS}/LB_big_witch.png`,

  // Sorcier / Bronze (niveaux 10-12) — LB_big_wizard
  'sorcier':    `${LEAGUE_ASSETS}/LB_big_wizard.png`,
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
```

Et mets à jour `getLeagueImageUrl` pour gérer `null` sur Unranked :

```js
export function getLeagueImageUrl(leagueName) {
  if (!leagueName) return null
  const key = leagueName.toLowerCase().split(' ')[0]
  // Retourne null si clé inconnue ou unranked
  if (!(key in LEAGUE_KEY_IMAGE)) return null
  return LEAGUE_KEY_IMAGE[key]
}
```

---

## FICHIER 2 — `frontend/src/pages/Tracker.jsx`

### Afficher l'image HDV à côté du pseudo (comme dans Guilde)

Ajoute l'import de `getTownHallImageUrl` s'il n'est pas déjà présent :
```js
import { translateRole, getRoleBadgeClass, getTownHallImageUrl } from '../utils/cocHelpers.js'
```

Dans le tableau, la colonne **Joueur** affiche actuellement le nom + tag.
Remplace ce bloc :
```jsx
<td className="py-3 px-3">
  <div className="flex items-center gap-2">
    <img
      src={getTownHallImageUrl(member.townHallLevel)}
      ...
    />
    <div>
      <div className="font-semibold text-bone ...">
        {member.name}
      </div>
      <div className="text-xs text-ash">{member.tag}</div>
    </div>
  </div>
</td>
```

Par (image HDV intégrée directement dans la cellule joueur, badge HDV en overlay) :
```jsx
<td className="py-3 px-3">
  <div className="flex items-center gap-2">
    <div className="relative flex-shrink-0">
      <img
        src={getTownHallImageUrl(member.townHallLevel)}
        alt={`HDV${member.townHallLevel}`}
        className="w-10 h-10 object-contain"
        onError={(e) => { e.target.style.display = 'none' }}
      />
      <span
        className="absolute -bottom-1 -right-1 text-xs font-bold text-white px-1 rounded"
        style={{ background: '#C41E3A', fontSize: '9px' }}
      >
        {member.townHallLevel}
      </span>
    </div>
    <div>
      <div className="font-semibold text-bone group-hover:text-gold-light transition-colors">
        {member.name}
      </div>
      <div className="text-xs text-ash">{member.tag}</div>
    </div>
  </div>
</td>
```

### Supprime la colonne HDV séparée

Dans le `<thead>`, supprime :
```jsx
<th className="py-3 px-3 text-center">HDV</th>
```

Dans le `<tbody>`, supprime la cellule :
```jsx
<td className="py-3 px-3 text-center">
  <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: '#C41E3A' }}>
    HDV{member.townHallLevel}
  </span>
</td>
```

### Mise à jour du badge ligue — ne rien afficher si null

```jsx
{leagueName && getLeagueImageUrl(leagueName) ? (
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

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: ligues witch/wizard/unranked + HDV image inline dans Tracker"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
