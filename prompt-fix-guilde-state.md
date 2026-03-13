# 🏰 Prompt Claude Code — Donjon Rouge
## Fix : Guilde lit le state openTab depuis la navigation

---

## FICHIER — `frontend/src/pages/Guilde.jsx`

### Ajoute l'import useLocation

En haut du fichier, dans l'import react-router-dom, ajoute `useLocation` :

```js
import { useNavigate, useLocation } from 'react-router-dom'
```

### Ajoute la lecture du state dans le composant Guilde()

Au début de la fonction `Guilde()`, après les autres hooks, ajoute :

```js
const location = useLocation()

useEffect(() => {
  if (location.state?.openTab) {
    setTab(location.state.openTab)
  }
}, [location.state])
```

---

## DÉPLOIEMENT

```bash
git add .
git commit -m "fix: Guilde ouvre le bon onglet depuis navigation state"
git push origin main
```

---

*Donjon Rouge — Clan #29292QPRC*
