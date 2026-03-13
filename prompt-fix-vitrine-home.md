# 🏰 Prompt Claude Code — Donjon Rouge
## Fix liens créateurs + bouton GDC/LDC + StatCards accueil

---

## FICHIER 1 — `frontend/src/pages/Vitrine.jsx`

Dans le tableau `CREATEURS`, corrige les deux URLs :

Remplace :
```js
url: 'https://www.youtube.com/@Skarex',
```
Par :
```js
url: 'https://www.youtube.com/channel/UC0QsbIdsn75NES7JrNqQ7vw',
```

Remplace :
```js
url: 'https://www.youtube.com/@lawoke27',
```
Par :
```js
url: 'https://www.youtube.com/@Lawoke',
```

---

## FICHIER 2 — `frontend/src/pages/Home.jsx`

### Ajoute le bouton Inscriptions GDC/LDC

Dans le bloc `{/* CTA Buttons */}`, ajoute ce bouton après le bouton Forum :

```jsx
<Link
  to="/guilde"
  state={{ openTab: 'gdcldc' }}
  className="px-6 py-3 font-cinzel uppercase tracking-wider font-bold text-bone rounded border border-gold/50 hover:border-gold transition-all hover:scale-105"
  style={{ background: 'rgba(180,130,0,0.15)' }}
>
  ⚔️ Inscriptions GDC/LDC
</Link>
```

### Remplace les 2 premières StatCards

Remplace :
```jsx
<StatCard icon="👥" label="Membres" value={clan.members} sub={`/ ${clan.memberCount || 50}`} />
<StatCard icon="🏆" label="Trophées record" value={clan.clanPoints?.toLocaleString() || '—'} />
```

Par :
```jsx
<StatCard icon="📍" label="Localisation" value="France" />
<StatCard icon="💎" label="Ligue clan" value="Crystal II" />
```

---

## FICHIER 3 — `frontend/src/pages/Guilde.jsx`

Pour que le bouton de l'accueil ouvre directement l'onglet GDC/LDC, ajoute la gestion du `state` dans le composant `Guilde` :

Ajoute l'import :
```js
import { useLocation } from 'react-router-dom'
```

Dans le composant `Guilde()`, ajoute au début :
```js
const location = useLocation()

useEffect(() => {
  if (location.state?.openTab === 'gdcldc') {
    setTab('gdcldc')
  }
}, [location.state])
```

---

## DÉPLOIEMENT

```bash
git add .
git commit -m "fix: liens créateurs + bouton GDC/LDC accueil + stats localisation/ligue"
git push origin main
```

---

*Donjon Rouge — Clan #29292QPRC*
