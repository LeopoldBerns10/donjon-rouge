# 🏰 Prompt Claude Code — Donjon Rouge
## Fix ligues Witch/Wizard + badge HDV dans Tracker

---

## FICHIER 1 — `frontend/src/utils/cocHelpers.js`

Dans `LEAGUE_KEY_IMAGE`, ajoute ces deux entrées manquantes :

```js
'witch':      `${LEAGUE_ASSETS}/LB_big_witch.png`,
'wizard':     `${LEAGUE_ASSETS}/LB_big_wizard.png`,
```

---

## FICHIER 2 — `frontend/src/pages/Tracker.jsx`

### Ajouter le badge numéro HDV par dessus l'image

Dans la colonne Joueur, remplace le bloc image HDV actuel :

```jsx
<img
  src={getTownHallImageUrl(member.townHallLevel)}
  alt={`HDV${member.townHallLevel}`}
  className="w-8 h-8 object-contain flex-shrink-0"
  onError={(e) => { e.target.style.display = 'none' }}
/>
```

Par :

```jsx
<div className="relative flex-shrink-0 w-8 h-8">
  <img
    src={getTownHallImageUrl(member.townHallLevel)}
    alt={`HDV${member.townHallLevel}`}
    className="w-8 h-8 object-contain"
    onError={(e) => { e.target.style.display = 'none' }}
  />
  <span
    className="absolute -bottom-1 -right-1 font-bold text-white rounded"
    style={{ background: '#C41E3A', fontSize: '9px', padding: '0 2px' }}
  >
    {member.townHallLevel}
  </span>
</div>
```

### Supprimer la colonne HDV séparée

Dans le `<thead>`, supprime :
```jsx
<th className="py-3 px-3 text-center">HDV</th>
```

Dans le `<tbody>`, supprime la cellule :
```jsx
<td className="py-3 px-3 text-center">
  <span className="px-2 py-0.5 rounded text-xs font-bold text-white"
    style={{ background: '#C41E3A' }}>
    HDV{member.townHallLevel}
  </span>
</td>
```

---

## DÉPLOIEMENT — Push GitHub

```bash
git add .
git commit -m "fix: ligues witch/wizard + badge HDV inline dans Tracker"
git push origin master
```

---

*Donjon Rouge — Clan #29292QPRC*
