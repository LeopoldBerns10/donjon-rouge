# 🏰 Prompt Claude Code — Donjon Rouge
## Fix : cartes créateurs — initiales à la place des drapeaux

---

## FICHIER — `frontend/src/pages/Vitrine.jsx`

Dans le tableau `CREATEURS`, remplace le champ `flag` par `initials` et `color` :

```js
const CREATEURS = [
  {
    name: 'Skarex',
    desc: 'Commentateur eSport CoC FR, stratégies d\'attaque HDV17, mode classé et meta ligue légende. Code créateur : SKAREX',
    url: 'https://www.youtube.com/channel/UC0QsbIdsn75NES7JrNqQ7vw',
    platform: 'YouTube',
    initials: 'SK',
    color: '#C41E3A',
    bg: 'rgba(196,30,58,0.15)',
  },
  {
    name: 'Elchiki - Clash Of Clans',
    desc: 'Gameplay CoC depuis 2014, challenges, astuces et événements communautaires. 330K abonnés, créateur officiel Supercell. Code : ELCHIKI',
    url: 'https://www.youtube.com/@elchikicoc',
    platform: 'YouTube',
    initials: 'EL',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.15)',
  },
  {
    name: 'Lawoke27',
    desc: 'Créateur officiel Clash of Clans, stratégies d\'attaque, super troupes et guides pour tous les HDV. Code : LAWOKE27',
    url: 'https://www.youtube.com/@Lawoke',
    platform: 'YouTube',
    initials: 'LA',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.15)',
  },
]
```

Dans le JSX des cartes créateurs, remplace la bulle avec les drapeaux :

```jsx
<div
  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 border border-crimson/30"
  style={{ background: 'linear-gradient(135deg, #1a0000, #3a0000)' }}
>
  {v.flag}
</div>
```

Par :

```jsx
<div
  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-cinzel font-bold text-sm border"
  style={{ background: v.bg, color: v.color, borderColor: v.color + '60' }}
>
  {v.initials}
</div>
```

---

## DÉPLOIEMENT

```bash
git add .
git commit -m "fix: initiales colorées à la place des drapeaux dans cartes créateurs"
git push origin main
```

---

*Donjon Rouge — Clan #29292QPRC*
