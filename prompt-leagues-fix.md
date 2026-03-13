# 🏰 Prompt Claude Code — Donjon Rouge
## Correction badges ligues — mapping par clé (premier mot)

---

## CONTEXTE

L'API CoC retourne les noms de ligues en français.
La fonction `leagueKey(name)` prend le **premier mot en minuscules** :
- `"Ligue Légende"` → `"ligue"`
- `"Electro Dragon League I"` → `"electro"`
- `"Titan League I"` → `"titan"`
- etc.

On mappe directement ces clés vers les fichiers Supabase — pas besoin du nom exact complet.

---

## FICHIER 1 — `frontend/src/utils/cocHelpers.js`

Remplace la fonction `getLeagueImageUrl` par cette version basée sur `leagueKey` :

```js
const LEAGUE_ASSETS = 'https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets/ligues'

// Mapping par premier mot en minuscules (leagueKey)
const LEAGUE_KEY_IMAGE = {
  // Noms français (API CoC compte FR)
  'légende':    `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'legend':     `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'champion':   `${LEAGUE_ASSETS}/LB_big_dragon2.png`,
  'titan':      `${LEAGUE_ASSETS}/LB_big_titan.png`,
  'maître':     `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'master':     `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'cristal':    `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'crystal':    `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'or':         `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'gold':       `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'argent':     `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'silver':     `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'bronze':     `${LEAGUE_ASSETS}/LB_big_wizard.png`,
  'guerrier':   `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'warrior':    `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'barbare':    `${LEAGUE_ASSETS}/LB_big_barb.png`,
  'barbarian':  `${LEAGUE_ASSETS}/LB_big_barb.png`,
  'electro':    `${LEAGUE_ASSETS}/LB_big_dragon3.png`,
  'p.e.k.k.a':  `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'golem':      `${LEAGUE_ASSETS}/LB_big_golem.png`,
  'sorcière':   `${LEAGUE_ASSETS}/LB_big_witch.png`,
  'valkyrie':   `${LEAGUE_ASSETS}/LB_big_valyrie.png`,
  'sorcier':    `${LEAGUE_ASSETS}/LB_big_wizard.png`,
  'archer':     `${LEAGUE_ASSETS}/LB_big_archer.png`,
  'squelette':  `${LEAGUE_ASSETS}/LB_big_skeleton.png`,
  'skeleton':   `${LEAGUE_ASSETS}/LB_big_skeleton.png`,
  'géant':      `${LEAGUE_ASSETS}/LB_big_pekka.png`,
  'ligue':      `${LEAGUE_ASSETS}/LB_big_dragon3.png`,  // "Ligue Légende"
}

export function getLeagueImageUrl(leagueName) {
  if (!leagueName) return null
  const key = leagueName.toLowerCase().split(' ')[0]
  return LEAGUE_KEY_IMAGE[key] || `${LEAGUE_ASSETS}/LB_big_skeleton.png`
}

export function getLeagueShortName(leagueName) {
  if (!leagueName) return ''
  return leagueName.replace(/ League$/i, '').replace(/Ligue /i, '')
}
```

---

## FICHIERS 2, 3, 4, 5 — Guilde, Tracker, PlayerProfile, constants

**Aucun changement** — les fonctions `getLeagueImageUrl` et `getLeagueShortName` sont déjà importées depuis le prompt précédent. Seul `cocHelpers.js` est à modifier.

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: correction mapping ligues par clé française/anglaise"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
